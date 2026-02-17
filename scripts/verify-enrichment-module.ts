/**
 * Verify the AI enrichment module code structure.
 */

import fs from "fs";

const code = fs.readFileSync("src/lib/ai/enrichment.ts", "utf8");

const checks = [
  { name: "Imports createOpenRouter", test: code.includes("createOpenRouter") },
  { name: "Imports generateObject from ai", test: code.includes("generateObject") },
  { name: "Imports zod for schema", test: code.includes('from "zod"') },
  { name: "Has companySummary in schema", test: code.includes("companySummary") },
  { name: "Has relevanceScore with int/min/max validation", test: code.includes("relevanceScore") && code.includes(".int()") && code.includes(".min(1)") && code.includes(".max(100)") },
  { name: "Has relevanceReasoning in schema", test: code.includes("relevanceReasoning") },
  { name: "Has estimatedHeadcount with int/min validation", test: code.includes("estimatedHeadcount") && code.includes(".int()") && code.includes(".min(0)") },
  { name: "Has growthSignals as array of strings", test: code.includes("growthSignals") && code.includes(".array(z.string())") },
  { name: "Has competitors as array of strings", test: code.includes("competitors") && code.includes(".array(z.string())") },
  { name: "Has EnrichmentInput interface", test: code.includes("export interface EnrichmentInput") },
  { name: "Has EnrichmentResult interface", test: code.includes("export interface EnrichmentResult") },
  { name: "Has enrichFiling function", test: code.includes("export async function enrichFiling") },
  { name: "Has getEnrichmentModelName function", test: code.includes("export function getEnrichmentModelName") },
  { name: "Has retry logic", test: code.includes("attempt < 2") || code.includes("for (let attempt") },
  { name: "Returns result object (not throws) on failure", test: code.includes("success: false") },
  { name: "Has buildEnrichmentPrompt function", test: code.includes("function buildEnrichmentPrompt") },
];

let passed = 0;
checks.forEach((c) => {
  const status = c.test ? "✓" : "✗";
  console.log(`${status} ${c.name}`);
  if (c.test) passed++;
});

console.log("");
console.log(`${passed}/${checks.length} checks passed`);
process.exit(passed === checks.length ? 0 : 1);
