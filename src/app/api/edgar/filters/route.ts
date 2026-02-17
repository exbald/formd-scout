import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedFilters } from "@/lib/schema";

/**
 * GET /api/edgar/filters
 *
 * Returns all saved filters for the authenticated user.
 *
 * Auth: Requires authenticated session via Better Auth.
 */
export async function GET() {
  // Verify authentication
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const filters = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.userId, session.user.id))
      .orderBy(savedFilters.createdAt);

    return NextResponse.json({ filters });
  } catch (error) {
    console.error("Error fetching saved filters:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved filters" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/edgar/filters
 *
 * Creates a new saved filter for the authenticated user.
 *
 * Body:
 * - filterName: string (required)
 * - minOffering: number | null
 * - maxOffering: number | null
 * - industryGroups: string[] | null
 * - states: string[] | null
 * - minRelevance: number | null
 * - isDefault: boolean (optional, defaults to false)
 *
 * Auth: Requires authenticated session via Better Auth.
 */
export async function POST(req: NextRequest) {
  // Verify authentication
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      filterName,
      minOffering,
      maxOffering,
      industryGroups,
      states,
      minRelevance,
      isDefault,
    } = body;

    if (!filterName || typeof filterName !== "string") {
      return NextResponse.json(
        { error: "filterName is required" },
        { status: 400 }
      );
    }

    const newFilter = await db
      .insert(savedFilters)
      .values({
        userId: session.user.id,
        filterName: filterName.trim(),
        minOffering: minOffering ? String(minOffering) : null,
        maxOffering: maxOffering ? String(maxOffering) : null,
        industryGroups: industryGroups || null,
        states: states || null,
        minRelevance: minRelevance || null,
        isDefault: isDefault || false,
      })
      .returning();

    return NextResponse.json({ filter: newFilter[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating saved filter:", error);
    return NextResponse.json(
      { error: "Failed to create saved filter" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/edgar/filters?id=uuid
 *
 * Deletes a saved filter for the authenticated user.
 *
 * Auth: Requires authenticated session via Better Auth.
 * The filter must belong to the authenticated user.
 */
export async function DELETE(req: NextRequest) {
  // Verify authentication
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filterId = req.nextUrl.searchParams.get("id");

  if (!filterId) {
    return NextResponse.json(
      { error: "Filter ID is required" },
      { status: 400 }
    );
  }

  try {
    // Delete only if the filter belongs to the authenticated user
    const result = await db
      .delete(savedFilters)
      .where(
        and(
          eq(savedFilters.id, filterId),
          eq(savedFilters.userId, session.user.id)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Filter not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, filter: result[0] });
  } catch (error) {
    console.error("Error deleting saved filter:", error);
    return NextResponse.json(
      { error: "Failed to delete saved filter" },
      { status: 500 }
    );
  }
}
