/**
 * Debug script to examine Form D XML structure
 */

import {
  fetchRecentFormDFilings,
  fetchFilingIndex,
  fetchFormDXml,
  buildFormDXmlUrl,
} from "../src/lib/edgar/fetcher";
import { parseFormDXml, validateParsedFiling } from "../src/lib/edgar/parser";
import { extractFilingInfo } from "../src/lib/edgar/types";

async function debug() {
  const startDate = new Date("2025-01-15");
  const endDate = new Date("2025-01-15");

  console.log("Fetching filings from SEC...");
  const hits = await fetchRecentFormDFilings(startDate, endDate);
  console.log(`Found ${hits.length} filings`);

  // Process just one filing
  const hit = hits[0];
  if (!hit) {
    console.log("No filings found");
    return;
  }

  const info = extractFilingInfo(hit);
  console.log("\nExtracted info:");
  console.log(`  CIK: ${info.cik}`);
  console.log(`  Company: ${info.companyName}`);
  console.log(`  Accession: ${info.accessionNumber}`);

  // Fetch index
  console.log("\nFetching filing index...");
  const indexResult = await fetchFilingIndex(info.cik, info.accessionNumber);
  console.log(`Primary document: ${indexResult.primaryDocument}`);
  console.log(`All documents: ${indexResult.documents.map((d: { name: string }) => d.name).join(", ")}`);

  if (!indexResult.primaryDocument) {
    console.log("No primary document found!");
    return;
  }

  // Fetch XML
  const xmlUrl = buildFormDXmlUrl(info.cik, info.accessionNumber, indexResult.primaryDocument);
  console.log(`\nFetching XML from: ${xmlUrl}`);
  const xmlString = await fetchFormDXml(xmlUrl);

  // Show first 500 chars of XML
  console.log("\nXML (first 2000 chars):");
  console.log(xmlString.slice(0, 2000));
  console.log("...");

  // Try parsing
  console.log("\nAttempting to parse...");
  const parsed = parseFormDXml(xmlString, info.accessionNumber, info.cik);

  if (!parsed) {
    console.log("Parse returned NULL");
    return;
  }

  console.log("\nParsed result:");
  console.log(JSON.stringify(parsed, null, 2));

  console.log("\nValidation:");
  console.log(`  Valid: ${validateParsedFiling(parsed)}`);
}

debug().catch(console.error);
