import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments } from "@/lib/schema";

/** Alias tables for dual-join per-user enrichment strategy. */
const userEnrich = alias(filingEnrichments, "user_enrich");
const sysEnrich = alias(filingEnrichments, "sys_enrich");

/**
 * GET /api/edgar/filings/[id]
 *
 * Returns a single Form D filing with optional enrichment data (LEFT JOIN).
 * When a `userId` query param is provided, per-user enrichment rows are
 * preferred over system defaults via a dual LEFT JOIN with COALESCE.
 *
 * Auth: Public — no authentication required.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = req.nextUrl.searchParams.get("userId");

  /** Filing columns shared across both query branches. */
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
    let result;

    if (userId) {
      // Dual LEFT JOIN: prefer user-specific enrichment, fall back to system default
      result = await db
        .select({
          ...filingColumns,
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
        .where(eq(formDFilings.id, id))
        .limit(1);
    } else {
      // No userId — single LEFT JOIN to system-default enrichments
      result = await db
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
        .where(eq(formDFilings.id, id))
        .limit(1);
    }

    if (result.length === 0) {
      return NextResponse.json({ error: "Filing not found" }, { status: 404 });
    }

    return NextResponse.json({ filing: result[0] });
  } catch (error) {
    console.error("Error fetching filing:", error);
    return NextResponse.json(
      { error: "Failed to fetch filing" },
      { status: 500 }
    );
  }
}
