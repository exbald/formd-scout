import { NextRequest, NextResponse } from "next/server";
import { eq, gte, lt, and, sql } from "drizzle-orm";
import {
  submitAgentJob,
  type ResearchInput,
  type WebhookConfig,
} from "@/lib/ai/research";
import { db } from "@/lib/db";
import {
  formDFilings,
  filingEnrichments,
  companyResearch,
  appSettings,
  researchJobs,
} from "@/lib/schema";

export const maxDuration = 30;

const INGEST_API_KEY = process.env.INGEST_API_KEY;
const BATCH_SIZE = 5;

/** Pending jobs older than this (ms) are considered stale and will be expired. */
const STALE_JOB_AGE_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || !INGEST_API_KEY || apiKey !== INGEST_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.FIRECRAWL_API_KEY) {
    return NextResponse.json(
      { error: "FIRECRAWL_API_KEY must be configured" },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = body.userId as string | undefined;

    // Load settings - use provided userId or find first user's settings
    let threshold = 60;
    let maxDaily = 15;
    let enabled = true;
    let maxCredits = 2000;

    if (userId) {
      const [settings] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.userId, userId))
        .limit(1);
      if (settings) {
        threshold = settings.autoResearchThreshold ?? 60;
        maxDaily = settings.maxDailyResearch ?? 15;
        enabled = settings.autoResearchEnabled ?? true;
        if (settings.maxAgentCredits) {
          maxCredits = settings.maxAgentCredits;
        }
      }
    } else {
      const [settings] = await db.select().from(appSettings).limit(1);
      if (settings) {
        threshold = settings.autoResearchThreshold ?? 60;
        maxDaily = settings.maxDailyResearch ?? 15;
        enabled = settings.autoResearchEnabled ?? true;
        if (settings.maxAgentCredits) {
          maxCredits = settings.maxAgentCredits;
        }
      }
    }

    if (!enabled) {
      return NextResponse.json({
        submitted: 0,
        researched: 0,
        errors: 0,
        threshold,
        remaining: 0,
        details: [],
        message: "Auto-research is disabled",
      });
    }

    // Count how many have been researched today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [dailyCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companyResearch)
      .where(gte(companyResearch.researchedAt, today));

    const researchedToday = dailyCount?.count ?? 0;
    const remainingBudget = Math.max(0, maxDaily - researchedToday);

    if (remainingBudget === 0) {
      return NextResponse.json({
        submitted: 0,
        researched: 0,
        errors: 0,
        threshold,
        remaining: 0,
        details: [],
        message: "Daily research cap reached",
      });
    }

    const limit = Math.min(BATCH_SIZE, remainingBudget);

    // Find filings with relevanceScore >= threshold, no existing research,
    // and no pending/completed research job (prevents duplicate submissions)
    const candidates = await db
      .select({
        filing: formDFilings,
        enrichment: filingEnrichments,
      })
      .from(formDFilings)
      .innerJoin(filingEnrichments, eq(formDFilings.id, filingEnrichments.filingId))
      .leftJoin(companyResearch, eq(formDFilings.id, companyResearch.filingId))
      .leftJoin(researchJobs, and(
        eq(formDFilings.id, researchJobs.filingId),
        sql`${researchJobs.status} IN ('pending', 'completed')`,
      ))
      .where(
        sql`${filingEnrichments.relevanceScore} >= ${threshold} AND ${companyResearch.id} IS NULL AND ${researchJobs.id} IS NULL`
      )
      .orderBy(sql`${filingEnrichments.relevanceScore} DESC`)
      .limit(limit);

    let submitted = 0;
    let errors = 0;
    const details: Array<{
      filingId: string;
      companyName: string;
      status: string;
      agentId?: string;
      error?: string;
    }> = [];

    // Expire stale pending jobs so they don't block retries
    const staleCutoff = new Date(Date.now() - STALE_JOB_AGE_MS);
    await db
      .update(researchJobs)
      .set({ status: "failed", error: "Expired: pending too long", updatedAt: new Date() })
      .where(and(eq(researchJobs.status, "pending"), lt(researchJobs.createdAt, staleCutoff)));

    // Build webhook config
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://formd-scout.vercel.app";
    const webhook: WebhookConfig = {
      url: `${appUrl}/api/edgar/research/callback`,
      headers: { "x-api-key": INGEST_API_KEY! },
      metadata: {}, // filingId set per-job below
      events: ["completed", "failed"],
    };

    // Submit all agent jobs in parallel (fire-and-forget)
    const submissions = await Promise.allSettled(
      candidates.map(async ({ filing }) => {
        const researchInput: ResearchInput = {
          companyName: filing.companyName,
          industryGroup: filing.industryGroup,
          issuerCity: filing.issuerCity,
          issuerState: filing.issuerState,
          totalOffering: filing.totalOffering,
        };

        const jobWebhook: WebhookConfig = {
          ...webhook,
          metadata: { filingId: filing.id },
        };

        const { agentId, prompt } = await submitAgentJob(
          researchInput,
          undefined,
          maxCredits,
          jobWebhook,
        );

        await db
          .insert(researchJobs)
          .values({
            filingId: filing.id,
            agentId,
            status: "pending",
            prompt,
            maxCredits,
          });

        return { filing, agentId };
      })
    );

    for (let i = 0; i < submissions.length; i++) {
      const result = submissions[i]!;
      const filing = candidates[i]!.filing;

      if (result.status === "rejected") {
        errors++;
        details.push({
          filingId: filing.id,
          companyName: filing.companyName,
          status: "error",
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      } else {
        submitted++;
        details.push({
          filingId: filing.id,
          companyName: filing.companyName,
          status: "submitted",
          agentId: result.value.agentId,
        });
      }
    }

    return NextResponse.json({
      submitted,
      researched: 0,
      errors,
      threshold,
      remaining: remainingBudget - submitted,
      details,
    });
  } catch (error) {
    console.error("Batch research error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
