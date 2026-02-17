import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  database: {
    status: "connected" | "disconnected";
    latencyMs: number;
  };
  uptime: number;
}

/**
 * GET /api/health
 *
 * Public health check endpoint that verifies database connectivity.
 * Returns 200 with database status when connected.
 * Returns 503 when database is unreachable.
 */
export async function GET() {
  const startTime = Date.now();
  let dbConnected = false;
  let dbLatency = 0;

  try {
    const dbStart = Date.now();
    const result = await db.execute(sql`SELECT 1 as ping`);
    dbLatency = Date.now() - dbStart;

    if (result && result.length > 0) {
      dbConnected = true;
    }
  } catch {
    dbConnected = false;
    dbLatency = Date.now() - startTime;
  }

  const response: HealthResponse = {
    status: dbConnected ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    database: {
      status: dbConnected ? "connected" : "disconnected",
      latencyMs: dbLatency,
    },
    uptime: process.uptime(),
  };

  return NextResponse.json(response, {
    status: dbConnected ? 200 : 503,
  });
}
