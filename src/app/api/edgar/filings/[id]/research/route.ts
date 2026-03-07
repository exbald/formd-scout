import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { submitAgentJob, checkAgentJob, type ResearchInput, type TeamProfileContext } from "@/lib/ai/research";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formDFilings, companyResearch, teamProfiles, appSettings, researchJobs } from "@/lib/schema";

const INGEST_API_KEY = process.env.INGEST_API_KEY;

function validateApiKey(authHeader: string | null): boolean {
  if (!authHeader || !INGEST_API_KEY) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === INGEST_API_KEY;
}

/**
 * GET /api/edgar/filings/[id]/research
 *
 * Returns existing research data. If no research exists but there is a
 * pending agent job, it polls Firecrawl for the result and saves it.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check for completed research first
    const [existing] = await db
      .select()
      .from(companyResearch)
      .where(eq(companyResearch.filingId, id))
      .limit(1);

    if (existing) {
      return NextResponse.json({ research: existing });
    }

    // Check for a pending agent job
    const [pendingJob] = await db
      .select()
      .from(researchJobs)
      .where(and(eq(researchJobs.filingId, id), eq(researchJobs.status, "pending")))
      .limit(1);

    if (!pendingJob) {
      return NextResponse.json({ error: "Research not found for this filing" }, { status: 404 });
    }

    // Poll Firecrawl for the agent job status
    const jobStatus = await checkAgentJob(pendingJob.agentId);

    if (jobStatus.status === "pending") {
      return NextResponse.json({ status: "researching", jobId: pendingJob.id });
    }

    if (jobStatus.status === "failed") {
      await db
        .update(researchJobs)
        .set({ status: "failed", error: jobStatus.error, updatedAt: new Date() })
        .where(eq(researchJobs.id, pendingJob.id));
      return NextResponse.json({ error: jobStatus.error ?? "Research failed" }, { status: 500 });
    }

    // Job completed — save the research data
    const data = jobStatus.data!;

    const insertValues = {
      filingId: id,
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
        email: lt.email ?? null,
        linkedinUrl: lt.linkedinUrl ?? null,
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
      researchPrompt: pendingJob.prompt,
      creditsUsed: jobStatus.creditsUsed,
      source: "firecrawl",
    };

    const inserted = await db.insert(companyResearch).values(insertValues).returning();

    // Mark job as completed
    await db
      .update(researchJobs)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(researchJobs.id, pendingJob.id));

    return NextResponse.json({ research: inserted[0] });
  } catch (error) {
    console.error("Error fetching research:", error);
    return NextResponse.json({ error: "Failed to fetch research" }, { status: 500 });
  }
}

/**
 * POST /api/edgar/filings/[id]/research
 *
 * Submits a Firecrawl agent job and returns immediately. The frontend
 * then polls the GET endpoint until the research is ready.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  const authHeader = req.headers.get("x-api-key") || req.headers.get("authorization");
  const isValidApiKey = validateApiKey(authHeader);

  if (!session && !isValidApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.FIRECRAWL_API_KEY) {
    return NextResponse.json(
      { error: "FIRECRAWL_API_KEY environment variable is not configured" },
      { status: 500 }
    );
  }

  const { id } = await params;

  try {
    const filings = await db.select().from(formDFilings).where(eq(formDFilings.id, id)).limit(1);
    const filing = filings[0];

    if (!filing) {
      return NextResponse.json({ error: "Filing not found" }, { status: 404 });
    }

    // Check for an already-pending job
    const [pendingJob] = await db
      .select()
      .from(researchJobs)
      .where(and(eq(researchJobs.filingId, id), eq(researchJobs.status, "pending")))
      .limit(1);

    if (pendingJob) {
      return NextResponse.json({ status: "researching", jobId: pendingJob.id });
    }

    // Delete existing research if re-researching
    const existingResearch = await db
      .select()
      .from(companyResearch)
      .where(eq(companyResearch.filingId, id))
      .limit(1);

    if (existingResearch[0]) {
      await db.delete(companyResearch).where(eq(companyResearch.filingId, id));
    }

    // Load team profile and settings when authenticated via session
    let teamProfileContext: TeamProfileContext | undefined;
    let maxCredits = 2000;

    if (session) {
      const [profile] = await db
        .select()
        .from(teamProfiles)
        .where(eq(teamProfiles.userId, session.user.id))
        .limit(1);

      if (profile) {
        teamProfileContext = {
          teamName: profile.teamName,
          companyName: profile.companyName,
          expertise: profile.expertise,
          targetMarkets: profile.targetMarkets,
          targetIndustries: profile.targetIndustries,
          idealCompanyProfile: profile.idealCompanyProfile,
        };
      }

      const [settings] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.userId, session.user.id))
        .limit(1);

      if (settings?.maxAgentCredits) {
        maxCredits = settings.maxAgentCredits;
      }
    }

    const researchInput: ResearchInput = {
      companyName: filing.companyName,
      industryGroup: filing.industryGroup,
      issuerCity: filing.issuerCity,
      issuerState: filing.issuerState,
      totalOffering: filing.totalOffering,
    };

    // Submit the agent job (returns immediately)
    const { agentId, prompt } = await submitAgentJob(researchInput, teamProfileContext, maxCredits);

    // Store the job in the database
    const inserted = await db
      .insert(researchJobs)
      .values({
        filingId: id,
        agentId,
        status: "pending",
        prompt,
        maxCredits,
      })
      .returning();

    return NextResponse.json({ status: "researching", jobId: inserted[0]!.id });
  } catch (error) {
    console.error("Research submit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
