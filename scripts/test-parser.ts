/**
 * Test script for Form D XML parser
 * Tests all required parsing scenarios per feature #16
 *
 * Run with: npx tsx scripts/test-parser.ts
 */

import { parseFormDXml, validateParsedFiling } from "../src/lib/edgar/parser";

// Test 1: Complete Form D XML with all fields
const completeXml = `<?xml version="1.0"?>
<edgarSubmission>
  <headerData>
    <submissionType>D</submissionType>
    <filingDate>2025-01-15</filingDate>
  </headerData>
  <formData>
    <primaryIssuer>
      <cik>0001234567</cik>
      <entityName>Acme Technologies Inc</entityName>
      <entityType>Corporation</entityType>
      <stateOfIncorporation>DE</stateOfIncorporation>
      <sic>7371</sic>
      <issuerAddress>
        <street1>123 Main Street</street1>
        <city>New York</city>
        <stateOrCountry>NY</stateOrCountry>
        <zip>10001</zip>
      </issuerAddress>
      <issuerPhoneNumber>212-555-1234</issuerPhoneNumber>
    </primaryIssuer>
    <offeringData>
      <industryGroup>Technology</industryGroup>
      <issuerSize>
        <revenueRange>$1-5 million</revenueRange>
      </issuerSize>
      <federalExemptions>
        <exemption>
          <item>Rule 506(b)</item>
        </exemption>
        <exemption>
          <item>Rule 506(c)</item>
        </exemption>
      </federalExemptions>
      <typeOfFiling>
        <dateOfFirstSale>2025-01-01</dateOfFirstSale>
        <moreThanOneYear>true</moreThanOneYear>
      </typeOfFiling>
      <offeringSalesAmounts>
        <totalOfferingAmount>$10,000,000</totalOfferingAmount>
        <totalAmountSold>$5,000,000</totalAmountSold>
        <totalRemainingToBeSold>$5,000,000</totalRemainingToBeSold>
      </offeringSalesAmounts>
      <investors>
        <totalNumberAlreadyInvested>15</totalNumberAlreadyInvested>
      </investors>
      <minimumInvestmentAccepted>$100,000</minimumInvestmentAccepted>
    </offeringData>
  </formData>
</edgarSubmission>`;

// Test 2: Amendment filing (D/A)
const amendmentXml = `<?xml version="1.0"?>
<edgarSubmission>
  <headerData>
    <submissionType>D/A</submissionType>
    <filingDate>2025-01-20</filingDate>
  </headerData>
  <formData>
    <primaryIssuer>
      <cik>0007654321</cik>
      <entityName>Startup Corp</entityName>
      <entityType>LLC</entityType>
      <stateOfIncorporation>CA</stateOfIncorporation>
      <issuerAddress>
        <street1>456 Tech Ave</street1>
        <city>San Francisco</city>
        <stateOrCountry>CA</stateOrCountry>
        <zip>94105</zip>
      </issuerAddress>
    </primaryIssuer>
    <offeringData>
      <industryGroup>Healthcare</industryGroup>
      <offeringSalesAmounts>
        <totalOfferingAmount>$25,000,000</totalOfferingAmount>
        <totalAmountSold>$20,000,000</totalAmountSold>
        <totalRemainingToBeSold>$5,000,000</totalRemainingToBeSold>
      </offeringSalesAmounts>
      <investors>
        <totalNumberAlreadyInvested>25</totalNumberAlreadyInvested>
      </investors>
    </offeringData>
  </formData>
</edgarSubmission>`;

// Test 3: Indefinite offering amount
const indefiniteXml = `<?xml version="1.0"?>
<edgarSubmission>
  <headerData>
    <submissionType>D</submissionType>
    <filingDate>2025-01-10</filingDate>
  </headerData>
  <formData>
    <primaryIssuer>
      <cik>0009999999</cik>
      <entityName>Open-Ended Fund LLC</entityName>
      <entityType>Pooled Investment Fund</entityType>
      <stateOfIncorporation>DE</stateOfIncorporation>
      <issuerAddress>
        <street1>1 Wall Street</street1>
        <city>New York</city>
        <stateOrCountry>NY</stateOrCountry>
        <zip>10005</zip>
      </issuerAddress>
    </primaryIssuer>
    <offeringData>
      <industryGroup>Pooled Investment Fund</industryGroup>
      <offeringSalesAmounts>
        <totalOfferingAmount>Indefinite</totalOfferingAmount>
        <totalAmountSold>5000000</totalAmountSold>
        <totalRemainingToBeSold>Indefinite</totalRemainingToBeSold>
      </offeringSalesAmounts>
    </offeringData>
  </formData>
</edgarSubmission>`;

// Test 4: Yet to Occur first sale date
const yetToOccurXml = `<?xml version="1.0"?>
<edgarSubmission>
  <headerData>
    <submissionType>D</submissionType>
    <filingDate>2025-01-12</filingDate>
  </headerData>
  <formData>
    <primaryIssuer>
      <cik>0001111111</cik>
      <entityName>Pre-Launch Startup</entityName>
      <entityType>Corporation</entityType>
      <stateOfIncorporation>NY</stateOfIncorporation>
      <issuerAddress>
        <street1>100 Broadway</street1>
        <city>New York</city>
        <stateOrCountry>NY</stateOrCountry>
        <zip>10011</zip>
      </issuerAddress>
    </primaryIssuer>
    <offeringData>
      <industryGroup>Real Estate</industryGroup>
      <typeOfFiling>
        <dateOfFirstSale>Yet to Occur</dateOfFirstSale>
        <moreThanOneYear>false</moreThanOneYear>
      </typeOfFiling>
      <offeringSalesAmounts>
        <totalOfferingAmount>$5,000,000</totalOfferingAmount>
        <totalAmountSold>$0</totalAmountSold>
        <totalRemainingToBeSold>$5,000,000</totalRemainingToBeSold>
      </offeringSalesAmounts>
    </offeringData>
  </formData>
</edgarSubmission>`;

// Test 5: Minimal XML with missing fields
const minimalXml = `<?xml version="1.0"?>
<edgarSubmission>
  <headerData>
    <submissionType>D</submissionType>
    <filingDate>2025-01-08</filingDate>
  </headerData>
  <formData>
    <primaryIssuer>
      <cik>0002222222</cik>
      <entityName>Minimal Corp</entityName>
    </primaryIssuer>
    <offeringData>
    </offeringData>
  </formData>
</edgarSubmission>`;

// Test 6: Empty string (should return null gracefully)
const emptyXml = "";

// Helper to run tests
function runTest(name: string, fn: () => boolean): void {
  const result = fn();
  const status = result ? "✅ PASS" : "❌ FAIL";
  console.log(`${status}: ${name}`);
  if (!result) {
    process.exitCode = 1;
  }
}

console.log("=== Form D XML Parser Tests ===\n");

// Test 1: Parse complete XML
runTest("Parse complete Form D XML with all fields", () => {
  const result = parseFormDXml(completeXml, "0001234567-25-000001", "0001234567");
  if (!result) {
    console.log("  ERROR: Parser returned null");
    return false;
  }

  // Verify companyName, CIK, entityType, address fields
  if (result.companyName !== "Acme Technologies Inc") { console.log(`  ERROR: companyName was "${result.companyName}"`); return false; }
  if (result.cik !== "0001234567") { console.log(`  ERROR: cik was "${result.cik}"`); return false; }
  if (result.entityType !== "Corporation") { console.log(`  ERROR: entityType was "${result.entityType}"`); return false; }
  if (result.issuerStreet !== "123 Main Street") { console.log(`  ERROR: issuerStreet was "${result.issuerStreet}"`); return false; }
  if (result.issuerCity !== "New York") { console.log(`  ERROR: issuerCity was "${result.issuerCity}"`); return false; }
  if (result.issuerState !== "NY") { console.log(`  ERROR: issuerState was "${result.issuerState}"`); return false; }
  if (result.issuerZip !== "10001") { console.log(`  ERROR: issuerZip was "${result.issuerZip}"`); return false; }
  if (result.issuerPhone !== "212-555-1234") { console.log(`  ERROR: issuerPhone was "${result.issuerPhone}"`); return false; }

  // Verify industryGroup
  if (result.industryGroup !== "Technology") { console.log(`  ERROR: industryGroup was "${result.industryGroup}"`); return false; }

  // Verify offering amounts parsed as numbers (commas removed)
  if (result.totalOffering !== 10000000) { console.log(`  ERROR: totalOffering was ${result.totalOffering}`); return false; }
  if (result.amountSold !== 5000000) { console.log(`  ERROR: amountSold was ${result.amountSold}`); return false; }
  if (result.amountRemaining !== 5000000) { console.log(`  ERROR: amountRemaining was ${result.amountRemaining}`); return false; }

  // Verify numInvestors, minInvestment, revenueRange
  if (result.numInvestors !== 15) { console.log(`  ERROR: numInvestors was ${result.numInvestors}`); return false; }
  if (result.minInvestment !== 100000) { console.log(`  ERROR: minInvestment was ${result.minInvestment}`); return false; }
  if (result.revenueRange !== "$1-5 million") { console.log(`  ERROR: revenueRange was "${result.revenueRange}"`); return false; }

  // Verify federalExemptions
  if (result.federalExemptions !== "Rule 506(b); Rule 506(c)") { console.log(`  ERROR: federalExemptions was "${result.federalExemptions}"`); return false; }

  // Verify isAmendment is false for regular D
  if (result.isAmendment !== false) return false;

  // Verify firstSaleDate parsed correctly
  if (result.firstSaleDate !== "2025-01-01") return false;
  if (result.yetToOccur !== false) return false;

  // Verify moreThanOneYear
  if (result.moreThanOneYear !== true) return false;

  return validateParsedFiling(result);
});

// Test 2: Parse amendment (D/A)
runTest("Parse D/A amendment filing - isAmendment should be true", () => {
  const result = parseFormDXml(amendmentXml, "0007654321-25-000001", "0007654321");
  if (!result) return false;

  if (result.isAmendment !== true) return false;
  if (result.companyName !== "Startup Corp") return false;
  if (result.entityType !== "LLC") return false;

  return true;
});

// Test 3: Indefinite offering amounts
runTest("Parse Indefinite offering amounts as null", () => {
  const result = parseFormDXml(indefiniteXml, "0009999999-25-000001", "0009999999");
  if (!result) return false;

  if (result.totalOffering !== null) return false;
  if (result.amountRemaining !== null) return false;

  // amountSold is numeric in XML, should still parse
  if (result.amountSold !== 5000000) return false;

  return true;
});

// Test 4: Yet to Occur first sale date
runTest("Parse 'Yet to Occur' firstSaleDate with yetToOccur=true", () => {
  const result = parseFormDXml(yetToOccurXml, "0001111111-25-000001", "0001111111");
  if (!result) return false;

  if (result.firstSaleDate !== null) return false;
  if (result.yetToOccur !== true) return false;
  if (result.moreThanOneYear !== false) return false;

  return true;
});

// Test 5: Missing fields gracefully handled
runTest("Parse minimal XML with missing fields gracefully (no errors)", () => {
  const result = parseFormDXml(minimalXml, "0002222222-25-000001", "0002222222");
  if (!result) return false;

  // Required fields should still have values
  if (result.companyName !== "Minimal Corp") return false;
  if (result.cik !== "0002222222") return false;
  if (result.accessionNumber !== "0002222222-25-000001") return false;

  // Missing optional fields should be null
  if (result.entityType !== null) return false;
  if (result.industryGroup !== null) return false;
  if (result.totalOffering !== null) return false;
  if (result.numInvestors !== null) return false;
  if (result.issuerStreet !== null) return false;
  if (result.federalExemptions !== null) return false;

  return true;
});

// Test 6: Empty string
runTest("Parse empty XML string returns null gracefully (no errors)", () => {
  const result = parseFormDXml(emptyXml, "0003333333-25-000001", "0003333333");
  // Should return null without throwing
  return result === null;
});

// Test 7: Parser is pure (no side effects)
runTest("Parser is a pure function with no side effects", () => {
  // Run the same parse twice - should get identical results
  const result1 = parseFormDXml(completeXml, "0001234567-25-000001", "0001234567");
  const result2 = parseFormDXml(completeXml, "0001234567-25-000001", "0001234567");

  if (!result1 || !result2) return false;

  // Compare all fields
  const keys: (keyof typeof result1)[] = Object.keys(result1) as (keyof typeof result1);
  for (const key of keys) {
    if (result1[key] !== result2[key]) return false;
  }

  return true;
});

// Test 8: State of incorporation
runTest("Parse stateOfInc correctly", () => {
  const result = parseFormDXml(completeXml, "0001234567-25-000001", "0001234567");
  if (!result) return false;

  if (result.stateOfInc !== "DE") return false;

  return true;
});

// Test 9: SIC code
runTest("Parse sicCode correctly", () => {
  const result = parseFormDXml(completeXml, "0001234567-25-000001", "0001234567");
  if (!result) return false;

  if (result.sicCode !== "7371") return false;

  return true;
});

// Test 10: Filing date
runTest("Parse filingDate correctly", () => {
  const result = parseFormDXml(completeXml, "0001234567-25-000001", "0001234567");
  if (!result) return false;

  if (result.filingDate !== "2025-01-15") return false;

  return true;
});

console.log("\n=== Tests Complete ===");
