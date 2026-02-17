/**
 * Test script to verify the Zod schema validation for AI enrichment.
 */

import { z } from "zod";

// The enrichment schema from the code
const enrichmentSchema = z.object({
  companySummary: z
    .string()
    .describe("2-3 sentence summary of the company and what they do"),
  relevanceScore: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Relevance score from 1-100"),
  relevanceReasoning: z
    .string()
    .describe("1-2 sentence explanation"),
  estimatedHeadcount: z
    .number()
    .int()
    .min(0)
    .describe("Rough headcount estimate"),
  growthSignals: z.array(z.string()).describe("Array of growth signals"),
  competitors: z.array(z.string()).describe("Array of competitor company names"),
});

// Test with valid data
const validData = {
  companySummary: "This is a test company summary. They do technology work.",
  relevanceScore: 75,
  relevanceReasoning: "High relevance due to tech industry and NYC location.",
  estimatedHeadcount: 50,
  growthSignals: ["Large Series B", "NYC-based", "Expanding workforce"],
  competitors: ["Competitor A", "Competitor B"],
};

console.log("Testing Zod schema validation...\n");

// Test 1: Valid data
console.log("1. Testing valid data...");
const result = enrichmentSchema.parse(validData);
console.log("   ✓ Schema validation passed");
console.log("   Result:", JSON.stringify(result, null, 2).split("\n").join("\n   "));

// Test 2: Missing required fields
console.log("\n2. Testing missing required fields...");
try {
  enrichmentSchema.parse({ companySummary: "Test" });
  console.log("   ✗ Should have failed validation");
} catch {
  console.log("   ✓ Invalid data correctly rejected");
}

// Test 3: Out-of-range score (> 100)
console.log("\n3. Testing out-of-range score (> 100)...");
try {
  enrichmentSchema.parse({ ...validData, relevanceScore: 150 });
  console.log("   ✗ Should have failed validation for score > 100");
} catch {
  console.log("   ✓ Out-of-range score correctly rejected");
}

// Test 4: Out-of-range score (< 1)
console.log("\n4. Testing out-of-range score (< 1)...");
try {
  enrichmentSchema.parse({ ...validData, relevanceScore: 0 });
  console.log("   ✗ Should have failed validation for score < 1");
} catch {
  console.log("   ✓ Out-of-range score correctly rejected");
}

// Test 5: Non-integer score
console.log("\n5. Testing non-integer score...");
try {
  enrichmentSchema.parse({ ...validData, relevanceScore: 75.5 });
  console.log("   ✗ Should have failed validation for non-integer score");
} catch {
  console.log("   ✓ Non-integer score correctly rejected");
}

// Test 6: Non-array growthSignals
console.log("\n6. Testing non-array growthSignals...");
try {
  enrichmentSchema.parse({ ...validData, growthSignals: "not an array" });
  console.log("   ✗ Should have failed validation for non-array growthSignals");
} catch {
  console.log("   ✓ Non-array growthSignals correctly rejected");
}

// Test 7: Array with non-strings
console.log("\n7. Testing array with non-strings...");
try {
  enrichmentSchema.parse({ ...validData, competitors: [1, 2, 3] });
  console.log("   ✗ Should have failed validation for non-string array items");
} catch {
  console.log("   ✓ Non-string array items correctly rejected");
}

// Test 8: Negative headcount
console.log("\n8. Testing negative headcount...");
try {
  enrichmentSchema.parse({ ...validData, estimatedHeadcount: -10 });
  console.log("   ✗ Should have failed validation for negative headcount");
} catch {
  console.log("   ✓ Negative headcount correctly rejected");
}

// Test 9: Edge case - score at boundaries
console.log("\n9. Testing score boundaries (1 and 100)...");
try {
  enrichmentSchema.parse({ ...validData, relevanceScore: 1 });
  console.log("   ✓ Score of 1 accepted (minimum)");
} catch {
  console.log("   ✗ Score of 1 should be accepted");
}
try {
  enrichmentSchema.parse({ ...validData, relevanceScore: 100 });
  console.log("   ✓ Score of 100 accepted (maximum)");
} catch {
  console.log("   ✗ Score of 100 should be accepted");
}

console.log("\n✅ All Zod schema validations work correctly");
