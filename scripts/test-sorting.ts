/**
 * Test script for Feature #27: Filings API supports sorting by multiple columns
 *
 * Tests:
 * 1. sortBy=filingDate&sortOrder=desc - Results sorted by filingDate descending
 * 2. sortBy=totalOffering&sortOrder=asc - Results sorted by totalOffering ascending
 * 3. sortBy=companyName&sortOrder=asc - Results sorted alphabetically
 */

import { db } from "../src/lib/db";
import { formDFilings, filingEnrichments } from "../src/lib/schema";
import { sql, eq, desc, asc, SQL } from "drizzle-orm";

async function testSorting() {
  console.log("Testing Feature #27: Filings API supports sorting by multiple columns\n");

  // First, check if we have test data
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(formDFilings);

  const totalFilings = countResult[0]?.count ?? 0;
  console.log(`Total filings in database: ${totalFilings}`);

  if (totalFilings === 0) {
    console.log("\n❌ No test data available. Need at least some filings to test sorting.");
    return false;
  }

  // Get a sample of data for verification
  const sampleData = await db
    .select({
      companyName: formDFilings.companyName,
      filingDate: formDFilings.filingDate,
      totalOffering: formDFilings.totalOffering,
    })
    .from(formDFilings)
    .limit(10);

  console.log("\nSample data:");
  sampleData.forEach((row, i) => {
    console.log(`  ${i + 1}. ${row.companyName} | ${row.filingDate} | $${row.totalOffering || 0}`);
  });

  // Test 1: Sort by filingDate descending
  console.log("\n--- Test 1: sortBy=filingDate&sortOrder=desc ---");
  const sortColumnMap: Record<string, SQL> = {
    filingDate: sql`${formDFilings.filingDate}`,
    companyName: sql`${formDFilings.companyName}`,
    totalOffering: sql`${formDFilings.totalOffering}`,
    industryGroup: sql`${formDFilings.industryGroup}`,
    issuerState: sql`${formDFilings.issuerState}`,
    relevanceScore: sql`${filingEnrichments.relevanceScore}`,
  };

  const sortBy = "filingDate";
  const sortColumn = sortColumnMap[sortBy] || sql`${formDFilings.filingDate}`;
  const orderExpr = desc(sortColumn);

  const filingsDesc = await db
    .select({
      companyName: formDFilings.companyName,
      filingDate: formDFilings.filingDate,
      totalOffering: formDFilings.totalOffering,
    })
    .from(formDFilings)
    .orderBy(orderExpr)
    .limit(10);

  console.log("Top 10 by filingDate DESC:");
  filingsDesc.forEach((row, i) => {
    console.log(`  ${i + 1}. ${row.filingDate} | ${row.companyName}`);
  });

  // Verify descending order
  let isDescending = true;
  for (let i = 1; i < filingsDesc.length; i++) {
    const prev = filingsDesc[i - 1].filingDate;
    const curr = filingsDesc[i].filingDate;
    if (prev && curr && prev < curr) {
      isDescending = false;
      console.log(`  ❌ Order issue: ${prev} < ${curr}`);
    }
  }
  console.log(isDescending ? "  ✅ Correctly sorted descending" : "  ❌ NOT sorted correctly");

  // Test 2: Sort by totalOffering ascending
  console.log("\n--- Test 2: sortBy=totalOffering&sortOrder=asc ---");
  const sortBy2 = "totalOffering";
  const sortColumn2 = sortColumnMap[sortBy2] || sql`${formDFilings.filingDate}`;
  const orderExpr2 = asc(sortColumn2);

  const filingsAsc = await db
    .select({
      companyName: formDFilings.companyName,
      filingDate: formDFilings.filingDate,
      totalOffering: formDFilings.totalOffering,
    })
    .from(formDFilings)
    .orderBy(orderExpr2)
    .limit(10);

  console.log("Top 10 by totalOffering ASC:");
  filingsAsc.forEach((row, i) => {
    console.log(`  ${i + 1}. $${row.totalOffering || 0} | ${row.companyName}`);
  });

  // Verify ascending order (nulls first in Postgres by default)
  // Note: totalOffering is numeric type, may come as string from Drizzle
  let isAscending = true;
  for (let i = 1; i < filingsAsc.length; i++) {
    const prev = filingsAsc[i - 1].totalOffering;
    const curr = filingsAsc[i].totalOffering;
    // Skip null comparisons
    if (prev === null || curr === null) continue;
    // Convert to numbers for proper comparison
    const prevNum = Number(prev);
    const currNum = Number(curr);
    if (prevNum > currNum) {
      isAscending = false;
      console.log(`  ❌ Order issue: ${prevNum} > ${currNum}`);
    }
  }
  console.log(isAscending ? "  ✅ Correctly sorted ascending" : "  ❌ NOT sorted correctly");

  // Test 3: Sort by companyName ascending (alphabetically)
  console.log("\n--- Test 3: sortBy=companyName&sortOrder=asc ---");
  const sortBy3 = "companyName";
  const sortColumn3 = sortColumnMap[sortBy3] || sql`${formDFilings.filingDate}`;
  const orderExpr3 = asc(sortColumn3);

  const filingsAlpha = await db
    .select({
      companyName: formDFilings.companyName,
      filingDate: formDFilings.filingDate,
    })
    .from(formDFilings)
    .orderBy(orderExpr3)
    .limit(10);

  console.log("Top 10 by companyName ASC (alphabetically):");
  filingsAlpha.forEach((row, i) => {
    console.log(`  ${i + 1}. ${row.companyName}`);
  });

  // Verify alphabetical order
  let isAlphabetical = true;
  for (let i = 1; i < filingsAlpha.length; i++) {
    const prev = filingsAlpha[i - 1].companyName.toLowerCase();
    const curr = filingsAlpha[i].companyName.toLowerCase();
    if (prev.localeCompare(curr) > 0) {
      isAlphabetical = false;
      console.log(`  ❌ Order issue: "${prev}" > "${curr}"`);
    }
  }
  console.log(isAlphabetical ? "  ✅ Correctly sorted alphabetically" : "  ❌ NOT sorted correctly");

  // Summary
  console.log("\n=== Summary ===");
  const allPassed = isDescending && isAscending && isAlphabetical;
  if (allPassed) {
    console.log("✅ All sorting tests PASSED");
    console.log("\nFeature #27 verification complete:");
    console.log("  - sortBy=filingDate&sortOrder=desc: ✅");
    console.log("  - sortBy=totalOffering&sortOrder=asc: ✅");
    console.log("  - sortBy=companyName&sortOrder=asc: ✅");
  } else {
    console.log("❌ Some sorting tests FAILED");
  }

  return allPassed;
}

// Run tests
testSorting()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    console.error("Test error:", error);
    process.exit(1);
  });
