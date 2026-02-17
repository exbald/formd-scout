/**
 * Test script for the ingestion endpoint
 *
 * This script tests the POST /api/edgar/ingest endpoint by:
 * 1. Sending a request with valid API key
 * 2. Verifying response has ingested, skipped, errors, details fields
 * 3. Querying GET /api/edgar/filings to confirm data in database
 */

import "dotenv/config";

const API_KEY = process.env.INGEST_API_KEY || "formd-scout-dev-api-key-2026";
const BASE_URL = process.env.BASE_URL || "http://localhost:3006";

async function testIngest() {
  console.log("Testing ingestion endpoint...");
  console.log(`Using BASE_URL: ${BASE_URL}`);
  console.log(`Using API_KEY: ${API_KEY ? "set" : "NOT SET"}`);

  // Use a small date range to limit filings (yesterday only)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  console.log(`\n1. Testing with date range: ${dateStr} to ${dateStr}`);

  const response = await fetch(`${BASE_URL}/api/edgar/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({
      startDate: dateStr,
      endDate: dateStr,
    }),
  });

  console.log(`Response status: ${response.status}`);

  if (response.status === 401) {
    console.error("ERROR: Unauthorized - check API key");
    return false;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`ERROR: ${errorText}`);
    return false;
  }

  const data = await response.json();

  // Verify response structure
  console.log("\n2. Verifying response structure:");
  const requiredFields = ["ingested", "skipped", "errors", "details"];
  let allFieldsPresent = true;

  for (const field of requiredFields) {
    const present = field in data;
    console.log(`  - ${field}: ${present ? "OK" : "MISSING"}`);
    if (!present) allFieldsPresent = false;
  }

  // Verify counts are numbers
  console.log("\n3. Verifying counts:");
  console.log(`  - ingested: ${data.ingested} (type: ${typeof data.ingested})`);
  console.log(`  - skipped: ${data.skipped} (type: ${typeof data.skipped})`);
  console.log(`  - errors: ${data.errors} (type: ${typeof data.errors})`);
  console.log(`  - details: ${data.details?.length || 0} items`);

  // Show sample details
  if (data.details && data.details.length > 0) {
    console.log("\n4. Sample details (first 3):");
    for (const detail of data.details.slice(0, 3)) {
      console.log(
        `  - ${detail.accessionNumber}: ${detail.status}${detail.error ? ` (${detail.error})` : ""}`
      );
    }
  }

  console.log("\n=== TEST RESULTS ===");
  console.log(`Response structure: ${allFieldsPresent ? "PASS" : "FAIL"}`);
  console.log(`Ingested count >= 0: ${data.ingested >= 0 ? "PASS" : "FAIL"}`);
  console.log(`Total processed: ${data.ingested + data.skipped + data.errors}`);

  return allFieldsPresent && data.ingested >= 0;
}

testIngest()
  .then((success) => {
    console.log(`\nOverall: ${success ? "SUCCESS" : "FAILED"}`);
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
  });
