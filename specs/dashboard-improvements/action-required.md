# Action Required: Dashboard Improvements

## After Implementation

- [ ] **Re-ingest today's filings to populate industry data** — The parser fix only applies to newly ingested filings. To fix industry data for the 92 existing filings, re-run ingestion for today's date range. The updated `onConflictDoUpdate` will update `industryGroup` for records where it was previously null.

  ```bash
  curl -X POST https://formd-scout.vercel.app/api/edgar/ingest \
    -H "x-api-key: YOUR_INGEST_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"startDate": "2026-02-18", "endDate": "2026-02-18"}'
  ```

- [ ] **Click "Enrich All" in the filings table** — After re-ingesting, use the new "Enrich All" button to trigger batch AI enrichment for unenriched filings. Each click processes up to 20 filings. Click multiple times until all filings are enriched (check the "remaining" count in the success toast).

- [ ] **Deploy to Vercel** — All code changes need to be deployed before the above steps will work in production.
