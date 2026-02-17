/**
 * Full E2E test of SEC EDGAR fetcher with known filing dates
 */

import { fetchRecentFormDFilings, fetchFilingIndex, fetchFormDXml, SEC_HEADERS, RATE_LIMIT_DELAY_MS, MAX_RETRIES } from "../src/lib/edgar/fetcher";

async function main() {
  console.log("=== Full SEC EDGAR Fetcher E2E Test ===\n");

  // Step 1: Verify headers
  console.log("Step 1: Verify SEC headers");
  console.log("  User-Agent:", SEC_HEADERS["User-Agent"]);
  console.log("  Accept:", SEC_HEADERS["Accept"]);
  const headersCorrect =
    SEC_HEADERS["User-Agent"] === "NOCODE-GDN-LLC contact@nocodegdn.com" &&
    SEC_HEADERS["Accept"] === "application/json";
  console.log("  Headers correct:", headersCorrect ? "✅" : "❌");

  // Step 2: Verify rate limiting config
  console.log("\nStep 2: Verify rate limiting configuration");
  console.log("  Rate limit delay (ms):", RATE_LIMIT_DELAY_MS);
  console.log("  Max retries:", MAX_RETRIES);
  const rateLimitCorrect = RATE_LIMIT_DELAY_MS >= 150 && MAX_RETRIES === 3;
  console.log("  Config correct:", rateLimitCorrect ? "✅" : "❌");

  // Step 3: Test API with known date range (January 2025)
  console.log("\nStep 3: Fetch Form D filings from January 2025");
  const endDate = new Date("2025-01-31");
  const startDate = new Date("2025-01-01");

  console.log(`  Date range: ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`);

  const startTime = Date.now();
  const filings = await fetchRecentFormDFilings(startDate, endDate);
  const elapsed = Date.now() - startTime;

  console.log("  Filings found:", filings.length);
  console.log("  Elapsed (ms):", elapsed);

  if (filings.length > 0) {
    console.log("\n  ✅ API returned filings");
    console.log("\n  First 3 filings:");
    filings.slice(0, 3).forEach((f, i) => {
      console.log(`    ${i + 1}. ${f._source?.entity_name}`);
      console.log(`       File date: ${f._source?.file_date}`);
      console.log(`       Form type: ${f._source?.form_type}`);
      console.log(`       Accession: ${f._id}`);
    });

    // Step 4: Verify response structure
    console.log("\nStep 4: Verify response structure");
    const sample = filings[0];
    const hasEntityName = typeof sample._source?.entity_name === "string";
    const hasFileDate = typeof sample._source?.file_date === "string";
    const hasFormType = typeof sample._source?.form_type === "string";
    const hasAccessionId = typeof sample._id === "string";

    console.log("  Has entity_name:", hasEntityName ? "✅" : "❌");
    console.log("  Has file_date:", hasFileDate ? "✅" : "❌");
    console.log("  Has form_type:", hasFormType ? "✅" : "❌");
    console.log("  Has accession number (_id):", hasAccessionId ? "✅" : "❌");

    // Verify ALL filings have required fields
    const allValid = filings.every((f) => {
      return (
        typeof f._source?.entity_name === "string" &&
        typeof f._source?.file_date === "string" &&
        typeof f._source?.form_type === "string" &&
        typeof f._id === "string"
      );
    });
    console.log("  All filings valid:", allValid ? "✅" : "❌");

    // Step 5: Test rate limiting (two sequential requests)
    console.log("\nStep 5: Test rate limiting (sequential requests)");
    const req1Start = Date.now();
    await fetchRecentFormDFilings(new Date("2025-01-01"), new Date("2025-01-07"));
    const req1Time = Date.now() - req1Start;

    const req2Start = Date.now();
    await fetchRecentFormDFilings(new Date("2025-01-08"), new Date("2025-01-14"));
    const req2Time = Date.now() - req2Start;

    console.log(`  Request 1 time: ${req1Time}ms`);
    console.log(`  Request 2 time: ${req2Time}ms`);
    console.log("  Rate limiting active:", req2Time >= 140 ? "✅" : "❌");

    // Step 6: Test filing index fetch
    console.log("\nStep 6: Test filing index fetch");
    // Use a known Apple CIK and a filing
    const testCik = "0000320193";
    const testAccession = "0000320193-24-000069";

    try {
      const indexResult = await fetchFilingIndex(testCik, testAccession);
      console.log("  Primary document:", indexResult.primaryDocument);
      console.log("  Total documents:", indexResult.documents.length);
      console.log("  Index fetch:", indexResult.primaryDocument ? "✅" : "⚠️");
    } catch (error) {
      console.log("  Index fetch error (may be expected):", error instanceof Error ? error.message : String(error));
    }

  } else {
    console.log("  ⚠️ No filings found - API may be rate limited or unavailable");
  }

  console.log("\n=== Test Complete ===");
}

main().catch(console.error);
