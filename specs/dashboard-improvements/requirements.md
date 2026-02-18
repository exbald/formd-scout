# Requirements: Dashboard Improvements

## Overview

Several UX issues and missing features on the FormD Scout dashboard and filings table that block MVP usability. These fixes ensure users see actual data, can enrich filings in bulk, and can filter by head count.

---

## Problems Being Solved

### 1. Score thresholds too high — showing 0 results
The dashboard "High Relevance" stat card and "Recent High-Relevance Filings" section used a threshold of 60. With only initial data ingested and no enrichments yet, this shows 0 everywhere. The MVP needs lower thresholds to show useful data.

### 2. Industry data completely missing
The "Top Industries" chart shows "No industry data available yet" even with 92 filings. The Industry column in the filings table shows "N/A" for all rows. Root cause: a parser bug in the SEC XML ingestion path. The Form D XML wraps industry as `<industryGroup><industryGroupType>Technology</industryGroupType></industryGroup>` but the parser only looks for a direct string at `industryGroup`, not the nested path.

### 3. Manual enrichment required per filing
To see AI scores and head count, users must navigate to each filing's detail page and click "Analyze Now". With 92+ filings, this is impractical.

### 4. Head count not visible in filings table
`estimatedHeadcount` (AI-estimated) is already stored in `filing_enrichments` and returned by the API, but is not displayed in the filings table and cannot be filtered on. This is a key signal for CRE brokers (a 200-person company needs more space than a 5-person company).

### 5. Chart tooltip invisible on hover
The "Filings Over Time" bar chart tooltip appears hidden/clipped when the user hovers over data points. The tooltip renders inside the SVG boundary and gets clipped.

---

## Acceptance Criteria

- [ ] "High Relevance" stat card shows count of filings with score ≥ 30 (not 60)
- [ ] "Recent High-Relevance Filings" section shows filings with score ≥ 20 (not 60)
- [ ] "Top Industries" chart populates after re-ingesting filings (parser fix + re-ingest)
- [ ] Industry column in filings table shows values for newly ingested filings
- [ ] "Enrich All" button in filings table triggers batch AI enrichment for up to 20 unenriched filings at once, with progress feedback
- [ ] "Head Count" column visible in filings table, showing AI-estimated headcount or "—"
- [ ] Min Head Count filter available in the filings filter panel
- [ ] Hovering over the "Filings Over Time" chart shows visible tooltip with filing count

---

## Data Source Clarifications (for future reference)

| Field | Source |
|-------|--------|
| `industryGroup` | SEC EDGAR Form D XML (`offeringData.industryGroup.industryGroupType`) |
| `totalOffering` | SEC EDGAR — can be null when issuer marks as "Indefinite" |
| `estimatedHeadcount` | **AI-generated** — model estimates from funding amount + industry + stage |
| `relevanceScore` | **AI-generated** — scored 1-100 for NYC CRE broker relevance |

---

## Dependencies

- `src/lib/edgar/parser.ts` — XML parser must be fixed before re-ingesting yields industry data
- `src/app/api/edgar/ingest/route.ts` — Must use `onConflictDoUpdate` for `industryGroup` to fix existing records on re-ingest
- `OPENROUTER_API_KEY` env var must be configured for batch enrichment to work
