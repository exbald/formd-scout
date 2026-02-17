import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments } from "@/lib/schema";
import { eq, isNull } from "drizzle-orm";
import {
  enrichFiling,
  getEnrichmentModelName,
  type EnrichmentInput,
} from "@/lib/ai/enrichment";

/**
 * POST /api/edgar/enrich
 *
 * Enrich filings with AI-generated analysis.
 * - If filingId is provided, enrich that specific filing
 * - Otherwise, batch-enrich all unenriched filings (batches of 10, 2-second delays)
 *
 * Protected by x-api-key header checked against INGEST_API_KEY env var.
 */
export async function POST(request: NextRequest) {
  // Validate API key
  const apiKey = request.headers.get("x-api-key");
  const expectedApiKey = process.env.INGEST_API_KEY;

  if (!expectedApiKey || apiKey !== expectedApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if OpenRouter API key is configured
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY environment variable is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { filingId } = body;

    const enriched: string[] = [];
    const errors: { filingId: string; error: string }[] = [];

    if (filingId) {
      // Enrich a specific filing
      const result = await enrichSingleFiling(filingId);
      if (result.success) {
        enriched.push(filingId);
      } else {
        errors.push({ filingId, error: result.error ?? "Unknown error" });
      }
    } else {
      // Batch enrich all unenriched filings
      const unenrichedFilings = await db
        .select({
          id: formDFilings.id,
          companyName: formDFilings.companyName,
          cik: formDFilings.cik,
          entityType: formDFilings.entityType,
          industryGroup: formDFilings.industryGroup,
          totalOffering: formDFilings.totalOffering,
          amountSold: formDFilings.amountSold,
          numInvestors: formDFilings.numInvestors,
          revenueRange: formDFilings.revenueRange,
          issuerCity: formDFilings.issuerCity,
          issuerState: formDFilings.issuerState,
          isAmendment: formDFilings.isAmendment,
          filingDate: formDFilings.filingDate,
          federalExemptions: formDFilings.federalExemptions,
          yetToOccur: formDFilings.yetToOccur,
          firstSaleDate: formDFilings.firstSaleDate,
        })
        .from(formDFilings)
        .leftJoin(
          filingEnrichments,
          eq(formDFilings.id, filingEnrichments.filingId)
        )
        .where(isNull(filingEnrichments.id))
        .limit(10);

      // Process in batches with delays
      for (let i = 0; i < unenrichedFilings.length; i++) {
        const filing = unenrichedFilings[i];
        if (!filing) continue;

        const filingId = filing.id;

        // Add 2-second delay between filings (not before the first one)
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const result = await enrichSingleFiling(filingId);
        if (result.success) {
          enriched.push(filingId);
        } else {
          errors.push({ filingId, error: result.error ?? "Unknown error" });
        }
      }
    }

    return NextResponse.json({
      enriched: enriched.length,
      errors: errors.length,
      details: { enriched, errors },
    });
  } catch (error) {
    console.error("Enrichment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Enrich a single filing by ID.
 */
async function enrichSingleFiling(
  filingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch the filing
    const [filing] = await db
      .select()
      .from(formDFilings)
      .where(eq(formDFilings.id, filingId))
      .limit(1);

    if (!filing) {
      return { success: false, error: "Filing not found" };
    }

    // Check if already enriched
    const [existing] = await db
      .select()
      .from(filingEnrichments)
      .where(eq(filingEnrichments.filingId, filingId))
      .limit(1);

    if (existing) {
      return { success: false, error: "Filing already enriched" };
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
    const enrichment = await enrichFiling(enrichmentInput);

    // Store the enrichment
    await db.insert(filingEnrichments).values({
      filingId: filing.id,
      companySummary: enrichment.companySummary,
      relevanceScore: enrichment.relevanceScore,
      relevanceReasoning: enrichment.relevanceReasoning,
      estimatedHeadcount: enrichment.estimatedHeadcount,
      growthSignals: enrichment.growthSignals,
      competitors: enrichment.competitors,
      modelUsed: getEnrichmentModelName(),
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
