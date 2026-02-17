/**
 * Verify the enrichment API code structure without needing a live server.
 * This checks that all required code patterns are present.
 */

import fs from "fs";

const code = fs.readFileSync("src/app/api/edgar/enrich/route.ts", "utf8");

const checks = [
  { name: "Exports POST handler", test: code.includes("export async function POST") },
  { name: "Checks x-api-key header", test: code.includes('request.headers.get("x-api-key")') },
  { name: "Checks INGEST_API_KEY env var", test: code.includes("process.env.INGEST_API_KEY") },
  { name: "Returns 401 on invalid API key", test: code.includes('{ error: "Unauthorized" }, { status: 401 }') },
  { name: "Checks OPENROUTER_API_KEY env var", test: code.includes("process.env.OPENROUTER_API_KEY") },
  { name: "Returns 500 when no OpenRouter key", test: code.includes("OPENROUTER_API_KEY environment variable is not configured") },
  { name: "Parses filingId from body", test: code.includes("const { filingId } = body") },
  { name: "Has enrichSingleFiling function", test: code.includes("async function enrichSingleFiling") },
  { name: "Fetches filing by ID", test: code.includes(".where(eq(formDFilings.id, filingId))") },
  { name: "Returns error for non-existent filing", test: code.includes("Filing not found") },
  { name: "Checks for existing enrichment", test: code.includes(".where(eq(filingEnrichments.filingId, filingId))") },
  { name: "Returns error for already enriched", test: code.includes("Filing already enriched") },
  { name: "Calls enrichFiling from AI module", test: code.includes("await enrichFiling(enrichmentInput)") },
  { name: "Stores enrichment in database", test: code.includes("await db.insert(filingEnrichments).values") },
  { name: "Returns enriched count in response", test: code.includes("enriched: enriched.length") },
  { name: "Returns errors array in response", test: code.includes("errors: errors.length") },
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
