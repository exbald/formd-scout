import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/schema";

const DEFAULT_SETTINGS = {
  autoResearchThreshold: 60,
  autoResearchEnabled: true,
  maxDailyResearch: 15,
  maxAgentCredits: 500,
};

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.userId, session.user.id))
      .limit(1);

    if (settings.length === 0) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS });
    }

    return NextResponse.json({ settings: settings[0] });
  } catch (error) {
    console.error("Error fetching app settings:", error);
    return NextResponse.json({ error: "Failed to fetch app settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { autoResearchThreshold, autoResearchEnabled, maxDailyResearch, maxAgentCredits } = body;

    const existing = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.userId, session.user.id))
      .limit(1);

    if (existing.length === 0) {
      const newSettings = await db
        .insert(appSettings)
        .values({
          userId: session.user.id,
          autoResearchThreshold: autoResearchThreshold ?? 60,
          autoResearchEnabled: autoResearchEnabled ?? true,
          maxDailyResearch: maxDailyResearch ?? 15,
          maxAgentCredits: maxAgentCredits ?? 500,
        })
        .returning();

      return NextResponse.json({ settings: newSettings[0] });
    }

    const updated = await db
      .update(appSettings)
      .set({
        autoResearchThreshold: autoResearchThreshold ?? existing[0]!.autoResearchThreshold,
        autoResearchEnabled: autoResearchEnabled ?? existing[0]!.autoResearchEnabled,
        maxDailyResearch: maxDailyResearch ?? existing[0]!.maxDailyResearch,
        maxAgentCredits: maxAgentCredits ?? existing[0]!.maxAgentCredits,
        updatedAt: new Date(),
      })
      .where(eq(appSettings.userId, session.user.id))
      .returning();

    return NextResponse.json({ settings: updated[0] });
  } catch (error) {
    console.error("Error updating app settings:", error);
    return NextResponse.json({ error: "Failed to update app settings" }, { status: 500 });
  }
}
