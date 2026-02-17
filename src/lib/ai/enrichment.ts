import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";
import type { FilingEnrichment } from "@/lib/edgar/types";

/**
 * Schema for the structured AI enrichment response.
 * Uses Zod for type-safe validation of AI output.
 */
const enrichmentSchema = z.object({
  companySummary: z
    .string()
    .describe("2-3 sentence summary of the company and what they do"),
  relevanceScore: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe(
      "Relevance score from 1-100 for NYC commercial real estate brokers targeting tech companies"
    ),
  relevanceReasoning: z
    .string()
    .describe(
      "1-2 sentence explanation of why this company scored as it did for CRE relevance"
    ),
  estimatedHeadcount: z
    .number()
    .int()
    .min(0)
    .describe(
      "Rough headcount estimate based on funding amount, industry, and company stage"
    ),
  growthSignals: z
    .array(z.string())
    .describe(
      'Array of growth signals like "Large Series B", "NYC-based", "Expanding workforce"'
    ),
  competitors: z
    .array(z.string())
    .describe("Array of known competitor company names in the same space"),
});

/**
 * Input data for enrichment - a subset of filing fields relevant for AI analysis.
 * This matches the formDFilings table columns.
 */
export interface EnrichmentInput {
  companyName: string;
  cik: string;
  entityType: string | null;
  industryGroup: string | null;
  totalOffering: string | null;
  amountSold: string | null;
  numInvestors: number | null;
  revenueRange: string | null;
  issuerCity: string | null;
  issuerState: string | null;
  isAmendment: boolean | null;
  filingDate: string;
  federalExemptions: string | null;
  yetToOccur: boolean | null;
  firstSaleDate: string | null;
}

/**
 * Build the analysis prompt for a given filing record.
 */
function buildEnrichmentPrompt(filing: EnrichmentInput): string {
  const lines: string[] = [
    "Analyze this SEC Form D filing for relevance to NYC commercial real estate brokers who target technology and growth-stage companies likely to need office space.",
    "",
    "Filing Details:",
    `- Company Name: ${filing.companyName}`,
    `- CIK: ${filing.cik}`,
    `- Entity Type: ${filing.entityType ?? "Unknown"}`,
    `- Industry: ${filing.industryGroup ?? "Unknown"}`,
    `- Total Offering Amount: ${filing.totalOffering ? `$${filing.totalOffering}` : "Not disclosed"}`,
    `- Amount Sold: ${filing.amountSold ? `$${filing.amountSold}` : "Not disclosed"}`,
    `- Number of Investors: ${filing.numInvestors ?? "Not disclosed"}`,
    `- Revenue Range: ${filing.revenueRange ?? "Not disclosed"}`,
    `- Location: ${[filing.issuerCity, filing.issuerState].filter(Boolean).join(", ") || "Unknown"}`,
    `- Filing Type: ${filing.isAmendment ? "Amendment (D/A)" : "New Filing (D)"}`,
    `- Filing Date: ${filing.filingDate}`,
    `- Federal Exemptions: ${filing.federalExemptions ?? "Not specified"}`,
    `- First Sale Date: ${filing.yetToOccur ? "Yet to Occur" : filing.firstSaleDate ?? "Not specified"}`,
    "",
    "Scoring Guidelines:",
    "- Score 70-100: Strong CRE lead. Tech/growth company, large funding round, NYC/tri-state area, likely to need significant office space.",
    "- Score 40-69: Moderate lead. Potential office needs but less certain (smaller round, non-tech but growing, or outside NYC).",
    "- Score 1-39: Weak lead. Pooled investment fund, real estate fund, very small round, shell company, or no clear office space need.",
    "",
    "Be specific in your analysis. For competitors, list actual company names if you recognize the space.",
  ];
  return lines.join("\n");
}

/**
 * Enrich a filing with AI-generated analysis using Vercel AI SDK + OpenRouter.
 *
 * Generates structured output including company summary, relevance score,
 * reasoning, estimated headcount, growth signals, and competitors.
 *
 * Retries once on failure (API error or invalid response).
 */
export async function enrichFiling(
  filing: EnrichmentInput
): Promise<FilingEnrichment> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is not configured"
    );
  }

  const openrouter = createOpenRouter({ apiKey });
  const model = openrouter(
    process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini"
  );
  const prompt = buildEnrichmentPrompt(filing);

  let lastError: unknown;

  // Attempt up to 2 times (initial + 1 retry)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await generateObject({
        model,
        schema: enrichmentSchema,
        prompt,
        temperature: 0.3,
      });

      // Validate the result matches our expected types
      const enrichment: FilingEnrichment = {
        companySummary: result.object.companySummary,
        relevanceScore: result.object.relevanceScore,
        relevanceReasoning: result.object.relevanceReasoning,
        estimatedHeadcount: result.object.estimatedHeadcount,
        growthSignals: result.object.growthSignals,
        competitors: result.object.competitors,
      };

      return enrichment;
    } catch (error) {
      lastError = error;
      // Only retry once
      if (attempt === 0) {
        // Brief delay before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw new Error(
    `Failed to enrich filing after 2 attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

/**
 * Get the model name used for enrichment (for storing in filingEnrichments.modelUsed).
 */
export function getEnrichmentModelName(): string {
  return process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini";
}
