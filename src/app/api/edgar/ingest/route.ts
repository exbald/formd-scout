import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

// Allow up to 5 minutes for large backfill ingestions (requires Vercel Pro+)
export const maxDuration = 300;
import { db } from "@/lib/db";
import { formDFilings } from "@/lib/schema";
import {
  fetchRecentFormDFilings,
  fetchFilingIndex,
  fetchFormDXml,
  buildFormDXmlUrl,
  buildFilingUrl,
} from "@/lib/edgar/fetcher";
import { parseFormDXml, validateParsedFiling } from "@/lib/edgar/parser";
import { extractFilingInfo } from "@/lib/edgar/types";

/**
 * POST /api/edgar/ingest
 *
 * Fetches Form D filings from SEC EDGAR EFTS endpoint, parses XML,
 * and inserts into PostgreSQL.
 *
 * Protected by x-api-key header check against INGEST_API_KEY env var.
 *
 * Request body:
 *   - startDate?: string (YYYY-MM-DD, defaults to today)
 *   - endDate?: string (YYYY-MM-DD, defaults to today)
 *
 * Response:
 *   - ingested: number of filings successfully inserted
 *   - skipped: number of filings skipped (duplicates)
 *   - errors: number of filings that failed to process
 *   - details: array of per-filing results with accessionNumber, status, error?
 */
export async function POST(req: NextRequest) {
  // Verify API key
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = process.env.INGEST_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Parse date range - default to today if not provided
    const today = new Date();

    let startDate: Date;
    let endDate: Date;

    if (body.startDate) {
      startDate = new Date(body.startDate);
    } else {
      startDate = today;
    }

    if (body.endDate) {
      endDate = new Date(body.endDate);
    } else {
      endDate = today;
    }

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    // Fetch filings from SEC EDGAR EFTS endpoint
    const hits = await fetchRecentFormDFilings(startDate, endDate);

    let ingested = 0;
    let skipped = 0;
    let errors = 0;
    const details: Array<{
      accessionNumber: string;
      status: string;
      error?: string;
    }> = [];

    // Process each filing
    for (const hit of hits) {
      // Extract basic info from EFTS hit
      const info = extractFilingInfo(hit);

      if (!info.accessionNumber || !info.cik) {
        errors++;
        details.push({
          accessionNumber: info.accessionNumber || "unknown",
          status: "error",
          error: "Missing accessionNumber or CIK in EFTS hit",
        });
        continue;
      }

      try {
        // Fetch filing index to find primary XML document
        const indexResult = await fetchFilingIndex(info.cik, info.accessionNumber);

        if (!indexResult.primaryDocument) {
          errors++;
          details.push({
            accessionNumber: info.accessionNumber,
            status: "error",
            error: "Could not find primary XML document in filing index",
          });
          continue;
        }

        // Build URLs
        const xmlUrl = buildFormDXmlUrl(
          info.cik,
          info.accessionNumber,
          indexResult.primaryDocument
        );
        const filingUrl = buildFilingUrl(info.cik, info.accessionNumber);

        // Fetch and parse the Form D XML
        const xmlString = await fetchFormDXml(xmlUrl);
        const parsed = parseFormDXml(xmlString, info.accessionNumber, info.cik);

        if (!validateParsedFiling(parsed)) {
          errors++;
          details.push({
            accessionNumber: info.accessionNumber,
            status: "error",
            error: "Failed to parse Form D XML or missing required fields",
          });
          continue;
        }

        // Insert into database — empty returning() means conflict (duplicate)
        const result = await db
          .insert(formDFilings)
          .values({
            cik: parsed.cik,
            accessionNumber: parsed.accessionNumber,
            companyName: parsed.companyName,
            entityType: parsed.entityType,
            stateOfInc: parsed.stateOfInc,
            sicCode: parsed.sicCode,
            filingDate: parsed.filingDate,
            isAmendment: parsed.isAmendment,
            totalOffering: parsed.totalOffering?.toString() ?? null,
            amountSold: parsed.amountSold?.toString() ?? null,
            amountRemaining: parsed.amountRemaining?.toString() ?? null,
            numInvestors: parsed.numInvestors,
            minInvestment: parsed.minInvestment?.toString() ?? null,
            revenueRange: parsed.revenueRange,
            industryGroup: parsed.industryGroup,
            issuerStreet: parsed.issuerStreet,
            issuerCity: parsed.issuerCity,
            issuerState: parsed.issuerState,
            issuerZip: parsed.issuerZip,
            issuerPhone: parsed.issuerPhone,
            filingUrl: filingUrl,
            xmlUrl: xmlUrl,
            firstSaleDate: parsed.firstSaleDate,
            yetToOccur: parsed.yetToOccur,
            moreThanOneYear: parsed.moreThanOneYear,
            federalExemptions: parsed.federalExemptions,
          })
          .onConflictDoNothing({ target: formDFilings.accessionNumber })
          .returning({ id: formDFilings.id });

        if (result.length === 0) {
          // Conflict — backfill industryGroup if parser found one and existing is null
          if (parsed.industryGroup) {
            await db
              .update(formDFilings)
              .set({ industryGroup: parsed.industryGroup })
              .where(
                and(
                  eq(formDFilings.accessionNumber, parsed.accessionNumber),
                  isNull(formDFilings.industryGroup)
                )
              );
          }
          skipped++;
          details.push({
            accessionNumber: parsed.accessionNumber,
            status: "skipped",
            error: "Duplicate accession number",
          });
        } else {
          ingested++;
          details.push({
            accessionNumber: parsed.accessionNumber,
            status: "ingested",
          });
        }
      } catch (processingError) {
        const errMsg =
          processingError instanceof Error
            ? processingError.message
            : String(processingError);
        errors++;
        details.push({
          accessionNumber: info.accessionNumber,
          status: "error",
          error: errMsg,
        });
      }
    }

    return NextResponse.json({
      ingested,
      skipped,
      errors,
      details,
    });
  } catch (error) {
    console.error("Ingestion error:", error);
    const errMsg =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to process ingestion request", details: errMsg },
      { status: 500 }
    );
  }
}
