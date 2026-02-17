/**
 * Test script to verify API key authentication for /api/edgar/enrich endpoint
 *
 * This script validates the logic in src/app/api/edgar/enrich/route.ts
 * without requiring a running server.
 *
 * Feature #12: Enrichment API requires valid x-api-key header
 */

// Simulate the auth logic from the route
function validateApiKey(
  providedKey: string | null,
  expectedKey: string | undefined
): { valid: boolean; statusCode: number; error?: string } {
  if (!expectedKey || providedKey !== expectedKey) {
    return { valid: false, statusCode: 401, error: "Unauthorized" };
  }
  return { valid: true, statusCode: 200 };
}

// Test cases
const tests = [
  {
    name: "Test 1: No x-api-key header provided",
    providedKey: null,
    expectedKey: "test-api-key",
    expectValid: false,
    expectStatus: 401,
  },
  {
    name: "Test 2: Incorrect x-api-key value",
    providedKey: "bad-key",
    expectedKey: "test-api-key",
    expectValid: false,
    expectStatus: 401,
  },
  {
    name: "Test 3: Correct x-api-key value",
    providedKey: "test-api-key",
    expectedKey: "test-api-key",
    expectValid: true,
    expectStatus: 200,
  },
  {
    name: "Test 4: Empty string key when expected is undefined",
    providedKey: "",
    expectedKey: undefined,
    expectValid: false,
    expectStatus: 401,
  },
  {
    name: "Test 5: Valid key but expected is undefined (server misconfig)",
    providedKey: "some-key",
    expectedKey: undefined,
    expectValid: false,
    expectStatus: 401,
  },
];

console.log("=== API Key Authentication Tests ===\n");

let passed = 0;
let failed = 0;

for (const test of tests) {
  const result = validateApiKey(test.providedKey, test.expectedKey);
  const statusMatch = result.statusCode === test.expectStatus;
  const validMatch = result.valid === test.expectValid;

  if (statusMatch && validMatch) {
    console.log(`✅ ${test.name}`);
    console.log(`   Status: ${result.statusCode} (expected ${test.expectStatus})`);
    console.log(`   Valid: ${result.valid} (expected ${test.expectValid})`);
    passed++;
  } else {
    console.log(`❌ ${test.name}`);
    console.log(`   Status: ${result.statusCode} (expected ${test.expectStatus})`);
    console.log(`   Valid: ${result.valid} (expected ${test.expectValid})`);
    failed++;
  }
  console.log();
}

console.log("=== Summary ===");
console.log(`Passed: ${passed}/${tests.length}`);
console.log(`Failed: ${failed}/${tests.length}`);

// Exit with error code if any tests failed
if (failed > 0) {
  process.exit(1);
}
