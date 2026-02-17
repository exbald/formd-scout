/**
 * Test script to verify deduplication by accessionNumber unique constraint
 * Database-level test only (no API calls)
 *
 * Feature #18: Ingestion deduplicates by accessionNumber unique constraint
 */

// Load env first before any other imports
import { config } from "dotenv";
config();

import { db } from "../src/lib/db";
import { formDFilings } from "../src/lib/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== Testing Deduplication by accessionNumber ===\n");

  const testAccessionNumber = "0000000000-99-000001";
  const testCik = "0000000000";
  const testCompanyName = "Dedup Test Corp";

  // Cleanup first
  console.log("Cleaning up any existing test data...");
  await db.delete(formDFilings).where(eq(formDFilings.accessionNumber, testAccessionNumber));
  console.log();

  // Step 1: Insert a test filing
  console.log("Step 1: Inserting test filing into database...");
  console.log(`  Accession Number: ${testAccessionNumber}`);
  console.log(`  CIK: ${testCik}`);
  console.log(`  Company Name: ${testCompanyName}`);

  const [inserted] = await db
    .insert(formDFilings)
    .values({
      cik: testCik,
      accessionNumber: testAccessionNumber,
      companyName: testCompanyName,
      filingDate: "1999-01-01",
      isAmendment: false,
    })
    .returning({ id: formDFilings.id });

  console.log(`  Inserted with ID: ${inserted.id}\n`);

  // Step 2: Verify one record exists
  console.log("Step 2: Verifying one record exists...");
  const firstCheck = await db
    .select()
    .from(formDFilings)
    .where(eq(formDFilings.accessionNumber, testAccessionNumber));

  console.log(`  Records found: ${firstCheck.length}`);
  if (firstCheck.length === 1) {
    console.log("  ✅ Exactly one record exists\n");
  } else {
    console.log("  ❌ Unexpected record count\n");
  }

  // Step 3: Try to insert duplicate with onConflictDoNothing + returning
  console.log("Step 3: Attempting duplicate insert with onConflictDoNothing...");

  const conflictResult = await db
    .insert(formDFilings)
    .values({
      cik: testCik,
      accessionNumber: testAccessionNumber,
      companyName: "Duplicate Attempt Corp",
      filingDate: "1999-01-01",
      isAmendment: false,
    })
    .onConflictDoNothing({ target: formDFilings.accessionNumber })
    .returning({ id: formDFilings.id });

  console.log(`  Returning result length: ${conflictResult.length}`);

  if (conflictResult.length === 0) {
    console.log("  ✅ onConflictDoNothing returns empty array on conflict\n");
  } else {
    console.log("  ❌ onConflictDoNothing returned non-empty array\n");
  }

  // Step 4: Verify still only one record and it's the original
  console.log("Step 4: Verifying original record preserved...");
  const finalCheck = await db
    .select()
    .from(formDFilings)
    .where(eq(formDFilings.accessionNumber, testAccessionNumber));

  console.log(`  Records found: ${finalCheck.length}`);

  if (finalCheck.length === 1 && finalCheck[0].companyName === testCompanyName) {
    console.log(`  Company Name: ${finalCheck[0].companyName}`);
    console.log("  ✅ Original record preserved (not overwritten)\n");
  } else if (finalCheck.length === 1 && finalCheck[0].companyName === "Duplicate Attempt Corp") {
    console.log("  ❌ Record was overwritten!\n");
  } else {
    console.log("  ❌ Unexpected state\n");
  }

  // Cleanup
  console.log("Cleaning up test data...");
  await db.delete(formDFilings).where(eq(formDFilings.accessionNumber, testAccessionNumber));
  console.log("  Test data removed\n");

  // Summary
  console.log("=== SUMMARY ===");
  const allPassed =
    firstCheck.length === 1 &&
    conflictResult.length === 0 &&
    finalCheck.length === 1 &&
    finalCheck[0].companyName === testCompanyName;

  if (allPassed) {
    console.log("✅ All deduplication tests passed!\n");
    console.log("Feature #18 verification:");
    console.log("  - Database unique constraint on accessionNumber works");
    console.log("  - onConflictDoNothing + returning() returns empty array on conflict");
    console.log("  - This allows proper counting of skipped duplicates in the API");
    console.log("  - Original records are preserved (not overwritten)");
    process.exit(0);
  } else {
    console.log("❌ Some tests failed");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
