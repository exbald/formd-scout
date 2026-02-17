/**
 * Verify stored filings have correct fields
 * - companyName, cik, accessionNumber, filingDate
 * - accessionNumbers stored with dashes as-is from EDGAR
 */

import "dotenv/config";
import { db } from "../src/lib/db";
import { formDFilings } from "../src/lib/schema";
import { sql } from "drizzle-orm";

async function verify() {
  // Count total
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(formDFilings);

  const total = countResult[0]?.count ?? 0;
  console.log(`Total filings: ${total}`);

  if (total === 0) {
    console.log("No filings found - verification failed");
    return false;
  }

  // Get sample filings with all required fields
  const samples = await db
    .select({
      accessionNumber: formDFilings.accessionNumber,
      companyName: formDFilings.companyName,
      cik: formDFilings.cik,
      filingDate: formDFilings.filingDate,
    })
    .from(formDFilings)
    .limit(10);

  console.log("\nVerifying required fields:");
  let allValid = true;

  for (const f of samples) {
    // Check required fields are not null/empty
    const hasCompanyName = f.companyName && f.companyName.length > 0;
    const hasCik = f.cik && f.cik.length > 0;
    const hasAccessionNumber = f.accessionNumber && f.accessionNumber.length > 0;
    const hasFilingDate = f.filingDate !== null;

    // Check accession number has dashes (format: XXXXXXXXX-XX-XXXXXX)
    const hasDashes = f.accessionNumber?.includes("-") ?? false;

    const valid = hasCompanyName && hasCik && hasAccessionNumber && hasFilingDate && hasDashes;

    if (!valid) {
      console.log(`  INVALID: ${f.accessionNumber}`);
      console.log(`    companyName: ${hasCompanyName ? "OK" : "MISSING"}`);
      console.log(`    cik: ${hasCik ? "OK" : "MISSING"}`);
      console.log(`    accessionNumber: ${hasAccessionNumber ? "OK" : "MISSING"}`);
      console.log(`    filingDate: ${hasFilingDate ? "OK" : "MISSING"}`);
      console.log(`    dashes: ${hasDashes ? "OK" : "MISSING"}`);
      allValid = false;
    }
  }

  if (allValid) {
    console.log("  ✓ All sample filings have valid required fields");
    console.log("  ✓ All accession numbers have dashes (stored as-is from EDGAR)");
  }

  // Show some examples
  console.log("\nExample filings:");
  for (const f of samples.slice(0, 3)) {
    console.log(`  ${f.accessionNumber}: ${f.companyName}`);
    console.log(`    CIK: ${f.cik}, Date: ${f.filingDate}`);
  }

  return allValid;
}

verify()
  .then((success) => {
    console.log(`\nVerification: ${success ? "PASSED" : "FAILED"}`);
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
