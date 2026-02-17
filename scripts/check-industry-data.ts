/**
 * Check industryGroup data in the database
 */

import { config } from "dotenv";
config();

import { db } from "../src/lib/db";
import { formDFilings } from "../src/lib/schema";
import { sql } from "drizzle-orm";

async function main() {
  // Check if industryGroup has any non-null values
  const withIndustry = await db
    .select({ industry: formDFilings.industryGroup })
    .from(formDFilings)
    .where(sql`industry_group IS NOT NULL`)
    .limit(5);
  console.log("Filings with industryGroup:", withIndustry.length);

  // Check what values we have
  const sample = await db
    .select({ industry: formDFilings.industryGroup, state: formDFilings.issuerState })
    .from(formDFilings)
    .limit(5);
  console.log("Sample data:", JSON.stringify(sample, null, 2));

  process.exit(0);
}

main();
