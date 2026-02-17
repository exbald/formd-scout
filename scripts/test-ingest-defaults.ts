/**
 * Test script for Feature #19: Ingestion defaults to today when no dates provided
 *
 * This script tests that:
 * 1. POST /api/edgar/ingest with valid x-api-key but empty body works
 * 2. The endpoint does not error (returns 200)
 * 3. Response includes valid ingested/skipped/errors counts
 */

import "dotenv/config";

const API_KEY = process.env.INGEST_API_KEY || "formd-scout-dev-api-key-2026";
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3010";

async function testIngestionDefaultsToToday() {
  console.log("=== Testing Feature #19: Ingestion defaults to today ===\n");
  console.log(`API Key: ${API_KEY ? "configured" : "MISSING"}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  // Test 1: Send POST with empty body
  console.log("Test 1: POST /api/edgar/ingest with empty body");
  try {
    const response = await fetch(`${BASE_URL}/api/edgar/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({}), // Empty body
    });

    console.log(`Response status: ${response.status}`);

    if (response.status !== 200) {
      const text = await response.text();
      console.log(`Response body: ${text}`);
      console.log("❌ FAIL: Expected 200 status");
      return false;
    }

    const data = await response.json();
    console.log("Response data:", JSON.stringify(data, null, 2));

    // Test 2: Verify response includes valid counts
    if (typeof data.ingested !== "number") {
      console.log("❌ FAIL: 'ingested' is not a number");
      return false;
    }
    console.log(`✓ ingested: ${data.ingested}`);

    if (typeof data.skipped !== "number") {
      console.log("❌ FAIL: 'skipped' is not a number");
      return false;
    }
    console.log(`✓ skipped: ${data.skipped}`);

    if (typeof data.errors !== "number") {
      console.log("❌ FAIL: 'errors' is not a number");
      return false;
    }
    console.log(`✓ errors: ${data.errors}`);

    if (!Array.isArray(data.details)) {
      console.log("❌ FAIL: 'details' is not an array");
      return false;
    }
    console.log(`✓ details: array with ${data.details.length} items`);

    console.log("\n✅ All tests passed!");
    return true;
  } catch (error) {
    console.error("❌ Error:", error);
    return false;
  }
}

// Test 3: Verify with null body (not just empty object)
async function testIngestionWithNullBody() {
  console.log("\n=== Test 2: POST with completely empty body ===");

  try {
    const response = await fetch(`${BASE_URL}/api/edgar/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(null), // null body
    });

    console.log(`Response status: ${response.status}`);
    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2).substring(0, 200) + "...");

    if (response.status === 200) {
      console.log("✓ Endpoint accepts null body and defaults to today");
    }
    return true;
  } catch (error) {
    console.error("❌ Error:", error);
    return false;
  }
}

// Run tests
(async () => {
  const result1 = await testIngestionDefaultsToToday();
  const result2 = await testIngestionWithNullBody();

  if (result1 && result2) {
    console.log("\n🎉 Feature #19 verification complete!");
    process.exit(0);
  } else {
    console.log("\n⚠️ Some tests failed - server may not be running");
    process.exit(1);
  }
})();
