import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailDrafts, formDFilings } from "@/lib/schema";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const conditions = [eq(emailDrafts.userId, session.user.id)];

    if (status && ["draft", "sent", "archived"].includes(status)) {
      conditions.push(eq(emailDrafts.status, status));
    }

    const drafts = await db
      .select({
        id: emailDrafts.id,
        filingId: emailDrafts.filingId,
        recipientName: emailDrafts.recipientName,
        recipientTitle: emailDrafts.recipientTitle,
        recipientEmail: emailDrafts.recipientEmail,
        subject: emailDrafts.subject,
        body: emailDrafts.body,
        followUpSequence: emailDrafts.followUpSequence,
        referencedClients: emailDrafts.referencedClients,
        status: emailDrafts.status,
        createdAt: emailDrafts.createdAt,
        updatedAt: emailDrafts.updatedAt,
        companyName: formDFilings.companyName,
        filingDate: formDFilings.filingDate,
      })
      .from(emailDrafts)
      .innerJoin(formDFilings, eq(emailDrafts.filingId, formDFilings.id))
      .where(and(...conditions))
      .orderBy(desc(emailDrafts.updatedAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailDrafts)
      .where(and(...conditions));

    const total = countResult[0]?.count ?? 0;

    return NextResponse.json({
      drafts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching drafts:", error);
    return NextResponse.json({ error: "Failed to fetch drafts" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id,
      subject,
      body: emailBody,
      status,
      recipientName,
      recipientTitle,
      recipientEmail,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(emailDrafts)
      .where(and(eq(emailDrafts.id, id), eq(emailDrafts.userId, session.user.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (subject !== undefined) updates.subject = subject;
    if (emailBody !== undefined) updates.body = emailBody;
    if (status !== undefined && ["draft", "sent", "archived"].includes(status)) {
      updates.status = status;
    }
    if (recipientName !== undefined) updates.recipientName = recipientName;
    if (recipientTitle !== undefined) updates.recipientTitle = recipientTitle;
    if (recipientEmail !== undefined) updates.recipientEmail = recipientEmail;

    const [updated] = await db
      .update(emailDrafts)
      .set(updates)
      .where(eq(emailDrafts.id, id))
      .returning();

    const [filing] = await db
      .select({ companyName: formDFilings.companyName })
      .from(formDFilings)
      .where(eq(formDFilings.id, existing.filingId))
      .limit(1);

    return NextResponse.json({
      draft: {
        ...updated,
        companyName: filing?.companyName || null,
      },
    });
  } catch (error) {
    console.error("Error updating draft:", error);
    return NextResponse.json({ error: "Failed to update draft" }, { status: 500 });
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
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(emailDrafts)
      .where(and(eq(emailDrafts.id, id), eq(emailDrafts.userId, session.user.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    await db.delete(emailDrafts).where(eq(emailDrafts.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting draft:", error);
    return NextResponse.json({ error: "Failed to delete draft" }, { status: 500 });
  }
}
