import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamProfiles } from "@/lib/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await db
      .select()
      .from(teamProfiles)
      .where(eq(teamProfiles.userId, session.user.id))
      .limit(1);

    return NextResponse.json({ profile: profile[0] || null });
  } catch (error) {
    console.error("Error fetching team profile:", error);
    return NextResponse.json({ error: "Failed to fetch team profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      teamName,
      companyName,
      keyClients,
      teamBio,
      expertise,
      targetMarkets,
      targetIndustries,
      idealCompanyProfile,
      scoringCriteria,
      emailSignature,
      emailTone,
    } = body;

    const existing = await db
      .select()
      .from(teamProfiles)
      .where(eq(teamProfiles.userId, session.user.id))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Team profile already exists. Use PUT to update." },
        { status: 409 }
      );
    }

    const newProfile = await db
      .insert(teamProfiles)
      .values({
        userId: session.user.id,
        teamName: teamName || null,
        companyName: companyName || null,
        keyClients: keyClients || null,
        teamBio: teamBio || null,
        expertise: expertise || null,
        targetMarkets: targetMarkets || null,
        targetIndustries: targetIndustries || null,
        idealCompanyProfile: idealCompanyProfile || null,
        scoringCriteria: scoringCriteria || null,
        emailSignature: emailSignature || null,
        emailTone: emailTone || null,
      })
      .returning();

    return NextResponse.json({ profile: newProfile[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating team profile:", error);
    return NextResponse.json({ error: "Failed to create team profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      teamName,
      companyName,
      keyClients,
      teamBio,
      expertise,
      targetMarkets,
      targetIndustries,
      idealCompanyProfile,
      scoringCriteria,
      emailSignature,
      emailTone,
    } = body;

    const existing = await db
      .select()
      .from(teamProfiles)
      .where(eq(teamProfiles.userId, session.user.id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Team profile not found. Use POST to create." },
        { status: 404 }
      );
    }

    const updated = await db
      .update(teamProfiles)
      .set({
        teamName: teamName ?? existing[0]!.teamName,
        companyName: companyName ?? existing[0]!.companyName,
        keyClients: keyClients ?? existing[0]!.keyClients,
        teamBio: teamBio ?? existing[0]!.teamBio,
        expertise: expertise ?? existing[0]!.expertise,
        targetMarkets: targetMarkets ?? existing[0]!.targetMarkets,
        targetIndustries: targetIndustries ?? existing[0]!.targetIndustries,
        idealCompanyProfile: idealCompanyProfile ?? existing[0]!.idealCompanyProfile,
        scoringCriteria: scoringCriteria ?? existing[0]!.scoringCriteria,
        emailSignature: emailSignature ?? existing[0]!.emailSignature,
        emailTone: emailTone ?? existing[0]!.emailTone,
        updatedAt: new Date(),
      })
      .where(eq(teamProfiles.userId, session.user.id))
      .returning();

    return NextResponse.json({ profile: updated[0] });
  } catch (error) {
    console.error("Error updating team profile:", error);
    return NextResponse.json({ error: "Failed to update team profile" }, { status: 500 });
  }
}
