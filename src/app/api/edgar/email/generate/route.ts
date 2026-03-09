import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { generateEmailDraft, type EmailGenerationInput } from "@/lib/ai/email-generator";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formDFilings,
  filingEnrichments,
  companyResearch,
  teamProfiles,
  emailDrafts,
} from "@/lib/schema";

export async function POST(req: NextRequest) {
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

  try {
    const body = await req.json();
    const { filingId, recipientName, recipientTitle, tone } = body;

    if (!filingId) {
      return NextResponse.json({ error: "filingId is required" }, { status: 400 });
    }

    const [filing] = await db
      .select()
      .from(formDFilings)
      .where(eq(formDFilings.id, filingId))
      .limit(1);
    if (!filing) {
      return NextResponse.json({ error: "Filing not found" }, { status: 404 });
    }

    const [enrichment] = await db
      .select()
      .from(filingEnrichments)
      .where(eq(filingEnrichments.filingId, filingId))
      .limit(1);

    const [research] = await db
      .select()
      .from(companyResearch)
      .where(eq(companyResearch.filingId, filingId))
      .limit(1);

    const [teamProfile] = await db
      .select()
      .from(teamProfiles)
      .where(eq(teamProfiles.userId, session.user.id))
      .limit(1);

    const emailInput: EmailGenerationInput = {
      filing: {
        companyName: filing.companyName,
        totalOffering: filing.totalOffering,
        industryGroup: filing.industryGroup,
        issuerCity: filing.issuerCity,
        issuerState: filing.issuerState,
        filingDate: filing.filingDate,
      },
      enrichment: enrichment
        ? {
            companySummary: enrichment.companySummary,
            relevanceScore: enrichment.relevanceScore,
            growthSignals: enrichment.growthSignals,
            competitors: enrichment.competitors,
          }
        : null,
      research: research
        ? {
            websiteSummary: research.websiteSummary,
            jobPostingsCount: research.jobPostingsCount,
            leadershipTeam: research.leadershipTeam,
          }
        : null,
      teamProfile: teamProfile
        ? {
            teamName: teamProfile.teamName,
            companyName: teamProfile.companyName,
            keyClients: teamProfile.keyClients,
            teamBio: teamProfile.teamBio,
            expertise: teamProfile.expertise,
            emailSignature: teamProfile.emailSignature,
            emailTone: teamProfile.emailTone,
          }
        : null,
      overrides: {
        recipientName,
        recipientTitle,
        tone,
      },
    };

    const result = await generateEmailDraft(emailInput);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error ?? "Failed to generate email" },
        { status: 500 }
      );
    }

    const draft = result.data;

    const existingDrafts = await db
      .select()
      .from(emailDrafts)
      .where(and(eq(emailDrafts.filingId, filingId), eq(emailDrafts.userId, session.user.id)))
      .limit(1);

    let savedDraft;
    if (existingDrafts[0]) {
      const [updated] = await db
        .update(emailDrafts)
        .set({
          recipientName: recipientName || null,
          recipientTitle: recipientTitle || null,
          subject: draft.subject,
          body: draft.body,
          followUpSequence: draft.followUps,
          referencedClients: draft.referencedClients,
          status: "draft",
          updatedAt: new Date(),
        })
        .where(eq(emailDrafts.id, existingDrafts[0]!.id))
        .returning();
      savedDraft = updated;
    } else {
      const leadership = research?.leadershipTeam?.[0];
      const [inserted] = await db
        .insert(emailDrafts)
        .values({
          filingId,
          userId: session.user.id,
          recipientName: recipientName || leadership?.name || null,
          recipientTitle: recipientTitle || leadership?.title || null,
          subject: draft.subject,
          body: draft.body,
          followUpSequence: draft.followUps,
          referencedClients: draft.referencedClients,
          status: "draft",
        })
        .returning();
      savedDraft = inserted;
    }

    return NextResponse.json({
      success: true,
      draft: {
        ...savedDraft,
        companyName: filing.companyName,
      },
    });
  } catch (error) {
    console.error("Email generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
