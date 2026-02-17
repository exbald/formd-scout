// SEC EDGAR API fetcher functions
// All functions include SEC_HEADERS with User-Agent, handle rate limiting (150ms delay),
// and have retry logic (3 retries with exponential backoff).

import type { EdgarSearchResponse, EdgarFilingHit } from "./types";

export const SEC_HEADERS = {
  "User-Agent": "NOCODE-GDN-LLC contact@nocodegdn.com",
  Accept: "application/json",
};

export const RATE_LIMIT_DELAY_MS = 150;
export const MAX_RETRIES = 3;
export const INITIAL_BACKOFF_MS = 1000;

// Track last request time for rate limiting
let lastRequestTime = 0;

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enforce rate limiting by waiting if needed
 * Ensures at least RATE_LIMIT_DELAY_MS between requests
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    await sleep(RATE_LIMIT_DELAY_MS - elapsed);
  }
  lastRequestTime = Date.now();
}

/**
 * Fetch with retry logic - retries up to MAX_RETRIES times with exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryCount = 0
): Promise<Response> {
  await enforceRateLimit();

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      // Retry on server errors (5xx) or rate limiting (429)
      if (
        (response.status >= 500 || response.status === 429) &&
        retryCount < MAX_RETRIES
      ) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
        console.warn(
          `SEC API request failed with status ${response.status}, retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
        );
        await sleep(backoffMs);
        return fetchWithRetry(url, options, retryCount + 1);
      }
    }

    return response;
  } catch (error) {
    // Retry on network errors
    if (retryCount < MAX_RETRIES) {
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
      console.warn(
        `SEC API request failed with error: ${error instanceof Error ? error.message : String(error)}, retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
      );
      await sleep(backoffMs);
      return fetchWithRetry(url, options, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Format date as YYYY-MM-DD for SEC API
 */
function formatDateForSec(date: Date): string {
  const iso = date.toISOString();
  const parts = iso.split("T");
  return parts[0] ?? iso.slice(0, 10);
}

/**
 * Fetch recent Form D filings from SEC EFTS full-text search endpoint
 *
 * @param startDate - Start date for filing search (defaults to 7 days ago)
 * @param endDate - End date for filing search (defaults to today)
 * @returns Array of filing hits from the SEC EFTS API
 */
export async function fetchRecentFormDFilings(
  startDate?: Date,
  endDate?: Date
): Promise<EdgarFilingHit[]> {
  // Default to last 7 days if no dates provided
  const end = endDate || new Date();
  const start = startDate || new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

  const startStr = formatDateForSec(start);
  const endStr = formatDateForSec(end);

  // Build EFTS query URL
  // Query all Form D filings within the date range
  // Note: Do NOT include q=* parameter - it causes zero results
  // The forms parameter alone is sufficient to filter to Form D
  const url = new URL("https://efts.sec.gov/LATEST/search-index");
  url.searchParams.set("forms", "D"); // Form D only
  url.searchParams.set("dateRange", "custom");
  url.searchParams.set("startdt", startStr);
  url.searchParams.set("enddt", endStr);

  const response = await fetchWithRetry(url.toString(), {
    headers: SEC_HEADERS,
  });

  if (!response.ok) {
    throw new Error(
      `SEC EFTS API request failed with status ${response.status}: ${response.statusText}`
    );
  }

  const data = (await response.json()) as EdgarSearchResponse;

  // Defensive parsing - the response structure may vary
  if (!data.hits || !Array.isArray(data.hits.hits)) {
    console.warn("SEC EFTS response has unexpected structure:", data);
    return [];
  }

  return data.hits.hits;
}

/**
 * Fetch the filing document index to find the primary XML document URL
 *
 * @param cik - Company CIK number
 * @param accessionNumber - Filing accession number (with dashes, e.g., "0001234567-25-000001")
 * @returns Object containing the index data and primary XML document filename
 */
export async function fetchFilingIndex(
  cik: string,
  accessionNumber: string
): Promise<{ primaryDocument: string | null; documents: unknown[] }> {
  // Accession number in URL path has dashes REMOVED
  const accessionNoDashes = accessionNumber.replace(/-/g, "");

  const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}/index.json`;

  const response = await fetchWithRetry(url, {
    headers: SEC_HEADERS,
  });

  if (!response.ok) {
    throw new Error(
      `SEC filing index request failed with status ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();

  // Defensive parsing
  if (!data.directory || !Array.isArray(data.directory.item)) {
    console.warn("SEC filing index response has unexpected structure:", data);
    return { primaryDocument: null, documents: [] };
  }

  const documents = data.directory.item as Array<{ name: string; type?: string }>;

  // Find the primary XML document (usually primarydoc.xml or similar)
  // Look for XML files that might be the primary Form D document
  const xmlDoc = documents.find(
    (doc) =>
      doc.name.endsWith(".xml") &&
      (doc.name.toLowerCase().includes("primary") ||
        doc.name.toLowerCase() === "formd.xml" ||
        doc.type === "primary doc" ||
        doc.type === "Primary Doc")
  );

  // Fallback to first XML file if no primary found
  const primaryDocument =
    xmlDoc?.name || documents.find((doc) => doc.name.endsWith(".xml"))?.name || null;

  return { primaryDocument, documents };
}

/**
 * Fetch the raw Form D XML content
 *
 * @param xmlUrl - Full URL to the Form D XML document
 * @returns Raw XML string content
 */
export async function fetchFormDXml(xmlUrl: string): Promise<string> {
  const response = await fetchWithRetry(xmlUrl, {
    headers: {
      ...SEC_HEADERS,
      Accept: "application/xml",
    },
  });

  if (!response.ok) {
    throw new Error(
      `SEC Form D XML request failed with status ${response.status}: ${response.statusText}`
    );
  }

  return response.text();
}

/**
 * Fetch company submission/information data from SEC
 *
 * @param cik - Company CIK number (with or without leading zeros)
 * @returns Company submissions data
 */
export async function fetchCompanyInfo(cik: string): Promise<unknown> {
  // CIK must be 10 digits with leading zeros
  const paddedCik = cik.padStart(10, "0");

  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

  const response = await fetchWithRetry(url, {
    headers: SEC_HEADERS,
  });

  if (!response.ok) {
    throw new Error(
      `SEC company info request failed with status ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Build the full URL for a Form D XML document
 *
 * @param cik - Company CIK number
 * @param accessionNumber - Filing accession number (with dashes)
 * @param filename - XML filename from the index
 * @returns Full URL to the XML document
 */
export function buildFormDXmlUrl(
  cik: string,
  accessionNumber: string,
  filename: string
): string {
  // Accession number in URL path has dashes REMOVED
  const accessionNoDashes = accessionNumber.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}/${filename}`;
}

/**
 * Build the SEC EDGAR filing detail page URL
 *
 * @param cik - Company CIK number
 * @param accessionNumber - Filing accession number (with dashes)
 * @returns Full URL to the SEC EDGAR filing page
 */
export function buildFilingUrl(cik: string, accessionNumber: string): string {
  const accessionNoDashes = accessionNumber.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}`;
}

// Re-export types
export type { EdgarSearchResponse, EdgarFilingHit };
