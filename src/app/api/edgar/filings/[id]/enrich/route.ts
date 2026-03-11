import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import {
  enrichFiling,
  getEnrichmentModelName,
  buildScoringProfileFromTeamProfile,
  type EnrichmentInput,
  type ScoringProfile,
  DEFAULT_SCORING_PROFILE,
} from "@/lib/ai/enrichment";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments, teamProfiles } from "@/lib/schema";

async function getScoringProfileForUser(userId: string): Promise<ScoringProfile> {
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

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY environment variable is not configured" },
      { status: 500 }
    );
  }

  const { id } = await params;
  const profile = await getScoringProfileForUser(session.user.id);

  try {
    const [filing] = await db.select().from(formDFilings).where(eq(formDFilings.id, id)).limit(1);

    if (!filing) {
      return NextResponse.json({ error: "Filing not found" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(filingEnrichments)
      .where(
        and(
          eq(filingEnrichments.filingId, id),
          eq(filingEnrichments.userId, session.user.id)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .delete(filingEnrichments)
        .where(
          and(
            eq(filingEnrichments.filingId, id),
            eq(filingEnrichments.userId, session.user.id)
          )
        );
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
      return NextResponse.json(
        { error: enrichmentResult.error ?? "Enrichment failed" },
        { status: 500 }
      );
    }

    const enrichment = enrichmentResult.data;

    const [newEnrichment] = await db
      .insert(filingEnrichments)
      .values({
        filingId: filing.id,
        userId: session.user.id,
        companySummary: enrichment.companySummary,
        relevanceScore: enrichment.relevanceScore,
        relevanceReasoning: enrichment.relevanceReasoning,
        estimatedHeadcount: enrichment.estimatedHeadcount,
        growthSignals: enrichment.growthSignals,
        competitors: enrichment.competitors,
        officeSpaceLikelihood: enrichment.officeSpaceLikelihood ?? null,
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
