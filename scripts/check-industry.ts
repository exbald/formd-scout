import "dotenv/config";
import { db } from "../src/lib/db";
import { formDFilings } from "../src/lib/schema";
import { sql } from "drizzle-orm";

async function main() {
  // Check what industryGroups we have
  const result = await db
    .select({ industry: formDFilings.industryGroup, count: sql<number>`count(*)` })
    .from(formDFilings)
    .groupBy(formDFilings.industryGroup);

  console.log("Industry groups in DB:", result);

  // Check if any filings have industryGroup
  const withIndustry = await db
    .select({ company: formDFilings.companyName, industry: formDFilings.industryGroup })
    .from(formDFilings)
    .where(sql`${formDFilings.industryGroup} IS NOT NULL`)
    .limit(5);

  console.log("Filings with industry:", withIndustry);

  await db.$client.end();
}

main().catch(console.error);
