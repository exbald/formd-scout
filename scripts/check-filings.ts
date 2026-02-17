/**
 * Simple check for filings in database
 */

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Checking filings in database...\n");

  // Check filings count
  const filingsCount = await db.execute(sql`SELECT COUNT(*) as count FROM form_d_filings`);
  console.log(`Total filings: ${filingsCount.rows[0]?.count}`);

  // Check enrichments count
  const enrichmentsCount = await db.execute(sql`SELECT COUNT(*) as count FROM filing_enrichments`);
  console.log(`Total enrichments: ${enrichmentsCount.rows[0]?.count}`);

  // Get sample filings
  console.log("\nSample filings:");
  const filings = await db.execute(sql`
    SELECT f.id, f.company_name, e.id as enrichment_id
    FROM form_d_filings f
    LEFT JOIN filing_enrichments e ON f.id = e.filing_id
    LIMIT 5
  `);

  for (const row of filings.rows) {
    console.log(`  - ${row.company_name} (${row.id}) - enriched: ${row.enrichment_id ? 'yes' : 'no'}`);
  }

  // Find unenriched filing
  console.log("\nUnenriched filings:");
  const unenriched = await db.execute(sql`
    SELECT f.id, f.company_name
    FROM form_d_filings f
    LEFT JOIN filing_enrichments e ON f.id = e.filing_id
    WHERE e.id IS NULL
    LIMIT 5
  `);

  if (unenriched.rows.length === 0) {
    console.log("  All filings are enriched!");
  } else {
    for (const row of unenriched.rows) {
      console.log(`  - ${row.company_name} (${row.id})`);
    }
  }
}

main().catch(console.error);
