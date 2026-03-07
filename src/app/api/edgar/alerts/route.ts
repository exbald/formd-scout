import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { alertConfigs } from "@/lib/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const alerts = await db
      .select()
      .from(alertConfigs)
      .where(eq(alertConfigs.userId, session.user.id))
      .orderBy(alertConfigs.createdAt);

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
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
      name,
      minRelevanceScore,
      states,
      industries,
      minOffering,
      emailEnabled,
      emailAddress,
      webhookUrl,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [alert] = await db
      .insert(alertConfigs)
      .values({
        userId: session.user.id,
        name,
        minRelevanceScore: minRelevanceScore ?? null,
        states: states ?? null,
        industries: industries ?? null,
        minOffering: minOffering ?? null,
        emailEnabled: emailEnabled ?? false,
        emailAddress: emailAddress ?? null,
        webhookUrl: webhookUrl ?? null,
      })
      .returning();

    return NextResponse.json({ alert });
  } catch (error) {
    console.error("Error creating alert:", error);
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Alert ID is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(alertConfigs)
      .set({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.minRelevanceScore !== undefined && {
          minRelevanceScore: updates.minRelevanceScore,
        }),
        ...(updates.states !== undefined && { states: updates.states }),
        ...(updates.industries !== undefined && { industries: updates.industries }),
        ...(updates.minOffering !== undefined && { minOffering: updates.minOffering }),
        ...(updates.emailEnabled !== undefined && { emailEnabled: updates.emailEnabled }),
        ...(updates.emailAddress !== undefined && { emailAddress: updates.emailAddress }),
        ...(updates.webhookUrl !== undefined && { webhookUrl: updates.webhookUrl }),
        ...(updates.isActive !== undefined && { isActive: updates.isActive }),
      })
      .where(
        and(eq(alertConfigs.id, id), eq(alertConfigs.userId, session.user.id))
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json({ alert: updated });
  } catch (error) {
    console.error("Error updating alert:", error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Alert ID is required" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(alertConfigs)
      .where(
        and(eq(alertConfigs.id, id), eq(alertConfigs.userId, session.user.id))
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json({ error: "Failed to delete alert" }, { status: 500 });
  }
}
