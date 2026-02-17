/**
 * Test the ingestion endpoint response format with a small date range
 */

const API_KEY = "formd-scout-dev-api-key-2026";
const BASE_URL = "http://localhost:34567";

async function test() {
  // Use a date range that likely has no filings to get quick response
  const response = await fetch(`${BASE_URL}/api/edgar/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({
      startDate: "2020-01-01",
      endDate: "2020-01-01",
    }),
  });

  console.log(`Status: ${response.status}`);

  if (response.ok) {
    const data = await response.json();
    console.log("\nResponse structure:");
    console.log(`  ingested: ${data.ingested} (type: ${typeof data.ingested})`);
    console.log(`  skipped: ${data.skipped} (type: ${typeof data.skipped})`);
    console.log(`  errors: ${data.errors} (type: ${typeof data.errors})`);
    console.log(`  details: Array with ${data.details?.length ?? 0} items`);

    // Verify required fields
    const requiredFields = ["ingested", "skipped", "errors", "details"];
    let allPresent = true;
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.log(`  MISSING: ${field}`);
        allPresent = false;
      }
    }

    if (allPresent) {
      console.log("\n✓ All required fields present");
    }

    // Verify counts are numbers >= 0
    if (typeof data.ingested === "number" && data.ingested >= 0 &&
        typeof data.skipped === "number" && data.skipped >= 0 &&
        typeof data.errors === "number" && data.errors >= 0) {
      console.log("✓ All counts are valid numbers >= 0");
    }

    return true;
  } else {
    const error = await response.text();
    console.log(`Error: ${error}`);
    return false;
  }
}

test().then(success => process.exit(success ? 0 : 1)).catch(err => {
  console.error(err);
  process.exit(1);
});
