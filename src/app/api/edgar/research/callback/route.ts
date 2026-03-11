import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { agentResearchSchema, saveResearchData } from "@/lib/ai/research";
import { db } from "@/lib/db";
import { researchJobs } from "@/lib/schema";

const INGEST_API_KEY = process.env.INGEST_API_KEY;

const webhookPayloadSchema = z.object({
  success: z.boolean(),
  type: z.string(),
  id: z.string(),
  data: z
    .array(
      z.object({
        creditsUsed: z.number().optional(),
        data: z.unknown().optional(),
      }),
    )
    .optional()
    .default([]),
  error: z.string().optional(),
  metadata: z
    .object({
      filingId: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  // Auth via x-api-key header
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || !INGEST_API_KEY || apiKey !== INGEST_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawBody = await req.json();
    const parsed = webhookPayloadSchema.safeParse(rawBody);

    if (!parsed.success) {
      console.error("Webhook payload validation failed:", parsed.error);
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const payload = parsed.data;
    const agentId = payload.id;

    // Look up the research job by agentId
    const [job] = await db
      .select()
      .from(researchJobs)
      .where(eq(researchJobs.agentId, agentId))
      .limit(1);

    if (!job) {
      console.warn(`Webhook callback for unknown agentId: ${agentId}`);
      // Return 200 so Firecrawl doesn't retry
      return NextResponse.json({ status: "ignored", reason: "unknown agent" });
    }

    // Idempotency guard: if already completed/failed, skip
    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json({ status: "already_processed" });
    }

    if (payload.type === "agent.completed" && payload.success) {
      const rawData = payload.data?.[0]?.data;
      const creditsUsed = payload.data?.[0]?.creditsUsed ?? null;

      const researchParsed = agentResearchSchema.safeParse(rawData);
      if (!researchParsed.success) {
        console.error("Agent research validation failed:", researchParsed.error);
        await db
          .update(researchJobs)
          .set({
            status: "failed",
            error: "Failed to parse agent research response",
            updatedAt: new Date(),
          })
          .where(eq(researchJobs.id, job.id));
        return NextResponse.json({ status: "parse_error" });
      }

      await saveResearchData(
        job.filingId,
        researchParsed.data,
        job.prompt,
        creditsUsed,
      );

      await db
        .update(researchJobs)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(researchJobs.id, job.id));

      return NextResponse.json({ status: "completed" });
    }

    // agent.failed or any other non-success type
    const errorMessage = payload.error ?? "Agent job failed";
    await db
      .update(researchJobs)
      .set({ status: "failed", error: errorMessage, updatedAt: new Date() })
      .where(eq(researchJobs.id, job.id));

    return NextResponse.json({ status: "failed" });
  } catch (error) {
    console.error("Webhook callback error:", error);
    // Return 200 to prevent Firecrawl retries on unexpected errors
    return NextResponse.json({ status: "error", message: "Internal error" });
  }
}
