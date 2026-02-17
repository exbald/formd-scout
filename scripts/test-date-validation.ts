/**
 * Test script to verify date validation in ingestion API
 * Tests Feature #64: Ingestion API validates date format in request body
 */

async function testDateValidation() {
  const API_KEY = "formd-scout-dev-api-key-2026";
  const BASE_URL = "http://localhost:3006";

  console.log("=== Testing Date Validation in Ingestion API ===\n");

  // Test case 1: Invalid date format "not-a-date"
  console.log("Test 1: Invalid date 'not-a-date'");
  try {
    const response1 = await fetch(`${BASE_URL}/api/edgar/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({ startDate: "not-a-date" }),
    });

    if (response1.status === 400) {
      const data1 = await response1.json();
      console.log(`  ✅ Status: ${response1.status}`);
      console.log(`  ✅ Error message: ${data1.error}`);
    } else {
      console.log(`  ❌ Expected 400, got ${response1.status}`);
    }
  } catch (error) {
    console.log(`  ❌ Request failed: ${error}`);
  }

  // Test case 2: Invalid date "2025-13-32"
  console.log("\nTest 2: Invalid date '2025-13-32'");
  try {
    const response2 = await fetch(`${BASE_URL}/api/edgar/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({ startDate: "2025-13-32" }),
    });

    if (response2.status === 400) {
      const data2 = await response2.json();
      console.log(`  ✅ Status: ${response2.status}`);
      console.log(`  ✅ Error message: ${data2.error}`);
    } else {
      console.log(`  ❌ Expected 400, got ${response2.status}`);
    }
  } catch (error) {
    console.log(`  ❌ Request failed: ${error}`);
  }

  // Test case 3: Valid date "2025-01-15"
  console.log("\nTest 3: Valid date '2025-01-15'");
  try {
    const response3 = await fetch(`${BASE_URL}/api/edgar/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({
        startDate: "2025-01-15",
        endDate: "2025-01-15"
      }),
    });

    if (response3.status === 200) {
      const data3 = await response3.json();
      console.log(`  ✅ Status: ${response3.status}`);
      console.log(`  ✅ Response: ingested=${data3.ingested}, skipped=${data3.skipped}, errors=${data3.errors}`);
    } else {
      console.log(`  ❌ Expected 200, got ${response3.status}`);
      const data3 = await response3.json();
      console.log(`     Response: ${JSON.stringify(data3)}`);
    }
  } catch (error) {
    console.log(`  ❌ Request failed: ${error}`);
  }

  console.log("\n=== Date Validation Tests Complete ===");
}

testDateValidation().catch(console.error);
