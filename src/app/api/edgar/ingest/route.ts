import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formDFilings } from "@/lib/schema";

/**
 * POST /api/edgar/ingest
 *
 * Ingests Form D filing data into the database.
 * Protected by x-api-key header check against INGEST_API_KEY env var.
 *
 * Accepts a JSON body with:
 *   - filings: array of filing objects to insert
 *   - OR single filing fields at top level for convenience
 */
export async function POST(req: NextRequest) {
  // Verify API key
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = process.env.INGEST_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Support both single filing and batch
    const filingsToInsert = Array.isArray(body.filings)
      ? body.filings
      : [body];

    let ingested = 0;
    let skipped = 0;
    let errors = 0;
    const details: Array<{
      accessionNumber: string;
      status: string;
      error?: string;
    }> = [];

    for (const filing of filingsToInsert) {
      if (!filing.accessionNumber || !filing.companyName || !filing.cik) {
        errors++;
        details.push({
          accessionNumber: filing.accessionNumber || "unknown",
          status: "error",
          error: "Missing required fields: accessionNumber, companyName, cik",
        });
        continue;
      }

      try {
        await db
          .insert(formDFilings)
          .values({
            cik: filing.cik,
            accessionNumber: filing.accessionNumber,
            companyName: filing.companyName,
            entityType: filing.entityType ?? null,
            stateOfInc: filing.stateOfInc ?? null,
            sicCode: filing.sicCode ?? null,
            filingDate: filing.filingDate || new Date().toISOString().split("T")[0],
            isAmendment: filing.isAmendment ?? false,
            totalOffering: filing.totalOffering ?? null,
            amountSold: filing.amountSold ?? null,
            amountRemaining: filing.amountRemaining ?? null,
            numInvestors: filing.numInvestors ?? null,
            minInvestment: filing.minInvestment ?? null,
            revenueRange: filing.revenueRange ?? null,
            industryGroup: filing.industryGroup ?? null,
            issuerStreet: filing.issuerStreet ?? null,
            issuerCity: filing.issuerCity ?? null,
            issuerState: filing.issuerState ?? null,
            issuerZip: filing.issuerZip ?? null,
            issuerPhone: filing.issuerPhone ?? null,
            filingUrl: filing.filingUrl ?? null,
            xmlUrl: filing.xmlUrl ?? null,
            firstSaleDate: filing.firstSaleDate ?? null,
            yetToOccur: filing.yetToOccur ?? null,
            moreThanOneYear: filing.moreThanOneYear ?? null,
            federalExemptions: filing.federalExemptions ?? null,
          })
          .onConflictDoNothing({ target: formDFilings.accessionNumber });

        ingested++;
        details.push({
          accessionNumber: filing.accessionNumber,
          status: "ingested",
        });
      } catch (insertError) {
        const errMsg =
          insertError instanceof Error
            ? insertError.message
            : String(insertError);

        if (errMsg.includes("unique") || errMsg.includes("duplicate")) {
          skipped++;
          details.push({
            accessionNumber: filing.accessionNumber,
            status: "skipped",
            error: "Duplicate accession number",
          });
        } else {
          errors++;
          details.push({
            accessionNumber: filing.accessionNumber,
            status: "error",
            error: errMsg,
          });
        }
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
    return NextResponse.json(
      { error: "Failed to process ingestion request" },
      { status: 500 }
    );
  }
}
