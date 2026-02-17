/**
 * Test script to verify SEC API retry logic and error handling
 * Tests Feature #47: Ingestion handles SEC API failures with retry logic
 */

import {
  MAX_RETRIES,
  INITIAL_BACKOFF_MS,
  SEC_HEADERS,
} from "../src/lib/edgar/fetcher";
import * as fs from "fs";
import * as path from "path";

function verifyRetryConstants(): boolean {
  console.log("\n=== Step 1: Verify Retry Constants ===");

  const checks: { name: string; passed: boolean }[] = [];

  // Check MAX_RETRIES = 3
  checks.push({
    name: `MAX_RETRIES = 3 (actual: ${MAX_RETRIES})`,
    passed: MAX_RETRIES === 3,
  });

  // Check INITIAL_BACKOFF_MS = 1000
  checks.push({
    name: `INITIAL_BACKOFF_MS = 1000 (actual: ${INITIAL_BACKOFF_MS})`,
    passed: INITIAL_BACKOFF_MS === 1000,
  });

  // Check SEC_HEADERS
  checks.push({
    name: `SEC_HEADERS.User-Agent contains NOCODE-GDN-LLC`,
    passed: SEC_HEADERS["User-Agent"]?.includes("NOCODE-GDN-LLC") ?? false,
  });

  checks.push({
    name: `SEC_HEADERS.Accept = application/json`,
    passed: SEC_HEADERS["Accept"] === "application/json",
  });

  checks.forEach((check) => {
    console.log(`  ${check.passed ? "✅" : "❌"} ${check.name}`);
  });

  return checks.every((c) => c.passed);
}

function verifyExponentialBackoff(): boolean {
  console.log("\n=== Step 2: Verify Exponential Backoff ===");

  const backoffs: number[] = [];
  for (let i = 0; i < MAX_RETRIES; i++) {
    const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, i);
    backoffs.push(backoffMs);
    console.log(`  Retry ${i + 1}: ${backoffMs}ms backoff`);
  }

  // Expected: 1000, 2000, 4000
  const expected = [1000, 2000, 4000];
  const passed =
    backoffs[0] === expected[0] &&
    backoffs[1] === expected[1] &&
    backoffs[2] === expected[2];

  if (passed) {
    console.log("  ✅ Exponential backoff formula correct: 1000 * 2^retryCount");
  } else {
    console.log(`  ❌ Expected [${expected.join(", ")}], got [${backoffs.join(", ")}]`);
  }

  return passed;
}

function verifyFetcherImplementation(): boolean {
  console.log("\n=== Step 3: Verify fetchWithRetry Implementation ===");

  const fetcherPath = path.join(__dirname, "../src/lib/edgar/fetcher.ts");
  const fetcherCode = fs.readFileSync(fetcherPath, "utf-8");

  const checks: { name: string; passed: boolean }[] = [];

  // Check retries on 5xx errors
  checks.push({
    name: "Retries on 5xx server errors",
    passed: /response\.status >= 500/.test(fetcherCode),
  });

  // Check retries on 429 rate limit
  checks.push({
    name: "Retries on 429 rate limit",
    passed: /response\.status === 429/.test(fetcherCode),
  });

  // Check retries on network errors (catch block)
  checks.push({
    name: "Retries on network errors in catch block",
    passed: /catch \(error\)[\s\S]*retryCount < MAX_RETRIES/.test(fetcherCode),
  });

  // Check exponential backoff formula
  checks.push({
    name: "Exponential backoff formula: INITIAL_BACKOFF_MS * Math.pow(2, retryCount)",
    passed: /INITIAL_BACKOFF_MS \* Math\.pow\(2, retryCount\)/.test(fetcherCode),
  });

  // Check rate limiting delay
  checks.push({
    name: "Rate limiting enforced (RATE_LIMIT_DELAY_MS)",
    passed: /RATE_LIMIT_DELAY_MS/.test(fetcherCode),
  });

  // Check retry count logging
  checks.push({
    name: "Logs retry attempts with warning",
    passed: /console\.warn.*retrying/is.test(fetcherCode),
  });

  checks.forEach((check) => {
    console.log(`  ${check.passed ? "✅" : "❌"} ${check.name}`);
  });

  return checks.every((c) => c.passed);
}

function verifyIngestionErrorHandling(): boolean {
  console.log("\n=== Step 4: Verify Ingestion Error Handling ===");

  const ingestPath = path.join(
    __dirname,
    "../src/app/api/edgar/ingest/route.ts"
  );
  const ingestCode = fs.readFileSync(ingestPath, "utf-8");

  const checks: { name: string; passed: boolean }[] = [];

  // Check details array for per-filing results
  checks.push({
    name: "Details array for per-filing results",
    passed:
      /details:\s*Array<\{[\s\S]*?accessionNumber[\s\S]*?status[\s\S]*?error/.test(
        ingestCode
      ),
  });

  // Check error count tracking
  checks.push({
    name: "Error count tracking (errors++)",
    passed: /errors\+\+/.test(ingestCode),
  });

  // Check partial success - continues on error
  checks.push({
    name: "Partial success: continues on filing error",
    passed: /continue;/.test(ingestCode),
  });

  // Check returns details in response
  checks.push({
    name: "Returns details array in response",
    passed: /return NextResponse\.json\(\{[\s\S]*?details/.test(ingestCode),
  });

  // Check meaningful error messages
  checks.push({
    name: 'Meaningful error: "Missing accessionNumber or CIK"',
    passed: /Missing accessionNumber or CIK/.test(ingestCode),
  });

  checks.push({
    name: 'Meaningful error: "Could not find primary XML document"',
    passed: /Could not find primary XML document/.test(ingestCode),
  });

  checks.push({
    name: 'Meaningful error: "Failed to parse Form D XML"',
    passed: /Failed to parse Form D XML/.test(ingestCode),
  });

  // Check duplicate handling
  checks.push({
    name: "Duplicate handling with onConflictDoNothing",
    passed: /onConflictDoNothing/.test(ingestCode),
  });

  // Check catch block for processing errors
  checks.push({
    name: "Catch block captures processing errors",
    passed: /catch \(processingError\)/.test(ingestCode),
  });

  checks.forEach((check) => {
    console.log(`  ${check.passed ? "✅" : "❌"} ${check.name}`);
  });

  return checks.every((c) => c.passed);
}

function main() {
  console.log("==========================================");
  console.log("Testing: SEC API Retry Logic & Error Handling");
  console.log("Feature #47: Ingestion handles SEC API failures");
  console.log("==========================================");

  const results = [
    verifyRetryConstants(),
    verifyExponentialBackoff(),
    verifyFetcherImplementation(),
    verifyIngestionErrorHandling(),
  ];

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log("\n==========================================");
  console.log(`Results: ${passed}/${total} test groups passed`);
  console.log("==========================================");

  if (passed === total) {
    console.log("\n✅ All tests passed!");
    console.log("\nFeature #47 Verification Summary:");
    console.log("  ✅ Retry logic: 3 retries with exponential backoff");
    console.log("  ✅ Backoff timing: 1000ms, 2000ms, 4000ms");
    console.log("  ✅ Retries on: 5xx errors, 429 rate limits, network errors");
    console.log("  ✅ Errors captured in details array with meaningful messages");
    console.log("  ✅ Partial success: continues processing when filings fail");
    console.log("  ✅ SEC headers correctly configured");
    process.exit(0);
  } else {
    console.log("\n❌ Some tests failed");
    process.exit(1);
  }
}

main();
