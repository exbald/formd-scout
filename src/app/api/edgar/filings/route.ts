import { NextRequest, NextResponse } from "next/server";
import { eq, gte, lte, ilike, sql, and, asc, desc, isNull, SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments } from "@/lib/schema";

/** Alias tables for the dual-join per-user enrichment strategy. */
const userEnrich = alias(filingEnrichments, "user_enrich");
const sysEnrich = alias(filingEnrichments, "sys_enrich");

/**
 * GET /api/edgar/filings
 *
 * Returns paginated Form D filings with optional enrichment data (LEFT JOIN).
 * Supports filtering by date range, offering range, industry, state,
 * relevance score, amendment status, and free-text search.
 *
 * When a `userId` query param is provided, per-user enrichment rows are
 * preferred over system defaults via a dual LEFT JOIN with COALESCE.
 *
 * Auth: Public — no authentication required.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  // Pagination params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "25", 10))
  );
  const offset = (page - 1) * limit;

  // Per-user scoring: optional userId to prefer user-specific enrichments
  const userId = searchParams.get("userId");

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
    const minRelVal = parseInt(minRelevance, 10);
    if (userId) {
      // Filter on the COALESCE of user-specific and system enrichment scores
      conditions.push(
        sql`COALESCE(${userEnrich.relevanceScore}, ${sysEnrich.relevanceScore}) >= ${minRelVal}`
      );
    } else {
      conditions.push(
        sql`${filingEnrichments.relevanceScore} >= ${minRelVal}`
      );
    }
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
    const minHcVal = parseInt(minHeadcount, 10);
    if (userId) {
      conditions.push(
        sql`COALESCE(${userEnrich.estimatedHeadcount}, ${sysEnrich.estimatedHeadcount}) >= ${minHcVal}`
      );
    } else {
      conditions.push(
        sql`${filingEnrichments.estimatedHeadcount} >= ${minHcVal}`
      );
    }
  }
  if (search?.trim()) {
    conditions.push(ilike(formDFilings.companyName, `%${search.trim()}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build sort - use sql for sort column to avoid type issues with nullable columns.
  // When userId is provided, enrichment sort columns use COALESCE across the two joins.
  const sortColumnMap: Record<string, SQL> = {
    filingDate: sql`${formDFilings.filingDate}`,
    companyName: sql`${formDFilings.companyName}`,
    totalOffering: sql`${formDFilings.totalOffering}`,
    industryGroup: sql`${formDFilings.industryGroup}`,
    issuerState: sql`${formDFilings.issuerState}`,
    relevanceScore: userId
      ? sql`COALESCE(${userEnrich.relevanceScore}, ${sysEnrich.relevanceScore})`
      : sql`${filingEnrichments.relevanceScore}`,
    estimatedHeadcount: userId
      ? sql`COALESCE(${userEnrich.estimatedHeadcount}, ${sysEnrich.estimatedHeadcount})`
      : sql`${filingEnrichments.estimatedHeadcount}`,
  };
  const sortColumn = sortColumnMap[sortBy] || sql`${formDFilings.filingDate}`;
  const orderExpr =
    sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  /** Shared filing column selection (no enrichment fields). */
  const filingColumns = {
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
  } as const;

  try {
    let filings;
    let countResult;

    if (userId) {
      // Dual LEFT JOIN: prefer user-specific enrichment, fall back to system default.
      // userEnrich = enrichment row for this specific user
      // sysEnrich  = enrichment row with userId IS NULL (system default)
      filings = await db
        .select({
          ...filingColumns,
          // COALESCE user-specific over system-default enrichment fields
          enrichmentId: sql<string>`COALESCE(${userEnrich.id}, ${sysEnrich.id})`,
          companySummary: sql<string | null>`COALESCE(${userEnrich.companySummary}, ${sysEnrich.companySummary})`,
          relevanceScore: sql<number | null>`COALESCE(${userEnrich.relevanceScore}, ${sysEnrich.relevanceScore})`,
          relevanceReasoning: sql<string | null>`COALESCE(${userEnrich.relevanceReasoning}, ${sysEnrich.relevanceReasoning})`,
          estimatedHeadcount: sql<number | null>`COALESCE(${userEnrich.estimatedHeadcount}, ${sysEnrich.estimatedHeadcount})`,
          growthSignals: sql<string[] | null>`COALESCE(${userEnrich.growthSignals}, ${sysEnrich.growthSignals})`,
          competitors: sql<string[] | null>`COALESCE(${userEnrich.competitors}, ${sysEnrich.competitors})`,
          enrichedAt: sql<Date | null>`COALESCE(${userEnrich.enrichedAt}, ${sysEnrich.enrichedAt})`,
          modelUsed: sql<string | null>`COALESCE(${userEnrich.modelUsed}, ${sysEnrich.modelUsed})`,
        })
        .from(formDFilings)
        .leftJoin(
          userEnrich,
          and(
            eq(formDFilings.id, userEnrich.filingId),
            eq(userEnrich.userId, userId)
          )
        )
        .leftJoin(
          sysEnrich,
          and(
            eq(formDFilings.id, sysEnrich.filingId),
            isNull(sysEnrich.userId)
          )
        )
        .where(whereClause)
        .orderBy(orderExpr)
        .limit(limit)
        .offset(offset);

      countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(formDFilings)
        .leftJoin(
          userEnrich,
          and(
            eq(formDFilings.id, userEnrich.filingId),
            eq(userEnrich.userId, userId)
          )
        )
        .leftJoin(
          sysEnrich,
          and(
            eq(formDFilings.id, sysEnrich.filingId),
            isNull(sysEnrich.userId)
          )
        )
        .where(whereClause);
    } else {
      // No userId — use original single LEFT JOIN to system-default enrichments
      filings = await db
        .select({
          ...filingColumns,
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
          and(
            eq(formDFilings.id, filingEnrichments.filingId),
            isNull(filingEnrichments.userId)
          )
        )
        .where(whereClause)
        .orderBy(orderExpr)
        .limit(limit)
        .offset(offset);

      countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(formDFilings)
        .leftJoin(
          filingEnrichments,
          and(
            eq(formDFilings.id, filingEnrichments.filingId),
            isNull(filingEnrichments.userId)
          )
        )
        .where(whereClause);
    }

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
