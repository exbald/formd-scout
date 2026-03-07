import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const researchSchema = z.object({
  websiteSummary: z.string().describe("2-3 sentence summary of what the company does"),
  jobPostings: z
    .array(
      z.object({
        title: z.string(),
        location: z.string(),
        url: z.string().nullable(),
        datePosted: z.string().nullable(),
      })
    )
    .describe("Current job openings found"),
  jobPostingsCount: z.number().int().describe("Total number of open positions"),
  leadershipTeam: z
    .array(
      z.object({
        name: z.string(),
        title: z.string(),
        email: z.string().nullable().optional(),
        linkedinUrl: z.string().nullable(),
      })
    )
    .describe("Key executives and leadership"),
  officeLocations: z
    .array(
      z.object({
        city: z.string(),
        state: z.string(),
        country: z.string(),
        type: z.string(),
      })
    )
    .describe("Known office locations"),
  techStack: z.array(z.string()).describe("Technologies and platforms used"),
  recentNews: z
    .array(
      z.object({
        headline: z.string(),
        date: z.string(),
        url: z.string().nullable(),
        summary: z.string(),
      })
    )
    .describe("Recent news or press mentions"),
  employeeEstimate: z
    .number()
    .int()
    .nullable()
    .describe("Estimated employee count from website/data"),
});

export type CompanyResearch = z.infer<typeof researchSchema>;

// ---------------------------------------------------------------------------
// Shared input / output interfaces
// ---------------------------------------------------------------------------

export interface ResearchInput {
  companyName: string;
  industryGroup: string | null;
  issuerCity: string | null;
  issuerState: string | null;
  totalOffering: string | null;
}

export interface ResearchResult {
  success: boolean;
  data?: CompanyResearch & {
    websiteUrl: string | null;
    fundingHistory?: Array<{
      round: string;
      amount: string | null;
      date: string | null;
      investors: string[];
    }>;
    growthSignals?: string[];
    socialProfiles?: {
      linkedin: string | null;
      twitter: string | null;
      crunchbase: string | null;
    };
    companySize?: string | null;
  };
  error?: string;
}

export interface TeamProfileContext {
  teamName: string | null;
  companyName: string | null;
  expertise: string[] | null;
  targetMarkets: string[] | null;
  targetIndustries: string[] | null;
  idealCompanyProfile: string | null;
}

// ---------------------------------------------------------------------------
// Agent research schema (Zod) -- used for runtime validation of the
// Firecrawl /v2/agent response
// ---------------------------------------------------------------------------

const agentResearchSchema = z.object({
  websiteUrl: z.string().nullable(),
  websiteSummary: z.string(),
  leadershipTeam: z.array(
    z.object({
      name: z.string(),
      title: z.string(),
      email: z.string().nullable(),
      linkedinUrl: z.string().nullable(),
    })
  ),
  officeLocations: z.array(
    z.object({
      city: z.string(),
      state: z.string(),
      country: z.string(),
      type: z.string(),
    })
  ),
  fundingHistory: z.array(
    z.object({
      round: z.string(),
      amount: z.string().nullable().optional().transform((v) => v ?? null),
      date: z.string().nullable().optional().transform((v) => v ?? null),
      investors: z.array(z.string()).optional().default([]),
    })
  ),
  growthSignals: z.array(
    z.union([
      z.string(),
      z.object({ value: z.string() }).transform((obj) => obj.value),
    ])
  ),
  jobPostingsCount: z.number().int().nullable(),
  employeeEstimate: z.number().int().nullable(),
  techStack: z.array(
    z.union([
      z.string(),
      z.object({ value: z.string() }).transform((obj) => obj.value),
    ])
  ).optional().default([]),
  recentNews: z.array(
    z.object({
      headline: z.string(),
      date: z.string(),
      url: z.string().nullable(),
      summary: z.string(),
    })
  ),
  socialProfiles: z.object({
    linkedin: z.string().nullable(),
    twitter: z.string().nullable(),
    crunchbase: z.string().nullable(),
  }),
  companySize: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Firecrawl v1 helpers (used by legacy flow)
// ---------------------------------------------------------------------------

interface FirecrawlSearchResult {
  url: string;
  title: string;
  description: string;
}

interface FirecrawlScrapeResult {
  markdown: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1";

async function firecrawlSearch(query: string): Promise<FirecrawlSearchResult[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY environment variable is not configured");
  }

  const response = await fetch(`${FIRECRAWL_API_URL}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: 3,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firecrawl search failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return (data.data as FirecrawlSearchResult[] | undefined) || [];
}

async function firecrawlScrape(url: string): Promise<FirecrawlScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY environment variable is not configured");
  }

  const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firecrawl scrape failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.data;
}

async function searchCompanyWebsite(companyName: string): Promise<string | null> {
  try {
    const results = await firecrawlSearch(`"${companyName}" company official website`);

    for (const result of results) {
      const url = result.url.toLowerCase();
      const title = result.title?.toLowerCase() || "";

      if (
        !url.includes("linkedin.com") &&
        !url.includes("crunchbase.com") &&
        !url.includes("bloomberg.com") &&
        !url.includes("facebook.com") &&
        !url.includes("twitter.com") &&
        !url.includes("x.com") &&
        !url.includes("sec.gov") &&
        (title.includes(companyName.toLowerCase()) ||
          url.includes(companyName.toLowerCase().replace(/\s+/g, "")))
      ) {
        return result.url;
      }
    }

    if (results.length > 0 && results[0]) {
      return results[0].url;
    }

    return null;
  } catch (error) {
    console.error("Error searching for company website:", error);
    return null;
  }
}

async function searchJobsData(companyName: string): Promise<string | null> {
  try {
    const results = await firecrawlSearch(`"${companyName}" careers jobs hiring`);

    if (results.length > 0 && results[0]) {
      const jobsUrl = results[0].url;
      const scraped = await firecrawlScrape(jobsUrl);
      return scraped.markdown;
    }

    return null;
  } catch (error) {
    console.error("Error searching for jobs data:", error);
    return null;
  }
}

async function extractResearchData(
  scrapedContent: string,
  jobsContent: string | null,
  filingData: ResearchInput
): Promise<CompanyResearch> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not configured");
  }

  const openrouter = createOpenRouter({ apiKey });
  const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini");

  const prompt = buildResearchPrompt(scrapedContent, jobsContent, filingData);

  const result = await generateObject({
    model,
    schema: researchSchema,
    prompt,
    temperature: 0.3,
  });

  return result.object;
}

function buildResearchPrompt(
  scrapedContent: string,
  jobsContent: string | null,
  filingData: ResearchInput
): string {
  const lines: string[] = [
    `Extract detailed company intelligence from the following website content for "${filingData.companyName}".`,
    "",
    "Company Context from SEC Filing:",
    `- Industry: ${filingData.industryGroup ?? "Unknown"}`,
    `- Location: ${[filingData.issuerCity, filingData.issuerState].filter(Boolean).join(", ") || "Unknown"}`,
    `- Total Offering: ${filingData.totalOffering ? `$${filingData.totalOffering}` : "Not disclosed"}`,
    "",
    "=== COMPANY WEBSITE CONTENT ===",
    scrapedContent.slice(0, 15000),
  ];

  if (jobsContent) {
    lines.push("", "=== JOBS/CAREERS PAGE CONTENT ===");
    lines.push(jobsContent.slice(0, 5000));
  }

  lines.push(
    "",
    "Extract the following information:",
    "1. A 2-3 sentence summary of what the company does",
    "2. Current job postings (title, location, URL if available)",
    "3. Total count of open positions",
    "4. Leadership team members (name, title, LinkedIn if found)",
    "5. Office locations (city, state, country, type)",
    "6. Technology stack mentioned",
    "7. Recent news or press mentions",
    "8. Estimated employee count",
    "",
    "Be thorough but only include information you find in the content. Use empty arrays if no data is found."
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Legacy research flow (multi-step: search -> scrape -> AI extraction)
// ---------------------------------------------------------------------------

export async function researchCompany(filingData: ResearchInput): Promise<ResearchResult> {
  try {
    const websiteUrl = await searchCompanyWebsite(filingData.companyName);

    if (!websiteUrl) {
      return {
        success: false,
        error: `Could not find website for ${filingData.companyName}`,
      };
    }

    const [scrapedContent, jobsContent] = await Promise.all([
      firecrawlScrape(websiteUrl),
      searchJobsData(filingData.companyName),
    ]);

    const research = await extractResearchData(scrapedContent.markdown, jobsContent, filingData);

    return {
      success: true,
      data: {
        ...research,
        websiteUrl,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Research failed: ${errorMessage}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Agent research flow (single Firecrawl /v2/agent call)
// ---------------------------------------------------------------------------

/**
 * Build the natural-language prompt sent to the Firecrawl agent. Includes
 * SEC filing context and, optionally, the requesting team's profile so the
 * agent can tailor its research focus.
 */
function buildAgentPrompt(filingData: ResearchInput, teamProfile?: TeamProfileContext): string {
  const lines: string[] = [
    `Research "${filingData.companyName}" comprehensively. This company filed a Form D with the SEC indicating a ${filingData.totalOffering ? `$${filingData.totalOffering}` : "undisclosed"} fundraise in the ${filingData.industryGroup ?? "unknown"} sector, based in ${[filingData.issuerCity, filingData.issuerState].filter(Boolean).join(", ") || "unknown location"}.`,
  ];

  if (teamProfile) {
    const parts: string[] = [];
    if (teamProfile.teamName || teamProfile.companyName) {
      parts.push(
        `This research is for ${teamProfile.teamName ?? "the team"} at ${teamProfile.companyName ?? "their company"}`
      );
    }
    if (teamProfile.expertise?.length) {
      parts.push(`specializing in ${teamProfile.expertise.join(", ")}`);
    }
    if (teamProfile.targetMarkets?.length) {
      parts.push(`targeting ${teamProfile.targetMarkets.join(", ")} markets`);
    }
    if (teamProfile.targetIndustries?.length) {
      parts.push(`in ${teamProfile.targetIndustries.join(", ")} industries`);
    }
    if (parts.length > 0) {
      lines.push("", `Context: ${parts.join(", ")}.`);
    }
    if (teamProfile.idealCompanyProfile) {
      lines.push(`Their ideal company profile: ${teamProfile.idealCompanyProfile}`);
    }
  }

  lines.push(
    "",
    "Find and extract:",
    "1. Company website URL",
    "2. 3-4 sentence summary of what the company does, their products/services, and market position",
    "3. Leadership team with: full name, title, email address (search for contact pages, team pages, LinkedIn), LinkedIn profile URL",
    "4. All office locations (city, state, country, type: HQ/branch/satellite)",
    "5. Funding history: all known rounds (type, amount, date, lead investors)",
    "6. Growth signals: hiring velocity, expansion announcements, partnerships, product launches, awards",
    "7. Current job openings count",
    "8. Estimated employee count",
    "9. Technology stack",
    "10. Recent news and press mentions (last 12 months)",
    "11. Social profiles: company LinkedIn page, Twitter/X, Crunchbase page",
    "12. Company size category: startup (<50), scaleup (50-500), or enterprise (500+)",
    "",
    "Be thorough. Search multiple sources including the company website, LinkedIn, Crunchbase, news sites, and job boards."
  );

  return lines.join("\n");
}

// JSON Schema for the Firecrawl agent structured extraction
const agentJsonSchema = {
  type: "object" as const,
  properties: {
    websiteUrl: { type: ["string", "null"] },
    websiteSummary: { type: "string" },
    leadershipTeam: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          title: { type: "string" },
          email: { type: ["string", "null"] },
          linkedinUrl: { type: ["string", "null"] },
        },
        required: ["name", "title"],
      },
    },
    officeLocations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          city: { type: "string" },
          state: { type: "string" },
          country: { type: "string" },
          type: { type: "string" },
        },
        required: ["city", "state", "country", "type"],
      },
    },
    fundingHistory: {
      type: "array",
      items: {
        type: "object",
        properties: {
          round: { type: "string" },
          amount: { type: ["string", "null"] },
          date: { type: ["string", "null"] },
          investors: { type: "array", items: { type: "string" } },
        },
        required: ["round"],
      },
    },
    growthSignals: { type: "array", items: { type: "string" } },
    jobPostingsCount: { type: ["integer", "null"] },
    employeeEstimate: { type: ["integer", "null"] },
    techStack: { type: "array", items: { type: "string" } },
    recentNews: {
      type: "array",
      items: {
        type: "object",
        properties: {
          headline: { type: "string" },
          date: { type: "string" },
          url: { type: ["string", "null"] },
          summary: { type: "string" },
        },
        required: ["headline", "date", "summary"],
      },
    },
    socialProfiles: {
      type: "object",
      properties: {
        linkedin: { type: ["string", "null"] },
        twitter: { type: ["string", "null"] },
        crunchbase: { type: ["string", "null"] },
      },
    },
    companySize: { type: ["string", "null"] },
  },
  required: [
    "websiteSummary",
    "leadershipTeam",
    "officeLocations",
    "fundingHistory",
    "growthSignals",
    "techStack",
    "recentNews",
    "socialProfiles",
  ],
};

// ---------------------------------------------------------------------------
// Public API — async agent job submission + polling
// ---------------------------------------------------------------------------

/**
 * Submit a Firecrawl agent job. Returns the agent ID immediately without
 * waiting for the result. The caller is responsible for storing the agent ID
 * and polling via `checkAgentJob`.
 */
export async function submitAgentJob(
  filingData: ResearchInput,
  teamProfile?: TeamProfileContext,
  maxCredits: number = 2000
): Promise<{ agentId: string; prompt: string }> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY environment variable is not configured");
  }

  const prompt = buildAgentPrompt(filingData, teamProfile);

  const submitResponse = await fetch("https://api.firecrawl.dev/v2/agent", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      schema: agentJsonSchema,
      maxCredits,
      model: "spark-1-mini",
    }),
  });

  if (!submitResponse.ok) {
    const text = await submitResponse.text();
    throw new Error(`Firecrawl agent submit failed: ${submitResponse.status} ${text}`);
  }

  const submitResult = await submitResponse.json();

  if (!submitResult.success || !submitResult.id) {
    throw new Error(`Firecrawl agent submit failed: ${JSON.stringify(submitResult)}`);
  }

  return { agentId: submitResult.id, prompt };
}

export interface AgentJobStatus {
  status: "pending" | "completed" | "failed";
  data?: ResearchResult["data"];
  creditsUsed?: number | undefined;
  error?: string;
}

/**
 * Check the status of a Firecrawl agent job. Returns parsed research data
 * if the job is completed.
 */
export async function checkAgentJob(agentId: string): Promise<AgentJobStatus> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY environment variable is not configured");
  }

  const pollResponse = await fetch(`https://api.firecrawl.dev/v2/agent/${agentId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!pollResponse.ok) {
    const text = await pollResponse.text();
    throw new Error(`Firecrawl agent poll failed: ${pollResponse.status} ${text}`);
  }

  const result = await pollResponse.json();

  if (result.status === "failed" || result.status === "error") {
    return { status: "failed", error: result.error ?? "Agent job failed" };
  }

  if (result.status !== "completed" && result.status !== "done") {
    return { status: "pending" };
  }

  const rawData = result.data ?? result.output ?? result.result;
  const parsed = agentResearchSchema.safeParse(rawData);
  if (!parsed.success) {
    console.error("Agent response validation failed:", parsed.error);
    return { status: "failed", error: "Failed to parse agent research response" };
  }

  const data = parsed.data;

  return {
    status: "completed",
    data: {
      websiteUrl: data.websiteUrl,
      websiteSummary: data.websiteSummary,
      leadershipTeam: data.leadershipTeam,
      officeLocations: data.officeLocations,
      techStack: data.techStack,
      recentNews: data.recentNews,
      employeeEstimate: data.employeeEstimate,
      jobPostings: [],
      jobPostingsCount: data.jobPostingsCount ?? 0,
      fundingHistory: data.fundingHistory,
      growthSignals: data.growthSignals,
      socialProfiles: data.socialProfiles,
      companySize: data.companySize,
    },
    creditsUsed: result.creditsUsed as number | undefined,
  };
}

export function getResearchModelName(): string {
  return process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
}
