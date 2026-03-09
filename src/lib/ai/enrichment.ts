import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";
import type { FilingEnrichment } from "@/lib/edgar/types";

export interface ScoringProfile {
  targetMarkets: string[];
  targetIndustries: string[];
  idealCompanyProfile: string;
  scoringCriteria: {
    high: string;
    medium: string;
    low: string;
  };
}

export const DEFAULT_SCORING_PROFILE: ScoringProfile = {
  targetMarkets: ["New York", "Manhattan", "NYC tri-state area"],
  targetIndustries: ["technology", "fintech", "AI/ML", "SaaS"],
  idealCompanyProfile: "Growth-stage technology companies likely to need significant office space",
  scoringCriteria: {
    high: "Tech/growth company, large funding round, in target market, likely to need significant office space",
    medium:
      "Potential office needs but less certain - smaller round, non-tech but growing, or outside primary target market",
    low: "Pooled investment fund, real estate fund, very small round, shell company, or no clear office space need",
  },
};

const enrichmentSchema = z.object({
  companySummary: z.string().describe("2-3 sentence summary of the company and what they do"),
  relevanceScore: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Relevance score from 1-100 based on configured criteria"),
  relevanceReasoning: z
    .string()
    .describe("1-2 sentence explanation of why this company scored as it did"),
  estimatedHeadcount: z
    .number()
    .int()
    .min(0)
    .describe("Rough headcount estimate based on funding amount, industry, and company stage"),
  growthSignals: z
    .array(z.string())
    .describe('Array of growth signals like "Large Series B", "NYC-based", "Expanding workforce"'),
  competitors: z
    .array(z.string())
    .describe("Array of known competitor company names in the same space"),
  officeSpaceLikelihood: z
    .enum(["high", "medium", "low", "unknown"])
    .describe("Likelihood this company needs office space based on all available data"),
});

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

function buildDynamicEnrichmentPrompt(
  filing: EnrichmentInput,
  profile: ScoringProfile,
  websiteContent?: string
): string {
  const lines: string[] = [
    `Analyze this SEC Form D filing for relevance to commercial real estate brokers targeting ${profile.idealCompanyProfile}.`,
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
    `- First Sale Date: ${filing.yetToOccur ? "Yet to Occur" : (filing.firstSaleDate ?? "Not specified")}`,
  ];

  if (websiteContent) {
    lines.push("", "Website Research Data:");
    lines.push(websiteContent);
  }

  lines.push(
    "",
    `Target Markets: ${profile.targetMarkets.join(", ")}`,
    `Target Industries: ${profile.targetIndustries.join(", ")}`,
    "",
    "Scoring Guidelines:",
    `- Score 70-100: ${profile.scoringCriteria.high}`,
    `- Score 40-69: ${profile.scoringCriteria.medium}`,
    `- Score 1-39: ${profile.scoringCriteria.low}`,
    "",
    "Be specific in your analysis. For competitors, list actual company names if you recognize the space."
  );

  return lines.join("\n");
}

export interface EnrichmentResult {
  success: boolean;
  data?: FilingEnrichment;
  error?: string;
}

export interface EnrichFilingOptions {
  profile?: ScoringProfile;
  websiteContent?: string;
}

export async function enrichFiling(
  filing: EnrichmentInput,
  options?: EnrichFilingOptions
): Promise<EnrichmentResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "OPENROUTER_API_KEY environment variable is not configured",
    };
  }

  const openrouter = createOpenRouter({ apiKey });
  const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini");
  const profile = options?.profile ?? DEFAULT_SCORING_PROFILE;
  const prompt = buildDynamicEnrichmentPrompt(filing, profile, options?.websiteContent);

  let lastError: string = "Unknown error";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await generateObject({
        model,
        schema: enrichmentSchema,
        prompt,
        temperature: 0.3,
      });

      const enrichment: FilingEnrichment = {
        companySummary: result.object.companySummary,
        relevanceScore: result.object.relevanceScore,
        relevanceReasoning: result.object.relevanceReasoning,
        estimatedHeadcount: result.object.estimatedHeadcount,
        growthSignals: result.object.growthSignals,
        competitors: result.object.competitors,
        officeSpaceLikelihood: result.object.officeSpaceLikelihood,
      };

      return { success: true, data: enrichment };
    } catch (error) {
      if (error instanceof Error) {
        lastError = error.message;
        if (
          error.message.includes("JSON") ||
          error.message.includes("parse") ||
          error.message.includes("schema")
        ) {
          lastError = `Invalid response from AI model: ${error.message}`;
        }
      } else {
        lastError = String(error);
      }

      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  return {
    success: false,
    error: `Failed to enrich filing after 2 attempts: ${lastError}`,
  };
}

export function getEnrichmentModelName(): string {
  return process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini";
}
