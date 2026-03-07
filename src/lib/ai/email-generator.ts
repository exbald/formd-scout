import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";

export interface EmailGenerationInput {
  filing: {
    companyName: string;
    totalOffering: string | null;
    industryGroup: string | null;
    issuerCity: string | null;
    issuerState: string | null;
    filingDate: string;
  };
  enrichment: {
    companySummary: string | null;
    relevanceScore: number | null;
    growthSignals: string[] | null;
    competitors: string[] | null;
  } | null;
  research: {
    websiteSummary: string | null;
    jobPostingsCount: number | null;
    leadershipTeam: Array<{ name: string; title: string }> | null;
  } | null;
  teamProfile: {
    teamName: string | null;
    companyName: string | null;
    keyClients: Array<{ name: string; industry: string; relationship: string }> | null;
    teamBio: string | null;
    expertise: string[] | null;
    emailSignature: string | null;
    emailTone: string | null;
  } | null;
  overrides?: {
    recipientName?: string;
    recipientTitle?: string;
    tone?: string;
  };
}

const emailDraftSchema = z.object({
  subject: z.string().describe("Email subject line - concise, specific, not salesy"),
  body: z
    .string()
    .describe(
      "Email body - personalized, references team clients, mentions growth signals, sounds human-written"
    ),
  followUps: z
    .array(
      z.object({
        delayDays: z.number().int(),
        subject: z.string(),
        body: z.string(),
      })
    )
    .describe("2-3 follow-up emails with suggested timing"),
  referencedClients: z.array(z.string()).describe("Which team clients were mentioned in the email"),
});

export interface EmailDraftResult {
  subject: string;
  body: string;
  followUps: Array<{
    delayDays: number;
    subject: string;
    body: string;
  }>;
  referencedClients: string[];
}

export interface GenerateEmailResult {
  success: boolean;
  data?: EmailDraftResult;
  error?: string;
}

function buildEmailPrompt(input: EmailGenerationInput): string {
  const lines: string[] = [
    "You are a commercial real estate broker writing a personalized outreach email to a company that recently raised private funding.",
    "",
    "TARGET COMPANY:",
    `- Name: ${input.filing.companyName}`,
    `- Location: ${[input.filing.issuerCity, input.filing.issuerState].filter(Boolean).join(", ") || "Unknown"}`,
    `- Industry: ${input.filing.industryGroup || "Unknown"}`,
    `- Recent funding: ${input.filing.totalOffering ? `$${input.filing.totalOffering}` : "Undisclosed amount"}`,
    `- Funding date: ${input.filing.filingDate}`,
  ];

  if (input.enrichment) {
    lines.push("");
    lines.push("COMPANY INSIGHTS (from AI analysis):");
    if (input.enrichment.companySummary) {
      lines.push(`- Summary: ${input.enrichment.companySummary}`);
    }
    if (input.enrichment.growthSignals && input.enrichment.growthSignals.length > 0) {
      lines.push(`- Growth signals: ${input.enrichment.growthSignals.join(", ")}`);
    }
  }

  if (input.research) {
    lines.push("");
    lines.push("COMPANY RESEARCH:");
    if (input.research.websiteSummary) {
      lines.push(`- Website summary: ${input.research.websiteSummary}`);
    }
    if (input.research.jobPostingsCount && input.research.jobPostingsCount > 0) {
      lines.push(`- Open positions: ${input.research.jobPostingsCount}`);
    }
    if (input.research.leadershipTeam && input.research.leadershipTeam.length > 0) {
      const leaders = input.research.leadershipTeam
        .slice(0, 5)
        .map((l) => `${l.name} (${l.title})`)
        .join(", ");
      lines.push(`- Leadership: ${leaders}`);
    }
  }

  if (input.teamProfile) {
    lines.push("");
    lines.push("YOUR TEAM INFO:");
    if (input.teamProfile.teamName) {
      lines.push(`- Team: ${input.teamProfile.teamName}`);
    }
    if (input.teamProfile.companyName) {
      lines.push(`- Company: ${input.teamProfile.companyName}`);
    }
    if (input.teamProfile.teamBio) {
      lines.push(`- About: ${input.teamProfile.teamBio}`);
    }
    if (input.teamProfile.expertise && input.teamProfile.expertise.length > 0) {
      lines.push(`- Expertise: ${input.teamProfile.expertise.join(", ")}`);
    }
    if (input.teamProfile.keyClients && input.teamProfile.keyClients.length > 0) {
      lines.push("- Notable clients:");
      input.teamProfile.keyClients.forEach((client) => {
        lines.push(`  * ${client.name} (${client.industry}) - ${client.relationship}`);
      });
    }
    const tone = input.overrides?.tone || input.teamProfile.emailTone || "professional";
    lines.push(`- Desired tone: ${tone}`);
  }

  lines.push("");
  lines.push("RECIPIENT:");
  if (input.overrides?.recipientName) {
    lines.push(`- Name: ${input.overrides.recipientName}`);
  } else if (input.research?.leadershipTeam && input.research.leadershipTeam.length > 0) {
    const leader = input.research.leadershipTeam[0]!;
    lines.push(`- Name: ${leader.name} (${leader.title})`);
  } else {
    lines.push("- Name: [Use a generic greeting]");
  }

  lines.push("");
  lines.push("GUIDELINES:");
  lines.push("- Write a personalized cold outreach email");
  lines.push(
    "- Reference recent growth signals naturally (e.g., 'congratulations on the recent funding')"
  );
  lines.push(
    "- DO NOT mention Form D, SEC filings, or that you discovered them through regulatory data"
  );
  lines.push(
    "- If team clients are relevant to the target company's industry, mention them naturally"
  );
  lines.push("- Keep it concise (150-200 words for main email)");
  lines.push("- Sound like a human, not a template");
  lines.push("- Include a soft call-to-action (quick chat, coffee, etc.)");
  lines.push("- Do NOT include the signature in the body - it will be appended separately");
  lines.push("- Generate 2-3 follow-up emails with appropriate timing (7-14 days apart)");

  return lines.join("\n");
}

export async function generateEmailDraft(
  input: EmailGenerationInput
): Promise<GenerateEmailResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "OPENROUTER_API_KEY environment variable is not configured",
    };
  }

  const openrouter = createOpenRouter({ apiKey });
  const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini");
  const prompt = buildEmailPrompt(input);

  let lastError: string = "Unknown error";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await generateObject({
        model,
        schema: emailDraftSchema,
        prompt,
        temperature: 0.7,
      });

      const draft: EmailDraftResult = {
        subject: result.object.subject,
        body: result.object.body,
        followUps: result.object.followUps,
        referencedClients: result.object.referencedClients,
      };

      return { success: true, data: draft };
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
    error: `Failed to generate email draft after 2 attempts: ${lastError}`,
  };
}

export function getEmailModelName(): string {
  return process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini";
}
