/**
 * Form D XML Parser
 *
 * Parses SEC EDGAR Form D XML filings into structured TypeScript objects.
 * Uses fast-xml-parser for XML parsing with defensive handling of missing fields.
 *
 * Key features:
 * - Handles missing fields gracefully (returns null)
 * - Parses "Indefinite" offering amounts as null
 * - Handles "Yet to Occur" for firstSaleDate
 * - Parses offering amounts as numbers (removes commas, $ signs)
 * - Detects amendment filings (D/A form type)
 * - Pure function with no side effects
 */

import { XMLParser } from "fast-xml-parser";
import type { ParsedFormDFiling } from "./types";

/**
 * Parse a numeric value from a string, handling commas, dollar signs, and "Indefinite"
 * Returns null for "Indefinite" or unparseable values
 */
function parseOfferingAmount(value: string | undefined | null): number | null {
  if (!value) return null;

  // Handle "Indefinite" as null
  if (value.toLowerCase() === "indefinite") return null;

  // Remove dollar signs, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, "");

  // Parse as float
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse an integer value from a string
 * Returns null for unparseable values
 */
function parseInteger(value: string | undefined | null): number | null {
  if (!value) return null;

  // Remove commas and whitespace
  const cleaned = value.replace(/[,]/g, "").trim();

  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse a boolean value from various string representations
 */
function parseBoolean(value: string | undefined | null): boolean | null {
  if (!value) return null;

  const lower = value.toLowerCase().trim();
  if (lower === "true" || lower === "1" || lower === "yes") return true;
  if (lower === "false" || lower === "0" || lower === "no") return false;

  return null;
}

/**
 * Safely extract a string value, returning null if not found
 */
function extractString(obj: unknown, ...path: string[]): string | null {
  let current: unknown = obj;

  for (const key of path) {
    if (current === null || current === undefined || typeof current !== "object") {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }

  if (current === null || current === undefined) return null;
  return typeof current === "string" ? current : null;
}

/**
 * Safely navigate through a nested object
 */
function navigatePath(obj: unknown, ...path: string[]): unknown {
  let current: unknown = obj;

  for (const key of path) {
    if (current === null || current === undefined || typeof current !== "object") {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Extract federal exemptions from the offeringData
 * Returns a semicolon-separated string of exemption items
 */
function extractFederalExemptions(offeringData: unknown): string | null {
  const exemptions = navigatePath(offeringData, "federalExemptions", "exemption");
  if (!exemptions) return null;

  // Handle both single exemption object and array of exemptions
  const exemptionArray = Array.isArray(exemptions) ? exemptions : [exemptions];

  const items: string[] = [];

  for (const exemption of exemptionArray) {
    if (exemption && typeof exemption === "object") {
      const item = (exemption as Record<string, unknown>).item;
      if (typeof item === "string" && item.trim()) {
        items.push(item.trim());
      }
    }
  }

  return items.length > 0 ? items.join("; ") : null;
}

/**
 * Parse a Form D XML string into a structured ParsedFormDFiling object
 *
 * @param xmlString - Raw XML string from SEC EDGAR
 * @param accessionNumber - Accession number for this filing (required, from EFTS)
 * @param cik - CIK for this filing (required, from EFTS)
 * @returns ParsedFormDFiling with all extracted fields, or null if parsing fails
 */
export function parseFormDXml(
  xmlString: string,
  accessionNumber: string,
  cik: string
): ParsedFormDFiling | null {
  try {
    // Configure parser with options for Form D XML
    const parser = new XMLParser({
      ignoreAttributes: true,
      allowBooleanAttributes: false,
      parseTagValue: false, // Keep as strings, we'll parse ourselves
      trimValues: true,
      isArray: (name) => {
        // These fields can appear multiple times
        return name === "exemption" || name === "item";
      },
    });

    const parsed = parser.parse(xmlString);

    // Navigate to the main sections
    const edgarSubmission = navigatePath(parsed, "edgarSubmission") || parsed;
    const headerData = navigatePath(edgarSubmission, "headerData");
    const formData = navigatePath(edgarSubmission, "formData");
    const primaryIssuer = navigatePath(formData, "primaryIssuer");
    const offeringData = navigatePath(formData, "offeringData");

    // Extract submission type to determine if amendment
    const submissionType = extractString(headerData, "submissionType") ||
                          extractString(edgarSubmission, "submissionType") ||
                          "D";
    const isAmendment = submissionType.toUpperCase().includes("D/A") ||
                       submissionType.toUpperCase() === "D/A";

    // Extract filing date - default to today if not found
    const filingDateRaw = extractString(headerData, "filingDate") ??
                       extractString(edgarSubmission, "headerData", "filingDate");
    const filingDate: string = filingDateRaw ?? new Date().toISOString().split("T")[0];

    // Extract primary issuer information
    const companyName = extractString(primaryIssuer, "entityName") ||
                       extractString(primaryIssuer, "issuerName") ||
                       "";
    const entityType = extractString(primaryIssuer, "entityType");
    const stateOfInc = extractString(primaryIssuer, "stateOfIncorporation") ||
                       extractString(primaryIssuer, "stateOfInc");
    const sicCode = extractString(primaryIssuer, "sic") ||
                    extractString(primaryIssuer, "sicCode");

    // Extract address
    const issuerStreet = extractString(primaryIssuer, "issuerAddress", "street1") ||
                        extractString(primaryIssuer, "issuerAddress", "street");
    const issuerCity = extractString(primaryIssuer, "issuerAddress", "city");
    const issuerState = extractString(primaryIssuer, "issuerAddress", "stateOrCountry") ||
                       extractString(primaryIssuer, "issuerAddress", "state");
    const issuerZip = extractString(primaryIssuer, "issuerAddress", "zip") ||
                     extractString(primaryIssuer, "issuerAddress", "zipCode");
    const issuerPhone = extractString(primaryIssuer, "issuerPhoneNumber");

    // Extract offering data
    const industryGroup = extractString(offeringData, "industryGroup");

    const revenueRange = extractString(offeringData, "issuerSize", "revenueRange");

    // Extract offering amounts
    const totalOfferingRaw = extractString(offeringData, "offeringSalesAmounts", "totalOfferingAmount");
    const amountSoldRaw = extractString(offeringData, "offeringSalesAmounts", "totalAmountSold");
    const amountRemainingRaw = extractString(offeringData, "offeringSalesAmounts", "totalRemainingToBeSold");

    // Extract investor info
    const numInvestorsRaw = extractString(offeringData, "investors", "totalNumberAlreadyInvested");
    const minInvestmentRaw = extractString(offeringData, "minimumInvestmentAccepted");

    // Extract first sale date and related flags
    const firstSaleDateRaw = extractString(offeringData, "typeOfFiling", "dateOfFirstSale");
    const moreThanOneYearRaw = extractString(offeringData, "typeOfFiling", "moreThanOneYear");

    // Handle "Yet to Occur" for first sale date
    let firstSaleDate: string | null = null;
    let yetToOccur: boolean | null = null;

    if (firstSaleDateRaw) {
      const lowerDate = firstSaleDateRaw.toLowerCase().trim();
      if (lowerDate === "yet to occur" || lowerDate.includes("yet to occur")) {
        yetToOccur = true;
        firstSaleDate = null;
      } else {
        // Try to parse as date - validate format
        const dateMatch = firstSaleDateRaw.match(/^\d{4}-\d{2}-\d{2}$/);
        if (dateMatch) {
          firstSaleDate = firstSaleDateRaw;
          yetToOccur = false;
        }
      }
    }

    // Extract federal exemptions
    const federalExemptions = extractFederalExemptions(offeringData);

    // Build the result
    const result: ParsedFormDFiling = {
      companyName: companyName || "Unknown Company",
      cik: cik,
      accessionNumber: accessionNumber,
      entityType: entityType,
      stateOfInc: stateOfInc,
      sicCode: sicCode,
      filingDate: filingDate,
      isAmendment: isAmendment,
      totalOffering: parseOfferingAmount(totalOfferingRaw),
      amountSold: parseOfferingAmount(amountSoldRaw),
      amountRemaining: parseOfferingAmount(amountRemainingRaw),
      numInvestors: parseInteger(numInvestorsRaw),
      minInvestment: parseOfferingAmount(minInvestmentRaw),
      revenueRange: revenueRange,
      industryGroup: industryGroup,
      issuerStreet: issuerStreet,
      issuerCity: issuerCity,
      issuerState: issuerState,
      issuerZip: issuerZip,
      issuerPhone: issuerPhone,
      filingUrl: null, // Set by caller
      xmlUrl: null, // Set by caller
      firstSaleDate: firstSaleDate,
      yetToOccur: yetToOccur,
      moreThanOneYear: parseBoolean(moreThanOneYearRaw),
      federalExemptions: federalExemptions,
    };

    return result;
  } catch (error) {
    console.error("Failed to parse Form D XML:", error);
    return null;
  }
}

/**
 * Validate that a parsed filing has the minimum required fields
 */
export function validateParsedFiling(filing: ParsedFormDFiling | null): filing is ParsedFormDFiling {
  if (!filing) return false;

  // Required fields
  if (!filing.companyName || !filing.cik || !filing.accessionNumber || !filing.filingDate) {
    return false;
  }

  return true;
}
