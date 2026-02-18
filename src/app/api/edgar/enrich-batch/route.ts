import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments } from "@/lib/schema";
import { enrichFiling, getEnrichmentModelName } from "@/lib/ai/enrichment";

/**
 * POST /api/edgar/enrich-batch
 *
 * Triggers AI enrichment for up to 20 unenriched filings.
 * Uses Better Auth session (not INGEST_API_KEY).
 *
 * Response: { enriched, errors, remaining }
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find up to 20 unenriched filings (no matching row in filingEnrichments)
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
      .leftJoin(filingEnrichments, eq(formDFilings.id, filingEnrichments.filingId))
      .where(sql`${filingEnrichments.id} IS NULL`)
      .limit(20);

    let enriched = 0;
    let errors = 0;

    for (const filing of unenrichedFilings) {
      const result = await enrichFiling({
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
      });

      if (result.success && result.data) {
        try {
          await db.insert(filingEnrichments).values({
            filingId: filing.id,
            companySummary: result.data.companySummary,
            relevanceScore: result.data.relevanceScore,
            relevanceReasoning: result.data.relevanceReasoning,
            estimatedHeadcount: result.data.estimatedHeadcount,
            growthSignals: result.data.growthSignals,
            competitors: result.data.competitors,
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

      // 2-second delay between filings to avoid OpenRouter rate limits
      if (unenrichedFilings.indexOf(filing) < unenrichedFilings.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Count remaining unenriched filings
    const remainingResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formDFilings)
      .leftJoin(filingEnrichments, eq(formDFilings.id, filingEnrichments.filingId))
      .where(sql`${filingEnrichments.id} IS NULL`);
    const remaining = remainingResult[0]?.count ?? 0;

    return NextResponse.json({ enriched, errors, remaining });
  } catch (error) {
    console.error("Batch enrichment error:", error);
    return NextResponse.json(
      { error: "Failed to process batch enrichment" },
      { status: 500 }
    );
  }
}
