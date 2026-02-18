import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments } from "@/lib/schema";
import {
  enrichFiling,
  getEnrichmentModelName,
  type EnrichmentInput,
} from "@/lib/ai/enrichment";

/**
 * POST /api/edgar/filings/[id]/enrich
 *
 * Enrich a single filing with AI-generated analysis.
 * User-authenticated endpoint for on-demand enrichment from the UI.
 *
 * Auth: Requires authenticated session via Better Auth.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify authentication
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if OpenRouter API key is configured
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY environment variable is not configured" },
      { status: 500 }
    );
  }

  const { id } = await params;

  try {
    // Fetch the filing
    const [filing] = await db
      .select()
      .from(formDFilings)
      .where(eq(formDFilings.id, id))
      .limit(1);

    if (!filing) {
      return NextResponse.json({ error: "Filing not found" }, { status: 404 });
    }

    // Check if already enriched - if so, delete old enrichment for re-analysis
    const [existing] = await db
      .select()
      .from(filingEnrichments)
      .where(eq(filingEnrichments.filingId, id))
      .limit(1);

    if (existing) {
      // Delete existing enrichment for re-analysis
      await db
        .delete(filingEnrichments)
        .where(eq(filingEnrichments.filingId, id));
    }

    // Prepare enrichment input
    const enrichmentInput: EnrichmentInput = {
      companyName: filing.companyName,
      cik: filing.cik,
      entityType: filing.entityType,
      industryGroup: filing.industryGroup,
      totalOffering: filing.totalOffering,
      amountSold: filing.amountSold,
      numInvestors: filing.numInvestors,
      revenueRange: filing.revenueRange,
      issuerCity: filing.issuerCity,
      issuerState: filing.issuerState,
      isAmendment: filing.isAmendment,
      filingDate: filing.filingDate,
      federalExemptions: filing.federalExemptions,
      yetToOccur: filing.yetToOccur,
      firstSaleDate: filing.firstSaleDate,
    };

    // Call AI enrichment
    const enrichmentResult = await enrichFiling(enrichmentInput);

    if (!enrichmentResult.success || !enrichmentResult.data) {
      return NextResponse.json(
        { error: enrichmentResult.error ?? "Enrichment failed" },
        { status: 500 }
      );
    }

    const enrichment = enrichmentResult.data;

    // Store the enrichment
    const [newEnrichment] = await db
      .insert(filingEnrichments)
      .values({
        filingId: filing.id,
        companySummary: enrichment.companySummary,
        relevanceScore: enrichment.relevanceScore,
        relevanceReasoning: enrichment.relevanceReasoning,
        estimatedHeadcount: enrichment.estimatedHeadcount,
        growthSignals: enrichment.growthSignals,
        competitors: enrichment.competitors,
        modelUsed: getEnrichmentModelName(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      enrichment: newEnrichment,
    });
  } catch (error) {
    console.error("Enrichment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
