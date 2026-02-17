import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { sql, gte, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments } from "@/lib/schema";

/**
 * Helper to format a Date as YYYY-MM-DD string.
 */
function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * GET /api/edgar/stats
 *
 * Returns dashboard summary statistics by querying PostgreSQL via Drizzle ORM.
 * Includes: today/thisWeek/thisMonth counts and totals, topIndustries,
 * topStates, averageOffering, and highRelevanceCount.
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
    // Get current date boundaries for PostgreSQL
    const today = new Date();
    const todayStr = toDateStr(today);

    // Start of week (Monday)
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - mondayOffset);
    const weekStartStr = toDateStr(weekStart);

    // Start of month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = toDateStr(monthStart);

    // 14 days ago for chart
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 14);
    const fourteenDaysAgoStr = toDateStr(fourteenDaysAgo);

    // Run all queries in parallel for performance
    const [
      todayResult,
      weekResult,
      monthResult,
      highRelevanceResult,
      avgOfferingResult,
      topIndustriesResult,
      topStatesResult,
      dailyCountsResult,
    ] = await Promise.all([
      // Today's filings count and total offering
      db
        .select({
          count: sql<number>`count(*)::int`,
          totalAmount: sql<string>`coalesce(sum(${formDFilings.totalOffering}), 0)::text`,
        })
        .from(formDFilings)
        .where(eq(formDFilings.filingDate, todayStr)),

      // This week's filings count and total offering
      db
        .select({
          count: sql<number>`count(*)::int`,
          totalAmount: sql<string>`coalesce(sum(${formDFilings.totalOffering}), 0)::text`,
        })
        .from(formDFilings)
        .where(gte(formDFilings.filingDate, weekStartStr)),

      // This month's filings count and total offering
      db
        .select({
          count: sql<number>`count(*)::int`,
          totalAmount: sql<string>`coalesce(sum(${formDFilings.totalOffering}), 0)::text`,
        })
        .from(formDFilings)
        .where(gte(formDFilings.filingDate, monthStartStr)),

      // High relevance count (score >= 60)
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(filingEnrichments)
        .where(
          sql`${filingEnrichments.relevanceScore} >= 60`
        ),

      // Average offering amount (across all filings with non-null totalOffering)
      db
        .select({
          avg: sql<string>`coalesce(avg(${formDFilings.totalOffering}), 0)::text`,
        })
        .from(formDFilings),

      // Top 5 industries by filing count
      db
        .select({
          industry: formDFilings.industryGroup,
          count: sql<number>`count(*)::int`,
        })
        .from(formDFilings)
        .where(sql`${formDFilings.industryGroup} IS NOT NULL`)
        .groupBy(formDFilings.industryGroup)
        .orderBy(sql`count(*) DESC`)
        .limit(5),

      // Top 5 states by filing count
      db
        .select({
          state: formDFilings.issuerState,
          count: sql<number>`count(*)::int`,
        })
        .from(formDFilings)
        .where(sql`${formDFilings.issuerState} IS NOT NULL`)
        .groupBy(formDFilings.issuerState)
        .orderBy(sql`count(*) DESC`)
        .limit(5),

      // Daily filing counts for last 14 days (for chart)
      db
        .select({
          date: formDFilings.filingDate,
          count: sql<number>`count(*)::int`,
        })
        .from(formDFilings)
        .where(gte(formDFilings.filingDate, fourteenDaysAgoStr))
        .groupBy(formDFilings.filingDate)
        .orderBy(formDFilings.filingDate),
    ]);

    return NextResponse.json({
      today: {
        count: todayResult[0]?.count ?? 0,
        totalAmount: todayResult[0]?.totalAmount ?? "0",
      },
      thisWeek: {
        count: weekResult[0]?.count ?? 0,
        totalAmount: weekResult[0]?.totalAmount ?? "0",
      },
      thisMonth: {
        count: monthResult[0]?.count ?? 0,
        totalAmount: monthResult[0]?.totalAmount ?? "0",
      },
      highRelevanceCount: highRelevanceResult[0]?.count ?? 0,
      averageOffering: avgOfferingResult[0]?.avg ?? "0",
      topIndustries: topIndustriesResult,
      topStates: topStatesResult,
      dailyCounts: dailyCountsResult,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
