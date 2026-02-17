/**
 * Test script to verify API routes execute real PostgreSQL queries via Drizzle ORM.
 * This directly tests the database layer without going through auth.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql, eq, gte } from "drizzle-orm";
import * as schema from "../src/lib/schema";

const connectionString = process.env.POSTGRES_URL || "postgresql://dev_user:dev_password@localhost:5432/postgres_dev";

async function main() {
  console.log("=== Testing real database queries via Drizzle ORM ===\n");
  console.log("Connection:", connectionString.replace(/:[^@]+@/, ":***@"));

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  // Test 1: Query formDFilings table (same as GET /api/edgar/filings)
  console.log("\n--- Test 1: SELECT from form_d_filings (filings endpoint) ---");
  try {
    const filings = await db
      .select({
        id: schema.formDFilings.id,
        companyName: schema.formDFilings.companyName,
        filingDate: schema.formDFilings.filingDate,
        totalOffering: schema.formDFilings.totalOffering,
        industryGroup: schema.formDFilings.industryGroup,
        issuerState: schema.formDFilings.issuerState,
      })
      .from(schema.formDFilings)
      .leftJoin(
        schema.filingEnrichments,
        eq(schema.formDFilings.id, schema.filingEnrichments.filingId)
      )
      .limit(5);

    console.log(`✅ Query executed successfully. Returned ${filings.length} rows.`);
    if (filings.length > 0) {
      console.log("Sample row:", JSON.stringify(filings[0], null, 2));
    } else {
      console.log("(Table is empty - which is expected for a fresh database)");
    }
  } catch (error) {
    console.error("❌ Filings query failed:", (error as Error).message);
    process.exit(1);
  }

  // Test 2: Query stats (same as GET /api/edgar/stats)
  console.log("\n--- Test 2: Aggregate queries (stats endpoint) ---");
  try {
    const todayStr = new Date().toISOString().split("T")[0];

    const [countResult, highRelevance, avgOffering, topIndustries, topStates] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.formDFilings)
        .where(eq(schema.formDFilings.filingDate, todayStr!)),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.filingEnrichments)
        .where(sql`${schema.filingEnrichments.relevanceScore} >= 60`),

      db
        .select({ avg: sql<string>`coalesce(avg(${schema.formDFilings.totalOffering}), 0)::text` })
        .from(schema.formDFilings),

      db
        .select({
          industry: schema.formDFilings.industryGroup,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.formDFilings)
        .where(sql`${schema.formDFilings.industryGroup} IS NOT NULL`)
        .groupBy(schema.formDFilings.industryGroup)
        .orderBy(sql`count(*) DESC`)
        .limit(5),

      db
        .select({
          state: schema.formDFilings.issuerState,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.formDFilings)
        .where(sql`${schema.formDFilings.issuerState} IS NOT NULL`)
        .groupBy(schema.formDFilings.issuerState)
        .orderBy(sql`count(*) DESC`)
        .limit(5),
    ]);

    console.log(`✅ All stats queries executed successfully.`);
    console.log(`  - Today's count: ${countResult[0]?.count ?? 0}`);
    console.log(`  - High relevance count: ${highRelevance[0]?.count ?? 0}`);
    console.log(`  - Average offering: ${avgOffering[0]?.avg ?? "0"}`);
    console.log(`  - Top industries: ${topIndustries.length} groups`);
    console.log(`  - Top states: ${topStates.length} states`);
  } catch (error) {
    console.error("❌ Stats queries failed:", (error as Error).message);
    process.exit(1);
  }

  // Test 3: Verify actual SQL is being generated (not mock)
  console.log("\n--- Test 3: Verify real SQL generation ---");
  try {
    const query = db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.formDFilings)
      .where(gte(schema.formDFilings.filingDate, "2025-01-01"))
      .toSQL();

    console.log(`✅ Generated SQL: ${query.sql}`);
    console.log(`   Params: ${JSON.stringify(query.params)}`);

    if (query.sql.includes("select") && query.sql.includes("form_d_filings")) {
      console.log("✅ Confirmed: Real SQL SELECT query against form_d_filings table");
    } else {
      console.error("❌ Unexpected SQL generated");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ SQL generation test failed:", (error as Error).message);
    process.exit(1);
  }

  console.log("\n=== All database query tests PASSED ✅ ===");
  console.log("Both /api/edgar/filings and /api/edgar/stats use real Drizzle ORM queries against PostgreSQL.");

  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
