// SEC EDGAR API fetcher functions
// TODO: Implement fetchRecentFormDFilings, fetchFilingIndex, fetchFormDXml, fetchCompanyInfo
// All functions must include SEC_HEADERS with User-Agent, handle rate limiting (150ms delay),
// and have retry logic (3 retries with exponential backoff).

export const SEC_HEADERS = {
  "User-Agent": "NOCODE-GDN-LLC contact@nocodegdn.com",
  Accept: "application/json",
};

export const RATE_LIMIT_DELAY_MS = 150;
