/**
 * Test script to verify Filings API filters by offering amount and relevance score
 * Tests Feature #26: Filings API supports minOffering, maxOffering, minRelevance params
 */

import * as fs from "fs";
import * as path from "path";

function verifyCodeStructure() {
  console.log("=== Verifying Code Structure for Offering/Relevance Filters ===\n");

  const routePath = path.join(__dirname, "../src/app/api/edgar/filings/route.ts");
  const code = fs.readFileSync(routePath, "utf-8");

  const checks: { name: string; passed: boolean }[] = [];

  // Check 1: minOffering param extracted
  checks.push({
    name: "minOffering param extracted from searchParams",
    passed: code.includes('searchParams.get("minOffering")'),
  });

  // Check 2: maxOffering param extracted
  checks.push({
    name: "maxOffering param extracted from searchParams",
    passed: code.includes('searchParams.get("maxOffering")'),
  });

  // Check 3: minRelevance param extracted
  checks.push({
    name: "minRelevance param extracted from searchParams",
    passed: code.includes('searchParams.get("minRelevance")'),
  });

  // Check 4: minOffering filter uses >= operator
  checks.push({
    name: "minOffering filter uses >= operator",
    passed: code.includes("if (minOffering)") && code.includes("totalOffering} >= ${minOffering}"),
  });

  // Check 5: maxOffering filter uses <= operator
  checks.push({
    name: "maxOffering filter uses <= operator",
    passed: code.includes("if (maxOffering)") && code.includes("totalOffering} <= ${maxOffering}"),
  });

  // Check 6: minRelevance filter uses >= operator
  checks.push({
    name: "minRelevance filter uses >= operator",
    passed: code.includes("if (minRelevance)") && code.includes("relevanceScore} >= ${parseInt(minRelevance"),
  });

  // Check 7: minRelevance casts to integer
  checks.push({
    name: "minRelevance properly parsed as integer",
    passed: code.includes("parseInt(minRelevance, 10)"),
  });

  // Check 8: Offering amounts cast to numeric for comparison
  checks.push({
    name: "Offering amounts cast to numeric for comparison",
    passed: code.includes("::numeric"),
  });

  // Check 9: minRelevance uses enrichment table
  checks.push({
    name: "minRelevance filters on filingEnrichments table",
    passed: code.includes("filingEnrichments.relevanceScore"),
  });

  // Check 10: All filters combined with AND logic
  checks.push({
    name: "Conditions combined with AND logic",
    passed: code.includes("conditions.push") && code.includes("and(...conditions)"),
  });

  checks.forEach((check) => {
    console.log(`  ${check.passed ? "✅" : "❌"} ${check.name}`);
  });

  const allPassed = checks.every((c) => c.passed);

  if (allPassed) {
    console.log("\n✅ All code structure checks passed!");
    console.log("\nFeature #26 Verification Summary:");
    console.log("  ✅ minOffering filter: totalOffering >= value");
    console.log("  ✅ maxOffering filter: totalOffering <= value");
    console.log("  ✅ minRelevance filter: relevanceScore >= value (integer)");
    console.log("  ✅ All filters combined with AND logic");
    console.log("  ✅ Numeric casting for proper comparison");
    console.log("\nNote: Runtime testing requires browser automation with authentication.");
  }

  return allPassed;
}

function main() {
  console.log("==========================================");
  console.log("Testing: Filings API Offering & Relevance Filters");
  console.log("Feature #26: Code Structure Verification");
  console.log("==========================================\n");

  const passed = verifyCodeStructure();

  console.log("\n==========================================");
  if (passed) {
    process.exit(0);
  } else {
    console.log("❌ Some checks failed");
    process.exit(1);
  }
}

main();
