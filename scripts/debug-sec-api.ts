/**
 * Debug script to check SEC EFTS API response directly
 */

async function main() {
  const SEC_HEADERS = {
    "User-Agent": "NOCODE-GDN-LLC contact@nocodegdn.com",
    Accept: "application/json",
  };

  // Build URL for January 2025
  const url = new URL("https://efts.sec.gov/LATEST/search-index");
  url.searchParams.set("q", "*");
  url.searchParams.set("forms", "D");
  url.searchParams.set("dateRange", "custom");
  url.searchParams.set("startdt", "2025-01-01");
  url.searchParams.set("enddt", "2025-01-31");

  console.log("Request URL:", url.toString());
  console.log("Headers:", SEC_HEADERS);
  console.log();

  const response = await fetch(url.toString(), {
    headers: SEC_HEADERS,
  });

  console.log("Response status:", response.status);
  console.log("Response headers:", Object.fromEntries(response.headers.entries()));
  console.log();

  const text = await response.text();
  console.log("Response (first 2000 chars):");
  console.log(text.slice(0, 2000));
  console.log();

  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const json = JSON.parse(text);
      console.log("\nParsed JSON structure:");
      console.log("  hits exists:", "hits" in json);
      if (json.hits) {
        console.log("  hits.total:", json.hits.total);
        console.log("  hits.hits length:", json.hits.hits?.length);
      }
    } catch (e) {
      console.log("Failed to parse as JSON");
    }
  }
}

main().catch(console.error);
