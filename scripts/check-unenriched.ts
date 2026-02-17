/**
 * Check for unenriched filings in the database.
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { formDFilings, filingEnrichments } from "../src/lib/schema";
import { eq, isNull } from "drizzle-orm";

const POSTGRES_URL = process.env.POSTGRES_URL || "postgresql://dev_user:dev_password@localhost:5432/postgres_dev";

async function main() {
  const client = postgres(POSTGRES_URL);
  const db = drizzle(client);

  try {
    // Count all filings
    const allFilings = await db.select({ id: formDFilings.id }).from(formDFilings);
    console.log("Total filings:", allFilings.length);

    // Count enriched filings
    const enriched = await db.select({ id: filingEnrichments.id }).from(filingEnrichments);
    console.log("Enriched filings:", enriched.length);

    // Count unenriched filings (filings without enrichment records)
    const unenriched = await db
      .select({ id: formDFilings.id, companyName: formDFilings.companyName })
      .from(formDFilings)
      .leftJoin(filingEnrichments, eq(formDFilings.id, filingEnrichments.filingId))
      .where(isNull(filingEnrichments.id))
      .limit(20);

    console.log("Unenriched filings (sample of 20):", unenriched.length);

    if (unenriched.length > 0) {
      console.log("\nSample unenriched filings:");
      unenriched.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.companyName} (${f.id})`);
      });
    }
  } finally {
    await client.end();
  }
}

main().catch(console.error);
