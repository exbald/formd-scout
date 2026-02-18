import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq, gte, lte, ilike, sql, and, SQL } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments } from "@/lib/schema";

/**
 * GET /api/edgar/export
 *
 * Exports Form D filings as CSV with optional filtering.
 * Accepts the same filter params as /api/edgar/filings.
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
    // Query all filings matching filters (no pagination for export)
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
      .orderBy(formDFilings.filingDate);

    // Generate CSV
    // Note: Header names chosen to match common CRM/spreadsheet conventions
    const headers = [
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
    ];

    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [
      headers.join(","),
      ...filings.map((f) =>
        [
          escapeCSV(f.companyName),
          escapeCSV(f.cik),
          escapeCSV(f.filingDate),
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
          escapeCSV(f.firstSaleDate),
          escapeCSV(f.yetToOccur ? "Yes" : "No"),
          escapeCSV(f.relevanceScore),
          escapeCSV(f.companySummary),
        ].join(",")
      ),
    ];

    const csv = csvRows.join("\n");

    // Return CSV with appropriate headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="form-d-filings-${new Date().toISOString().split("T")[0]}.csv"`,
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
