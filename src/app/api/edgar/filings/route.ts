import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq, gte, lte, ilike, sql, and, asc, desc, SQL } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments } from "@/lib/schema";

/**
 * GET /api/edgar/filings
 *
 * Returns paginated Form D filings with optional enrichment data (LEFT JOIN).
 * Supports filtering by date range, offering range, industry, state,
 * relevance score, amendment status, and free-text search.
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

  // Pagination params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "25", 10))
  );
  const offset = (page - 1) * limit;

  // Filter params
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
  const minHeadcount = searchParams.get("minHeadcount");

  // Sort params
  const sortBy = searchParams.get("sortBy") || "filingDate";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  // Build WHERE conditions
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
    // Support comma-separated industry groups for multi-select
    const groups = industryGroup.split(",").map((g) => g.trim());
    if (groups.length === 1) {
      conditions.push(
        sql`${formDFilings.industryGroup} = ${groups[0]}`
      );
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
      conditions.push(
        sql`${formDFilings.issuerState} = ${states[0]}`
      );
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
  if (minHeadcount) {
    conditions.push(
      sql`${filingEnrichments.estimatedHeadcount} >= ${parseInt(minHeadcount, 10)}`
    );
  }
  if (search?.trim()) {
    conditions.push(ilike(formDFilings.companyName, `%${search.trim()}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build sort - use sql for sort column to avoid type issues with nullable columns
  const sortColumnMap: Record<string, SQL> = {
    filingDate: sql`${formDFilings.filingDate}`,
    companyName: sql`${formDFilings.companyName}`,
    totalOffering: sql`${formDFilings.totalOffering}`,
    industryGroup: sql`${formDFilings.industryGroup}`,
    issuerState: sql`${formDFilings.issuerState}`,
    relevanceScore: sql`${filingEnrichments.relevanceScore}`,
    estimatedHeadcount: sql`${filingEnrichments.estimatedHeadcount}`,
  };
  const sortColumn = sortColumnMap[sortBy] || sql`${formDFilings.filingDate}`;
  const orderExpr =
    sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  try {
    // Query filings with LEFT JOIN to enrichments
    const filings = await db
      .select({
        id: formDFilings.id,
        cik: formDFilings.cik,
        accessionNumber: formDFilings.accessionNumber,
        companyName: formDFilings.companyName,
        entityType: formDFilings.entityType,
        stateOfInc: formDFilings.stateOfInc,
        sicCode: formDFilings.sicCode,
        filingDate: formDFilings.filingDate,
        isAmendment: formDFilings.isAmendment,
        totalOffering: formDFilings.totalOffering,
        amountSold: formDFilings.amountSold,
        amountRemaining: formDFilings.amountRemaining,
        numInvestors: formDFilings.numInvestors,
        minInvestment: formDFilings.minInvestment,
        revenueRange: formDFilings.revenueRange,
        industryGroup: formDFilings.industryGroup,
        issuerStreet: formDFilings.issuerStreet,
        issuerCity: formDFilings.issuerCity,
        issuerState: formDFilings.issuerState,
        issuerZip: formDFilings.issuerZip,
        issuerPhone: formDFilings.issuerPhone,
        filingUrl: formDFilings.filingUrl,
        xmlUrl: formDFilings.xmlUrl,
        firstSaleDate: formDFilings.firstSaleDate,
        yetToOccur: formDFilings.yetToOccur,
        moreThanOneYear: formDFilings.moreThanOneYear,
        federalExemptions: formDFilings.federalExemptions,
        createdAt: formDFilings.createdAt,
        updatedAt: formDFilings.updatedAt,
        // Enrichment fields (LEFT JOINed)
        enrichmentId: filingEnrichments.id,
        companySummary: filingEnrichments.companySummary,
        relevanceScore: filingEnrichments.relevanceScore,
        relevanceReasoning: filingEnrichments.relevanceReasoning,
        estimatedHeadcount: filingEnrichments.estimatedHeadcount,
        growthSignals: filingEnrichments.growthSignals,
        competitors: filingEnrichments.competitors,
        enrichedAt: filingEnrichments.enrichedAt,
        modelUsed: filingEnrichments.modelUsed,
      })
      .from(formDFilings)
      .leftJoin(
        filingEnrichments,
        eq(formDFilings.id, filingEnrichments.filingId)
      )
      .where(whereClause)
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formDFilings)
      .leftJoin(
        filingEnrichments,
        eq(formDFilings.id, filingEnrichments.filingId)
      )
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      filings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching filings:", error);
    return NextResponse.json(
      { error: "Failed to fetch filings" },
      { status: 500 }
    );
  }
}
