import { NextRequest, NextResponse } from "next/server";
import { sql, gte, eq, and, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { formDFilings, filingEnrichments } from "@/lib/schema";

/** Alias tables for dual-join per-user enrichment strategy in stats. */
const userEnrich = alias(filingEnrichments, "user_enrich");
const sysEnrich = alias(filingEnrichments, "sys_enrich");

/**
 * Helper to format a Date as YYYY-MM-DD string.
 */
function toDateStr(d: Date): string {
  // Use UTC to match the UTC-based dates stored from the SEC EDGAR API (toISOString)
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * GET /api/edgar/stats
 *
 * Returns dashboard summary statistics by querying PostgreSQL via Drizzle ORM.
 * Includes: today/thisWeek/thisMonth counts and totals, topIndustries,
 * topStates, averageOffering, and highRelevanceCount.
 *
 * Auth: Public — no authentication required.
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  try {
    // Get current date boundaries for PostgreSQL
    const today = new Date();
    const todayStr = toDateStr(today);

    // Rolling 7-day window (more useful than calendar week — avoids Monday showing 0)
    const weekStart = new Date(today);
    weekStart.setUTCDate(today.getUTCDate() - 6);
    const weekStartStr = toDateStr(weekStart);

    // Start of month (UTC)
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const monthStartStr = toDateStr(monthStart);

    // 14 days ago for chart (UTC)
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setUTCDate(today.getUTCDate() - 14);
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

      // High relevance count (score >= 60, last 7 days).
      // When userId is provided, prefer user-specific enrichment scores via dual join with COALESCE.
      userId
        ? db
            .select({
              count: sql<number>`count(*)::int`,
            })
            .from(formDFilings)
            .leftJoin(
              userEnrich,
              and(
                eq(formDFilings.id, userEnrich.filingId),
                eq(userEnrich.userId, userId)
              )
            )
            .leftJoin(
              sysEnrich,
              and(
                eq(formDFilings.id, sysEnrich.filingId),
                isNull(sysEnrich.userId)
              )
            )
            .where(
              sql`COALESCE(${userEnrich.relevanceScore}, ${sysEnrich.relevanceScore}) >= 60
                AND ${formDFilings.filingDate} >= ${weekStartStr}`
            )
        : db
            .select({
              count: sql<number>`count(*)::int`,
            })
            .from(filingEnrichments)
            .innerJoin(formDFilings, sql`${filingEnrichments.filingId} = ${formDFilings.id}`)
            .where(
              sql`${filingEnrichments.relevanceScore} >= 60
                AND ${filingEnrichments.userId} IS NULL
                AND ${formDFilings.filingDate} >= ${weekStartStr}`
            ),

      // Average offering amount (last 7 days)
      db
        .select({
          avg: sql<string>`coalesce(avg(${formDFilings.totalOffering}), 0)::text`,
        })
        .from(formDFilings)
        .where(gte(formDFilings.filingDate, weekStartStr)),

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
    return NextResponse.json({ error: "Failed to fetch statistics" }, { status: 500 });
  }
}
