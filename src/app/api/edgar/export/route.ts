import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq, gte, lte, ilike, sql, and, SQL, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments } from "@/lib/schema";

// CSV escape utility
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// CSV headers - chosen to match common CRM/spreadsheet conventions
const CSV_HEADERS = [
  "Company Name",
  "CIK",
  "Filing Date",
  "Amendment",
  "Offering Amount",
  "Amount Sold",
  "Amount Remaining",
  "Investors",
  "Min Investment",
  "Revenue Range",
  "Industry",
  "Entity Type",
  "State of Inc",
  "City",
  "State",
  "ZIP",
  "Phone",
  "SEC Filing URL",
  "First Sale Date",
  "Yet To Occur",
  "Relevance Score",
  "Company Summary",
].join(",");

// Convert a filing row to CSV line
// Note: Drizzle with postgres.js returns dates as strings, not Date objects
function filingToCSVRow(f: {
  companyName: string;
  cik: string;
  filingDate: string | Date;
  isAmendment: boolean | null;
  totalOffering: string | null;
  amountSold: string | null;
  amountRemaining: string | null;
  numInvestors: number | null;
  minInvestment: string | null;
  revenueRange: string | null;
  industryGroup: string | null;
  entityType: string | null;
  stateOfInc: string | null;
  issuerCity: string | null;
  issuerState: string | null;
  issuerZip: string | null;
  issuerPhone: string | null;
  filingUrl: string | null;
  firstSaleDate: string | Date | null;
  yetToOccur: boolean | null;
  relevanceScore: number | null;
  companySummary: string | null;
}): string {
  return [
    escapeCSV(f.companyName),
    escapeCSV(f.cik),
    escapeCSV(f.filingDate instanceof Date ? f.filingDate.toISOString().split('T')[0] : String(f.filingDate ?? '')),
    escapeCSV(f.isAmendment ? "Yes" : "No"),
    escapeCSV(f.totalOffering),
    escapeCSV(f.amountSold),
    escapeCSV(f.amountRemaining),
    escapeCSV(f.numInvestors),
    escapeCSV(f.minInvestment),
    escapeCSV(f.revenueRange),
    escapeCSV(f.industryGroup),
    escapeCSV(f.entityType),
    escapeCSV(f.stateOfInc),
    escapeCSV(f.issuerCity),
    escapeCSV(f.issuerState),
    escapeCSV(f.issuerZip),
    escapeCSV(f.issuerPhone),
    escapeCSV(f.filingUrl),
    escapeCSV(f.firstSaleDate instanceof Date ? f.firstSaleDate.toISOString().split('T')[0] : String(f.firstSaleDate ?? '')),
    escapeCSV(f.yetToOccur ? "Yes" : "No"),
    escapeCSV(f.relevanceScore),
    escapeCSV(f.companySummary),
  ].join(",");
}

/**
 * GET /api/edgar/export
 *
 * Exports Form D filings as CSV with optional filtering.
 * Accepts the same filter params as /api/edgar/filings.
 * Uses streaming to handle large datasets efficiently.
 *
 * Auth: Requires authenticated session via Better Auth.
 */
export async function GET(req: NextRequest) {
  // Verify authentication
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;

  // Filter params (same as filings endpoint)
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const minOffering = searchParams.get("minOffering");
  const maxOffering = searchParams.get("maxOffering");
  const industryGroup = searchParams.get("industryGroup");
  const state = searchParams.get("state");
  const minRelevance = searchParams.get("minRelevance");
  const isAmendment = searchParams.get("isAmendment");
  const yetToOccur = searchParams.get("yetToOccur");
  const search = searchParams.get("search");

  // Build WHERE conditions (same as filings endpoint)
  const conditions: SQL[] = [];

  if (startDate) {
    conditions.push(gte(formDFilings.filingDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(formDFilings.filingDate, endDate));
  }
  if (minOffering) {
    conditions.push(
      sql`${formDFilings.totalOffering} >= ${minOffering}::numeric`
    );
  }
  if (maxOffering) {
    conditions.push(
      sql`${formDFilings.totalOffering} <= ${maxOffering}::numeric`
    );
  }
  if (industryGroup) {
    const groups = industryGroup.split(",").map((g) => g.trim());
    if (groups.length === 1) {
      conditions.push(sql`${formDFilings.industryGroup} = ${groups[0]}`);
    } else {
      conditions.push(
        sql`${formDFilings.industryGroup} IN (${sql.join(
          groups.map((g) => sql`${g}`),
          sql`, `
        )})`
      );
    }
  }
  if (state) {
    const states = state.split(",").map((s) => s.trim());
    if (states.length === 1) {
      conditions.push(sql`${formDFilings.issuerState} = ${states[0]}`);
    } else {
      conditions.push(
        sql`${formDFilings.issuerState} IN (${sql.join(
          states.map((s) => sql`${s}`),
          sql`, `
        )})`
      );
    }
  }
  if (minRelevance) {
    conditions.push(
      sql`${filingEnrichments.relevanceScore} >= ${parseInt(minRelevance, 10)}`
    );
  }
  if (isAmendment === "true") {
    conditions.push(eq(formDFilings.isAmendment, true));
  } else if (isAmendment === "false") {
    conditions.push(eq(formDFilings.isAmendment, false));
  }
  if (yetToOccur === "true") {
    conditions.push(eq(formDFilings.yetToOccur, true));
  }
  if (search?.trim()) {
    conditions.push(ilike(formDFilings.companyName, `%${search.trim()}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    // Use streaming for memory-efficient handling of large datasets
    // Fetch in batches of 500 to balance memory and query efficiency
    const BATCH_SIZE = 500;
    let offset = 0;
    let hasMore = true;

    // Create a ReadableStream for streaming CSV output
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Write CSV header
        controller.enqueue(encoder.encode(CSV_HEADERS + "\n"));

        try {
          while (hasMore) {
            // Fetch batch of filings
            const filings = await db
              .select({
                companyName: formDFilings.companyName,
                cik: formDFilings.cik,
                filingDate: formDFilings.filingDate,
                isAmendment: formDFilings.isAmendment,
                totalOffering: formDFilings.totalOffering,
                amountSold: formDFilings.amountSold,
                amountRemaining: formDFilings.amountRemaining,
                numInvestors: formDFilings.numInvestors,
                minInvestment: formDFilings.minInvestment,
                revenueRange: formDFilings.revenueRange,
                industryGroup: formDFilings.industryGroup,
                entityType: formDFilings.entityType,
                stateOfInc: formDFilings.stateOfInc,
                issuerCity: formDFilings.issuerCity,
                issuerState: formDFilings.issuerState,
                issuerZip: formDFilings.issuerZip,
                issuerPhone: formDFilings.issuerPhone,
                filingUrl: formDFilings.filingUrl,
                firstSaleDate: formDFilings.firstSaleDate,
                yetToOccur: formDFilings.yetToOccur,
                relevanceScore: filingEnrichments.relevanceScore,
                companySummary: filingEnrichments.companySummary,
              })
              .from(formDFilings)
              .leftJoin(
                filingEnrichments,
                eq(formDFilings.id, filingEnrichments.filingId)
              )
              .where(whereClause)
              .orderBy(desc(formDFilings.filingDate))
              .limit(BATCH_SIZE)
              .offset(offset);

            if (filings.length === 0) {
              hasMore = false;
              break;
            }

            // Write CSV rows for this batch
            for (const filing of filings) {
              controller.enqueue(encoder.encode(filingToCSVRow(filing) + "\n"));
            }

            // Check if we need to fetch more
            if (filings.length < BATCH_SIZE) {
              hasMore = false;
            } else {
              offset += BATCH_SIZE;
            }
          }

          controller.close();
        } catch (error) {
          console.error("Error in CSV stream:", error);
          controller.error(error);
        }
      },
    });

    // Return streaming response
    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="form-d-filings-${new Date().toISOString().split("T")[0]}.csv"`,
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Error exporting filings:", error);
    return NextResponse.json(
      { error: "Failed to export filings" },
      { status: 500 }
    );
  }
}
