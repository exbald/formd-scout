/**
 * Test SEC EDGAR fetcher with wider date range
 */

import { fetchRecentFormDFilings } from "../src/lib/edgar/fetcher";

async function main() {
  // Try a wider date range to verify API works
  const endDate = new Date("2025-12-31");
  const startDate = new Date("2025-12-01");

  console.log("Testing with wider date range:");
  console.log("Start:", startDate.toISOString().split("T")[0]);
  console.log("End:", endDate.toISOString().split("T")[0]);

  const filings = await fetchRecentFormDFilings(startDate, endDate);
  console.log("Filings found:", filings.length);

  if (filings.length > 0) {
    console.log("\nFirst 3 filings:");
    filings.slice(0, 3).forEach((f, i) => {
      console.log(
        `  ${i + 1}. ${f._source?.entity_name} - ${f._source?.file_date} - ${f._id}`
      );
    });

    // Verify required fields
    const sample = filings[0];
    console.log("\nRequired field check:");
    console.log("  entity_name:", typeof sample._source?.entity_name);
    console.log("  file_date:", typeof sample._source?.file_date);
    console.log("  form_type:", typeof sample._source?.form_type);
    console.log("  _id:", typeof sample._id);

    // Verify each hit has required fields
    const allHaveRequiredFields = filings.every((f) => {
      return (
        typeof f._source?.entity_name === "string" &&
        typeof f._source?.file_date === "string" &&
        typeof f._source?.form_type === "string" &&
        typeof f._id === "string"
      );
    });
    console.log("\nAll filings have required fields:", allHaveRequiredFields);
  }
}

main().catch(console.error);
