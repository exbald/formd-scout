import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments } from "@/lib/schema";

/**
 * GET /api/edgar/filings/[id]
 *
 * Returns a single Form D filing with optional enrichment data (LEFT JOIN).
 *
 * Auth: Requires authenticated session via Better Auth.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify authentication
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Query filing with LEFT JOIN to enrichments
    const result = await db
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
      .where(eq(formDFilings.id, id))
      .limit(1);

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
