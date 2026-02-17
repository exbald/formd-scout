/**
 * Verify filings were ingested into the database
 */

import "dotenv/config";
import { db } from "../src/lib/db";
import { formDFilings } from "../src/lib/schema";
import { sql } from "drizzle-orm";

async function verify() {
  // Count total filings
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(formDFilings);

  const total = countResult[0]?.count ?? 0;
  console.log(`Total filings in database: ${total}`);

  // Get sample filings
  if (total > 0) {
    const samples = await db
      .select({
        accessionNumber: formDFilings.accessionNumber,
        companyName: formDFilings.companyName,
        cik: formDFilings.cik,
        filingDate: formDFilings.filingDate,
        industryGroup: formDFilings.industryGroup,
        issuerState: formDFilings.issuerState,
        totalOffering: formDFilings.totalOffering,
      })
      .from(formDFilings)
      .limit(5);

    console.log("\nSample filings:");
    for (const f of samples) {
      console.log(`  - ${f.accessionNumber}: ${f.companyName}`);
      console.log(`    CIK: ${f.cik}, Date: ${f.filingDate}`);
      console.log(`    Industry: ${f.industryGroup || "N/A"}, State: ${f.issuerState || "N/A"}`);
      console.log(`    Offering: ${f.totalOffering || "N/A"}`);
    }
  }

  return total;
}

verify()
  .then((count) => {
    console.log(`\nVerification complete: ${count} filings found`);
    process.exit(count > 0 ? 0 : 1);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
