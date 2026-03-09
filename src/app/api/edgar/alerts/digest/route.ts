import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  formDFilings,
  filingEnrichments,
  alertConfigs,
  alertHistory,
} from "@/lib/schema";

export const maxDuration = 300;

const INGEST_API_KEY = process.env.INGEST_API_KEY;

interface MatchedFiling {
  filingId: string;
  companyName: string;
  relevanceScore: number | null;
  totalOffering: string | null;
  issuerState: string | null;
  industryGroup: string | null;
  companySummary: string | null;
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || !INGEST_API_KEY || apiKey !== INGEST_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get filings from the last 24 hours with enrichments
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentFilings = await db
      .select({
        filingId: formDFilings.id,
        companyName: formDFilings.companyName,
        totalOffering: formDFilings.totalOffering,
        issuerState: formDFilings.issuerState,
        industryGroup: formDFilings.industryGroup,
        relevanceScore: filingEnrichments.relevanceScore,
        companySummary: filingEnrichments.companySummary,
      })
      .from(formDFilings)
      .innerJoin(filingEnrichments, eq(formDFilings.id, filingEnrichments.filingId))
      .where(gte(formDFilings.createdAt, yesterday));

    // Get all active alert configs
    const activeAlerts = await db
      .select()
      .from(alertConfigs)
      .where(eq(alertConfigs.isActive, true));

    let alertsSent = 0;
    let filingsMatched = 0;
    const details: Array<{
      alertName: string;
      matchedFilings: number;
      emailSent: boolean;
    }> = [];

    for (const alert of activeAlerts) {
      const matched = recentFilings.filter((filing) => matchesAlert(filing, alert));

      if (matched.length === 0) {
        details.push({
          alertName: alert.name,
          matchedFilings: 0,
          emailSent: false,
        });
        continue;
      }

      // Filter out already-sent alerts
      const newMatches: MatchedFiling[] = [];
      for (const filing of matched) {
        const [existing] = await db
          .select()
          .from(alertHistory)
          .where(
            and(
              eq(alertHistory.alertConfigId, alert.id),
              eq(alertHistory.filingId, filing.filingId)
            )
          )
          .limit(1);

        if (!existing) {
          newMatches.push(filing);
        }
      }

      if (newMatches.length === 0) {
        details.push({
          alertName: alert.name,
          matchedFilings: 0,
          emailSent: false,
        });
        continue;
      }

      filingsMatched += newMatches.length;
      let emailSent = false;

      // Send email if enabled
      if (alert.emailEnabled && alert.emailAddress && process.env.RESEND_API_KEY) {
        try {
          await sendAlertEmail(alert.emailAddress, alert.name, newMatches);
          emailSent = true;
        } catch (err) {
          console.error(`Failed to send alert email for "${alert.name}":`, err);
        }
      }

      // Record in alert history
      for (const filing of newMatches) {
        await db.insert(alertHistory).values({
          alertConfigId: alert.id,
          filingId: filing.filingId,
          channel: emailSent ? "email" : "webhook",
        });
      }

      alertsSent++;
      details.push({
        alertName: alert.name,
        matchedFilings: newMatches.length,
        emailSent,
      });
    }

    return NextResponse.json({
      alertsSent,
      filingsMatched,
      details,
    });
  } catch (error) {
    console.error("Alert digest error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function matchesAlert(
  filing: {
    relevanceScore: number | null;
    issuerState: string | null;
    industryGroup: string | null;
    totalOffering: string | null;
  },
  alert: typeof alertConfigs.$inferSelect
): boolean {
  // Check minimum relevance score
  if (
    alert.minRelevanceScore != null &&
    (filing.relevanceScore == null || filing.relevanceScore < alert.minRelevanceScore)
  ) {
    return false;
  }

  // Check states filter
  const states = alert.states as string[] | null;
  if (states && states.length > 0 && filing.issuerState) {
    if (!states.includes(filing.issuerState)) {
      return false;
    }
  }

  // Check industries filter
  const industries = alert.industries as string[] | null;
  if (industries && industries.length > 0 && filing.industryGroup) {
    const filingIndustry = filing.industryGroup.toLowerCase();
    if (!industries.some((ind) => filingIndustry.includes(ind.toLowerCase()))) {
      return false;
    }
  }

  // Check minimum offering
  if (alert.minOffering != null && filing.totalOffering != null) {
    if (parseFloat(filing.totalOffering) < parseFloat(alert.minOffering)) {
      return false;
    }
  }

  return true;
}

async function sendAlertEmail(
  to: string,
  alertName: string,
  filings: MatchedFiling[]
) {
  const filingsList = filings
    .map(
      (f) =>
        `- ${f.companyName} (Score: ${f.relevanceScore ?? "N/A"}, Offering: ${f.totalOffering ? `$${Number(f.totalOffering).toLocaleString()}` : "N/A"})`
    )
    .join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "FormD Scout <alerts@formd-scout.com>",
      to,
      subject: `FormD Scout Alert: ${alertName} - ${filings.length} new match${filings.length > 1 ? "es" : ""}`,
      text: `Your alert "${alertName}" matched ${filings.length} new filing${filings.length > 1 ? "s" : ""}:\n\n${filingsList}\n\nView details at ${process.env.NEXT_PUBLIC_APP_URL || "https://formd-scout.vercel.app"}/dashboard/filings`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend API error: ${response.status} ${text}`);
  }
}
