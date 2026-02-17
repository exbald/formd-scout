// SEC EDGAR Form D TypeScript interfaces
// This file contains all type definitions for EDGAR data structures

/**
 * EFTS search API hit structure
 * Based on actual SEC EFTS API response
 */
export interface EdgarFilingHit {
  _id: string; // Format: "accession_number:filename" e.g., "0001583168-24-000001:primary_doc.xml"
  _source: {
    ciks: string[]; // Array of CIKs (usually one)
    display_names: string[]; // Array of company names
    file_date: string; // Filing date YYYY-MM-DD
    form: string; // e.g., "D"
    root_forms: string[]; // e.g., ["D"]
    adsh: string; // Accession number without dashes e.g., "000158316824000001"
    file_num: string; // File number
    film_num: string; // Film number
    file_type: string; // File type
    file_description: string; // Description
    period_ending: string; // Period end date
    biz_states: string[]; // Business states
    biz_locations: string[]; // Business locations (city, state)
    inc_states: string[]; // State of incorporation
    sics: string[]; // SIC codes
    sequence: string;
    xsl: string;
    schema_version: string;
    items: string[];
  };
}

/**
 * EFTS search API response structure
 */
export interface EdgarSearchResponse {
  took: number;
  timed_out: boolean;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: { value: number; relation: string };
    max_score: number | null;
    hits: EdgarFilingHit[];
  };
}

/**
 * Parsed Form D filing data from XML
 */
export interface ParsedFormDFiling {
  companyName: string;
  cik: string;
  accessionNumber: string;
  entityType: string | null;
  stateOfInc: string | null;
  sicCode: string | null;
  filingDate: string;
  isAmendment: boolean;
  totalOffering: number | null;
  amountSold: number | null;
  amountRemaining: number | null;
  numInvestors: number | null;
  minInvestment: number | null;
  revenueRange: string | null;
  industryGroup: string | null;
  issuerStreet: string | null;
  issuerCity: string | null;
  issuerState: string | null;
  issuerZip: string | null;
  issuerPhone: string | null;
  filingUrl: string | null;
  xmlUrl: string | null;
  firstSaleDate: string | null;
  yetToOccur: boolean | null;
  moreThanOneYear: boolean | null;
  federalExemptions: string | null;
}

/**
 * AI-generated enrichment for a filing
 */
export interface FilingEnrichment {
  companySummary: string;
  relevanceScore: number;
  relevanceReasoning: string;
  estimatedHeadcount: number;
  growthSignals: string[];
  competitors: string[];
}

/**
 * Filing index response from SEC
 */
export interface FilingIndexResponse {
  directory: {
    item: Array<{
      name: string;
      type?: string;
      size?: number;
      last_modified?: string;
    }>;
  };
}

/**
 * Helper type to extract useful fields from EFTS hit
 */
export interface ExtractedFilingInfo {
  cik: string;
  companyName: string;
  accessionNumber: string;
  filingDate: string;
  formType: string;
  states: string[];
  sicCodes: string[];
}

/**
 * Extract useful filing info from an EFTS hit
 */
export function extractFilingInfo(hit: EdgarFilingHit): ExtractedFilingInfo {
  // Parse accession number from _id (format: "accession_number:filename")
  const accessionWithDashes = hit._id.split(":")[0] ?? "";
  // Also available as adsh without dashes
  const adsh = hit._source.adsh ?? "";

  // Convert adsh to format with dashes (e.g., "000158316824000001" -> "0001583168-24-000001")
  let accessionNumber = accessionWithDashes;
  if (!accessionWithDashes.includes("-") && adsh.length >= 18) {
    accessionNumber = `${adsh.slice(0, 10)}-${adsh.slice(10, 12)}-${adsh.slice(12, 18)}`;
  }

  return {
    cik: hit._source.ciks?.[0] ?? "",
    companyName: hit._source.display_names?.[0] ?? "",
    accessionNumber,
    filingDate: hit._source.file_date ?? "",
    formType: hit._source.form ?? hit._source.root_forms?.[0] ?? "",
    states: hit._source.biz_states ?? [],
    sicCodes: hit._source.sics ?? [],
  };
}
