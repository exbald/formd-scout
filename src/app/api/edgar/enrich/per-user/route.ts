import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import {
  enrichFiling,
  getEnrichmentModelName,
  buildScoringProfileFromTeamProfile,
} from "@/lib/ai/enrichment";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments, teamProfiles } from "@/lib/schema";

/** Minimum default relevance score to consider a filing worth per-user scoring. */
const MIN_DEFAULT_SCORE = 20;

/** Maximum filings to enrich per user in a single request. */
const PER_USER_LIMIT = 10;

interface UserDetail {
  enriched: number;
  skipped: number;
  errors: number;
}

export async function POST(request: NextRequest) {
  // Authenticate via API key OR session cookie (for client-side calls like onboarding)
  const apiKey = request.headers.get("x-api-key");
  const expectedApiKey = process.env.INGEST_API_KEY;
  const hasValidApiKey = expectedApiKey && apiKey === expectedApiKey;

  const session = hasValidApiKey
    ? null
    : await auth.api.getSession({ headers: await headers() });

  if (!hasValidApiKey && !session) {
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
    const daysBack = typeof body.daysBack === "number" && body.daysBack > 0 ? body.daysBack : 1;
    // Session-authenticated users can only score for themselves;
    // API key callers may optionally specify a target userId
    const targetUserId: string | undefined = session
      ? session.user.id
      : (body.userId ?? undefined);

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0]!;

    // Fetch team profiles: single user or all users with custom scoring criteria
    const profileRows = targetUserId
      ? await db
          .select()
          .from(teamProfiles)
          .where(eq(teamProfiles.userId, targetUserId))
          .limit(1)
      : await db
          .select()
          .from(teamProfiles)
          .where(sql`${teamProfiles.scoringCriteria} IS NOT NULL`);

    if (profileRows.length === 0) {
      return NextResponse.json({
        users: 0,
        enriched: 0,
        skipped: 0,
        errors: 0,
        details: {},
      });
    }

    let totalEnriched = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const details: Record<string, UserDetail> = {};

    for (const profileRow of profileRows) {
      const userId = profileRow.userId;
      const scoringProfile = buildScoringProfileFromTeamProfile(profileRow);
      const userDetail: UserDetail = { enriched: 0, skipped: 0, errors: 0 };

      // Find recent filings that are missing per-user enrichment for this user.
      // Left join the default (system) enrichment to get the default relevance score
      // for pre-filtering, and use NOT EXISTS to exclude filings already scored for this user.
      const candidateFilings = await db
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
          defaultScore: filingEnrichments.relevanceScore,
        })
        .from(formDFilings)
        .leftJoin(
          filingEnrichments,
          and(
            eq(filingEnrichments.filingId, formDFilings.id),
            isNull(filingEnrichments.userId)
          )
        )
        .where(
          and(
            gte(formDFilings.filingDate, cutoffDateStr),
            sql`NOT EXISTS (
              SELECT 1 FROM filing_enrichments fe2
              WHERE fe2.filing_id = ${formDFilings.id} AND fe2.user_id = ${userId}
            )`
          )
        )
        .limit(PER_USER_LIMIT);

      for (let i = 0; i < candidateFilings.length; i++) {
        const filing = candidateFilings[i]!;

        // Pre-filter: skip filings where the default system score is below threshold
        if (filing.defaultScore !== null && filing.defaultScore < MIN_DEFAULT_SCORE) {
          userDetail.skipped++;
          continue;
        }

        // Rate-limit AI calls with a 2-second delay between enrichments
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
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
          { profile: scoringProfile }
        );

        if (result.success && result.data) {
          try {
            await db.insert(filingEnrichments).values({
              filingId: filing.id,
              userId,
              companySummary: result.data.companySummary,
              relevanceScore: result.data.relevanceScore,
              relevanceReasoning: result.data.relevanceReasoning,
              estimatedHeadcount: result.data.estimatedHeadcount,
              growthSignals: result.data.growthSignals,
              competitors: result.data.competitors,
              officeSpaceLikelihood: result.data.officeSpaceLikelihood ?? null,
              modelUsed: getEnrichmentModelName(),
            });
            userDetail.enriched++;
          } catch (dbError) {
            console.error(
              `Failed to store per-user enrichment for filing ${filing.id}, user ${userId}:`,
              dbError
            );
            userDetail.errors++;
          }
        } else {
          console.error(
            `Per-user enrichment failed for ${filing.companyName} (user ${userId}):`,
            result.error
          );
          userDetail.errors++;
        }
      }

      details[userId] = userDetail;
      totalEnriched += userDetail.enriched;
      totalSkipped += userDetail.skipped;
      totalErrors += userDetail.errors;
    }

    return NextResponse.json({
      users: profileRows.length,
      enriched: totalEnriched,
      skipped: totalSkipped,
      errors: totalErrors,
      details,
    });
  } catch (error) {
    console.error("Per-user enrichment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
