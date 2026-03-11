import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import {
  enrichFiling,
  getEnrichmentModelName,
  buildScoringProfileFromTeamProfile,
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

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getScoringProfileForUser(session.user.id);

  try {
    const body = await request.json().catch(() => ({}));
    const { rescoreAll } = body;

    let query = db
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
        enrichmentId: filingEnrichments.id,
      })
      .from(formDFilings)
      .leftJoin(
        filingEnrichments,
        and(
          eq(formDFilings.id, filingEnrichments.filingId),
          eq(filingEnrichments.userId, session.user.id)
        )
      );

    if (rescoreAll) {
      query = query.limit(20) as typeof query;
    } else {
      query = query.where(sql`${filingEnrichments.id} IS NULL`).limit(20) as typeof query;
    }

    const filings = await query;

    let enriched = 0;
    let errors = 0;

    for (let i = 0; i < filings.length; i++) {
      const filing = filings[i]!;

      if (rescoreAll && filing.enrichmentId) {
        await db
          .delete(filingEnrichments)
          .where(
            and(
              eq(filingEnrichments.id, filing.enrichmentId),
              eq(filingEnrichments.userId, session.user.id)
            )
          );
      }

      const result = await enrichFiling(
        {
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
        },
        { profile }
      );

      if (result.success && result.data) {
        try {
          await db.insert(filingEnrichments).values({
            filingId: filing.id,
            userId: session.user.id,
            companySummary: result.data.companySummary,
            relevanceScore: result.data.relevanceScore,
            relevanceReasoning: result.data.relevanceReasoning,
            estimatedHeadcount: result.data.estimatedHeadcount,
            growthSignals: result.data.growthSignals,
            competitors: result.data.competitors,
            officeSpaceLikelihood: result.data.officeSpaceLikelihood ?? null,
            modelUsed: getEnrichmentModelName(),
          });
          enriched++;
        } catch (dbError) {
          console.error(`Failed to store enrichment for filing ${filing.id}:`, dbError);
          errors++;
        }
      } else {
        console.error(`Enrichment failed for ${filing.companyName}:`, result.error);
        errors++;
      }

      if (i < filings.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const remainingResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formDFilings)
      .leftJoin(
        filingEnrichments,
        and(
          eq(formDFilings.id, filingEnrichments.filingId),
          eq(filingEnrichments.userId, session.user.id)
        )
      )
      .where(sql`${filingEnrichments.id} IS NULL`);
    const remaining = remainingResult[0]?.count ?? 0;

    return NextResponse.json({ enriched, errors, remaining, rescored: rescoreAll || false });
  } catch (error) {
    console.error("Batch enrichment error:", error);
    return NextResponse.json({ error: "Failed to process batch enrichment" }, { status: 500 });
  }
}
