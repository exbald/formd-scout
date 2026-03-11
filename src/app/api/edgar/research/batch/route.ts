import { NextRequest, NextResponse } from "next/server";
import { eq, gte, and, sql } from "drizzle-orm";
import {
  submitAgentJob,
  checkAgentJob,
  type ResearchInput,
  type AgentJobStatus,
} from "@/lib/ai/research";
import { db } from "@/lib/db";
import {
  formDFilings,
  filingEnrichments,
  companyResearch,
  appSettings,
  researchJobs,
} from "@/lib/schema";

export const maxDuration = 300;

const INGEST_API_KEY = process.env.INGEST_API_KEY;
const BATCH_SIZE = 5;

/** Maximum time (ms) to wait for a single agent job before giving up. */
const AGENT_TIMEOUT_MS = 120_000;
/** Interval (ms) between polling attempts for a pending agent job. */
const POLL_INTERVAL_MS = 5_000;

/**
 * Sleep helper that returns a promise resolving after the given milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll a Firecrawl agent job until it completes, fails, or the timeout is
 * exceeded. Returns the final job status.
 */
async function pollAgentJob(agentId: string): Promise<AgentJobStatus> {
  const deadline = Date.now() + AGENT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const status = await checkAgentJob(agentId);

    if (status.status !== "pending") {
      return status;
    }

    // Wait before the next poll, but respect the deadline
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(POLL_INTERVAL_MS, remaining));
  }

  return { status: "failed", error: "Agent job timed out after 120 seconds" };
}

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
        researched: 0,
        errors: 0,
        threshold,
        remaining: 0,
        details: [],
        message: "Daily research cap reached",
      });
    }

    const limit = Math.min(BATCH_SIZE, remainingBudget);

    // Find filings with relevanceScore >= threshold and no existing research
    const candidates = await db
      .select({
        filing: formDFilings,
        enrichment: filingEnrichments,
      })
      .from(formDFilings)
      .innerJoin(filingEnrichments, eq(formDFilings.id, filingEnrichments.filingId))
      .leftJoin(companyResearch, eq(formDFilings.id, companyResearch.filingId))
      .where(
        sql`${filingEnrichments.relevanceScore} >= ${threshold} AND ${companyResearch.id} IS NULL`
      )
      .orderBy(sql`${filingEnrichments.relevanceScore} DESC`)
      .limit(limit);

    let researched = 0;
    let errors = 0;
    const details: Array<{
      filingId: string;
      companyName: string;
      status: string;
      error?: string;
    }> = [];

    for (const { filing } of candidates) {
      try {
        // Skip if there is already a pending job for this filing
        const [existingJob] = await db
          .select()
          .from(researchJobs)
          .where(and(eq(researchJobs.filingId, filing.id), eq(researchJobs.status, "pending")))
          .limit(1);

        if (existingJob) {
          details.push({
            filingId: filing.id,
            companyName: filing.companyName,
            status: "skipped",
            error: "Research job already pending",
          });
          continue;
        }

        const researchInput: ResearchInput = {
          companyName: filing.companyName,
          industryGroup: filing.industryGroup,
          issuerCity: filing.issuerCity,
          issuerState: filing.issuerState,
          totalOffering: filing.totalOffering,
        };

        // Submit the agent job to Firecrawl
        const { agentId, prompt } = await submitAgentJob(researchInput, undefined, maxCredits);

        // Track the job in the database
        const [job] = await db
          .insert(researchJobs)
          .values({
            filingId: filing.id,
            agentId,
            status: "pending",
            prompt,
            maxCredits,
          })
          .returning();

        // Poll until the agent completes, fails, or times out
        const jobStatus = await pollAgentJob(agentId);

        if (jobStatus.status === "failed" || !jobStatus.data) {
          const errorMessage = jobStatus.error ?? "Agent research failed";

          // Mark the job as failed in the database
          if (job) {
            await db
              .update(researchJobs)
              .set({ status: "failed", error: errorMessage, updatedAt: new Date() })
              .where(eq(researchJobs.id, job.id));
          }

          errors++;
          details.push({
            filingId: filing.id,
            companyName: filing.companyName,
            status: "error",
            error: errorMessage,
          });
          continue;
        }

        // Agent completed successfully — save research data
        const data = jobStatus.data;
        await db.insert(companyResearch).values({
          filingId: filing.id,
          websiteUrl: data.websiteUrl,
          websiteSummary: data.websiteSummary,
          jobPostings: data.jobPostings?.map((jp) => ({
            title: jp.title,
            location: jp.location,
            url: jp.url ?? null,
            datePosted: jp.datePosted ?? null,
          })),
          jobPostingsCount: data.jobPostingsCount,
          leadershipTeam: data.leadershipTeam?.map((lt) => ({
            name: lt.name,
            title: lt.title,
            linkedinUrl: lt.linkedinUrl ?? null,
            email: lt.email ?? null,
          })),
          officeLocations: data.officeLocations?.map((loc) => ({
            city: loc.city,
            state: loc.state,
            country: loc.country,
            type: loc.type,
          })),
          techStack: data.techStack,
          recentNews: data.recentNews?.map((news) => ({
            headline: news.headline,
            date: news.date,
            url: news.url ?? null,
            summary: news.summary,
          })),
          employeeEstimate: data.employeeEstimate,
          fundingHistory: data.fundingHistory,
          growthSignals: data.growthSignals,
          socialProfiles: data.socialProfiles,
          companySize: data.companySize ?? null,
          researchPrompt: prompt,
          creditsUsed: jobStatus.creditsUsed ?? null,
          source: "firecrawl",
        });

        // Mark the job as completed
        if (job) {
          await db
            .update(researchJobs)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(researchJobs.id, job.id));
        }

        researched++;
        details.push({
          filingId: filing.id,
          companyName: filing.companyName,
          status: "researched",
        });
      } catch (err) {
        errors++;
        details.push({
          filingId: filing.id,
          companyName: filing.companyName,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      researched,
      errors,
      threshold,
      remaining: remainingBudget - researched,
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
