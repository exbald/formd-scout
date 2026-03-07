import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companyResearch, formDFilings } from "@/lib/schema";

const INGEST_API_KEY = process.env.INGEST_API_KEY;

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || !INGEST_API_KEY || apiKey !== INGEST_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { filingId, data } = body;

    if (!filingId || !data) {
      return NextResponse.json(
        { error: "filingId and data are required" },
        { status: 400 }
      );
    }

    // Verify the referenced filing exists
    const [filing] = await db
      .select({ id: formDFilings.id })
      .from(formDFilings)
      .where(eq(formDFilings.id, filingId))
      .limit(1);

    if (!filing) {
      return NextResponse.json({ error: "Filing not found" }, { status: 404 });
    }

    // Check for existing research record
    const [existing] = await db
      .select()
      .from(companyResearch)
      .where(eq(companyResearch.filingId, filingId))
      .limit(1);

    if (!existing) {
      // No existing research -- insert a new record with source "n8n"
      const inserted = await db
        .insert(companyResearch)
        .values({
          filingId,
          websiteUrl: data.websiteUrl ?? null,
          websiteSummary: data.websiteSummary ?? null,
          jobPostings: data.jobPostings ?? null,
          jobPostingsCount: data.jobPostingsCount ?? null,
          leadershipTeam: data.leadershipTeam ?? null,
          officeLocations: data.officeLocations ?? null,
          techStack: data.techStack ?? null,
          recentNews: data.recentNews ?? null,
          employeeEstimate: data.employeeEstimate ?? null,
          fundingHistory: data.fundingHistory ?? null,
          growthSignals: data.growthSignals ?? null,
          companySize: data.companySize ?? null,
          socialProfiles: data.socialProfiles ?? null,
          source: "n8n",
        })
        .returning();

      return NextResponse.json({
        success: true,
        action: "created",
        research: inserted[0],
      });
    }

    // Merge incoming n8n data with existing research.
    // Strategy: n8n data fills nulls/empty values but never overwrites existing data.
    const merged: Record<string, unknown> = {};

    // Simple scalar fields: only fill when existing value is null/empty
    if (!existing.websiteUrl && data.websiteUrl)
      merged.websiteUrl = data.websiteUrl;
    if (!existing.websiteSummary && data.websiteSummary)
      merged.websiteSummary = data.websiteSummary;
    if (existing.employeeEstimate === null && data.employeeEstimate != null)
      merged.employeeEstimate = data.employeeEstimate;
    if (existing.jobPostingsCount === null && data.jobPostingsCount != null)
      merged.jobPostingsCount = data.jobPostingsCount;
    if (!existing.companySize && data.companySize)
      merged.companySize = data.companySize;

    // Leadership team: merge by name -- add new people, fill missing contact info on existing people
    if (data.leadershipTeam?.length) {
      const existingTeam = existing.leadershipTeam ?? [];
      const mergedTeam = [...existingTeam];

      for (const newMember of data.leadershipTeam) {
        const existingIdx = mergedTeam.findIndex(
          (m) => m.name.toLowerCase() === newMember.name.toLowerCase()
        );

        if (existingIdx >= 0) {
          // Person already exists -- fill in missing email/linkedin only
          const current = mergedTeam[existingIdx]!;
          if (!current.email && newMember.email)
            current.email = newMember.email;
          if (!current.linkedinUrl && newMember.linkedinUrl)
            current.linkedinUrl = newMember.linkedinUrl;
        } else {
          mergedTeam.push(newMember);
        }
      }

      merged.leadershipTeam = mergedTeam;
    }

    // String arrays: concatenate and deduplicate
    if (data.techStack?.length) {
      const combined = [...(existing.techStack ?? []), ...data.techStack];
      merged.techStack = [...new Set(combined)];
    }
    if (data.growthSignals?.length) {
      const combined = [...(existing.growthSignals ?? []), ...data.growthSignals];
      merged.growthSignals = [...new Set(combined)];
    }

    // Object arrays: only fill when existing is null/empty (no deep merge)
    if (
      data.officeLocations?.length &&
      (!existing.officeLocations || existing.officeLocations.length === 0)
    ) {
      merged.officeLocations = data.officeLocations;
    }
    if (
      data.fundingHistory?.length &&
      (!existing.fundingHistory || existing.fundingHistory.length === 0)
    ) {
      merged.fundingHistory = data.fundingHistory;
    }
    if (
      data.recentNews?.length &&
      (!existing.recentNews || existing.recentNews.length === 0)
    ) {
      merged.recentNews = data.recentNews;
    }

    // Social profiles: fill individual null fields
    if (data.socialProfiles) {
      const existingSocial = existing.socialProfiles ?? {
        linkedin: null,
        twitter: null,
        crunchbase: null,
      };
      merged.socialProfiles = {
        linkedin:
          existingSocial.linkedin ?? data.socialProfiles.linkedin ?? null,
        twitter: existingSocial.twitter ?? data.socialProfiles.twitter ?? null,
        crunchbase:
          existingSocial.crunchbase ?? data.socialProfiles.crunchbase ?? null,
      };
    }

    // Nothing to update -- return early
    if (Object.keys(merged).length === 0) {
      return NextResponse.json({
        success: true,
        action: "no_changes",
        research: existing,
      });
    }

    const updated = await db
      .update(companyResearch)
      .set(merged)
      .where(eq(companyResearch.id, existing.id))
      .returning();

    return NextResponse.json({
      success: true,
      action: "merged",
      research: updated[0],
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
