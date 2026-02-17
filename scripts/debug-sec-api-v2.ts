/**
 * Debug script to test different SEC EFTS API query formats
 */

async function testQuery(description: string, url: string, headers: Record<string, string>) {
  console.log(`\n=== ${description} ===`);
  console.log("URL:", url);

  const response = await fetch(url, { headers });
  console.log("Status:", response.status);

  if (response.ok) {
    const json = await response.json();
    const hits = (json as { hits?: { total?: { value?: number }; hits?: unknown[] } }).hits;
    console.log("Total hits:", hits?.total?.value ?? 0);
    console.log("Hits returned:", hits?.hits?.length ?? 0);

    if (hits?.hits && hits.hits.length > 0) {
      const first = hits.hits[0] as { _id?: string; _source?: Record<string, unknown> };
      console.log("First hit _id:", first._id);
      console.log("First hit _source keys:", first._source ? Object.keys(first._source) : []);
    }
  } else {
    console.log("Error:", await response.text());
  }
}

async function main() {
  const SEC_HEADERS = {
    "User-Agent": "NOCODE-GDN-LLC contact@nocodegdn.com",
    Accept: "application/json",
  };

  // Test 1: Try 2024 dates (further back)
  await testQuery(
    "Test 1: Late 2024 (Nov-Dec 2024)",
    "https://efts.sec.gov/LATEST/search-index?q=*&forms=D&dateRange=custom&startdt=2024-11-01&enddt=2024-12-31",
    SEC_HEADERS
  );

  // Test 2: Try without wildcard query
  await testQuery(
    "Test 2: Empty query (should match all)",
    "https://efts.sec.gov/LATEST/search-index?forms=D&dateRange=custom&startdt=2024-11-01&enddt=2024-12-31",
    SEC_HEADERS
  );

  // Test 3: Try with explicit form query
  await testQuery(
    "Test 3: Form D in query",
    "https://efts.sec.gov/LATEST/search-index?q=form:D&dateRange=custom&startdt=2024-11-01&enddt=2024-12-31",
    SEC_HEADERS
  );

  // Test 4: Try with dateRange=1y (last year)
  await testQuery(
    "Test 4: dateRange=1y (last year)",
    "https://efts.sec.gov/LATEST/search-index?q=*&forms=D&dateRange=1y",
    SEC_HEADERS
  );

  // Test 5: Try with dateRange=90d
  await testQuery(
    "Test 5: dateRange=90d",
    "https://efts.sec.gov/LATEST/search-index?q=*&forms=D&dateRange=90d",
    SEC_HEADERS
  );
}

main().catch(console.error);
