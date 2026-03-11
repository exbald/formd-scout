import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import {
  enrichFiling,
  getEnrichmentModelName,
  buildScoringProfileFromTeamProfile,
  type EnrichmentInput,
  type ScoringProfile,
  DEFAULT_SCORING_PROFILE,
} from "@/lib/ai/enrichment";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments, teamProfiles } from "@/lib/schema";

async function getScoringProfile(userId?: string): Promise<ScoringProfile> {
  if (!userId) {
    return DEFAULT_SCORING_PROFILE;
  }

  try {
    const [profile] = await db
      .select()
      .from(teamProfiles)
      .where(eq(teamProfiles.userId, userId))
      .limit(1);

    if (profile) {
      return buildScoringProfileFromTeamProfile(profile);
    }
  } catch (error) {
    console.error("Error fetching team profile:", error);
  }

  return DEFAULT_SCORING_PROFILE;
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const expectedApiKey = process.env.INGEST_API_KEY;

  if (!expectedApiKey || apiKey !== expectedApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY environment variable is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { filingId, profileId } = body;

    const profile = await getScoringProfile(profileId ?? undefined);
    const enriched: string[] = [];
    const errors: { filingId: string; error: string }[] = [];

    if (filingId) {
      const result = await enrichSingleFiling(filingId, profile);
      if (result.success) {
        enriched.push(filingId);
      } else {
        errors.push({ filingId, error: result.error ?? "Unknown error" });
      }
    } else {
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
          and(
            eq(formDFilings.id, filingEnrichments.filingId),
            isNull(filingEnrichments.userId)
          )
        )
        .where(isNull(filingEnrichments.id))
        .limit(10);

      for (let i = 0; i < unenrichedFilings.length; i++) {
        const filing = unenrichedFilings[i];
        if (!filing) continue;

        const filingId = filing.id;

        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const result = await enrichSingleFiling(filingId, profile);
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

async function enrichSingleFiling(
  filingId: string,
  profile: ScoringProfile
): Promise<{ success: boolean; error?: string }> {
  try {
    const [filing] = await db
      .select()
      .from(formDFilings)
      .where(eq(formDFilings.id, filingId))
      .limit(1);

    if (!filing) {
      return { success: false, error: "Filing not found" };
    }

    const [existing] = await db
      .select()
      .from(filingEnrichments)
      .where(
        and(
          eq(filingEnrichments.filingId, filingId),
          isNull(filingEnrichments.userId)
        )
      )
      .limit(1);

    if (existing) {
      return { success: false, error: "Filing already enriched" };
    }

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

    const enrichmentResult = await enrichFiling(enrichmentInput, { profile });

    if (!enrichmentResult.success || !enrichmentResult.data) {
      return {
        success: false,
        error: enrichmentResult.error ?? "Unknown enrichment error",
      };
    }

    const enrichment = enrichmentResult.data;

    await db.insert(filingEnrichments).values({
      filingId: filing.id,
      userId: null,
      companySummary: enrichment.companySummary,
      relevanceScore: enrichment.relevanceScore,
      relevanceReasoning: enrichment.relevanceReasoning,
      estimatedHeadcount: enrichment.estimatedHeadcount,
      growthSignals: enrichment.growthSignals,
      competitors: enrichment.competitors,
      officeSpaceLikelihood: enrichment.officeSpaceLikelihood ?? null,
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
