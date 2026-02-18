# Implementation Plan: Dashboard Improvements

## Overview

Six targeted fixes across 7 files. Most changes are independent and can run in parallel.

---

## Phase 1: Quick Fixes (Score Thresholds + Chart Tooltip)

These are simple number/style changes with no dependencies.

### Wave 1 (Parallel)

- [ ] **Fix score thresholds in dashboard** — `src/app/dashboard/page.tsx`
  - Fetch URL: `minRelevance=60` → `minRelevance=20`
  - Stat card label: `Score 60+` → `Score 30+`
  - Section description: `"60 or higher"` → `"20 or higher"`
  - Empty state message: update `60+` reference

- [ ] **Fix score threshold in stats API** — `src/app/api/edgar/stats/route.ts`
  - High relevance count query: `>= 60` → `>= 30`

- [ ] **Fix chart tooltip visibility** — `src/app/dashboard/page.tsx`
  - Wrap chart in `overflow-visible` div
  - Add `margin={{ bottom: 20 }}` to BarChart
  - Add `wrapperStyle={{ zIndex: 1000 }}` to Tooltip

### Technical Details

```
Files: src/app/dashboard/page.tsx, src/app/api/edgar/stats/route.ts
Changes: String/number literal replacements only
No migrations needed
```

---

## Phase 2: Industry Group Parser Fix

Fixes the root cause of missing industry data.

### Wave 1 (Parallel)

- [ ] **Fix XML parser** — `src/lib/edgar/parser.ts`
  ```ts
  // Before:
  const industryGroup = extractString(offeringData, "industryGroup");
  // After (tries nested path first, falls back to direct):
  const industryGroup =
    extractString(offeringData, "industryGroup", "industryGroupType") ||
    extractString(offeringData, "industryGroup");
  ```

- [ ] **Fix ingest to update existing records** — `src/app/api/edgar/ingest/route.ts`
  - Change `onConflictDoNothing` → `onConflictDoUpdate` for `industryGroup`
  - Only updates `industryGroup` when the new parsed value is non-null
  - Allows re-running ingest for today's date to fix existing null records

### Wave 2 (Sequential — after Wave 1)

- [ ] **Re-ingest today's filings** (manual action — see action-required.md)
  - Triggers the parser fix on all existing records via `onConflictDoUpdate`

### Technical Details

```
SEC Form D XML structure for industry:
<offeringData>
  <industryGroup>
    <industryGroupType>Technology</industryGroupType>
  </industryGroup>
</offeringData>

Parser path: offeringData → industryGroup → industryGroupType

Ingest conflict resolution:
.onConflictDoUpdate({
  target: formDFilings.accessionNumber,
  set: {
    industryGroup: parsed.industryGroup ?? formDFilings.industryGroup,
  },
})
```

---

## Phase 3: Head Count Column + Filter

Surfaces `estimatedHeadcount` (already in API response) in the filings table UI.

### Wave 1 (Parallel)

- [ ] **Add minHeadcount filter to filings API** — `src/app/api/edgar/filings/route.ts`
  - Add `minHeadcount` query param
  - Add filter condition: `filingEnrichments.estimatedHeadcount >= N`
  - Add `estimatedHeadcount` to `sortColumnMap`

- [ ] **Add Head Count column + filter to filings table** — `src/app/dashboard/filings/page.tsx`
  - Add `estimatedHeadcount: number | null` to Filing interface
  - Add "Head Count" column header to desktop table (between State and Relevance)
  - Add data cell: `filing.estimatedHeadcount?.toLocaleString() ?? "—"`
  - Add headcount row to mobile card view
  - Add `minHeadcount` state + filter input in filter panel
  - Add headcount to URL params in `fetchFilings`
  - Add headcount to `hasActiveFilters` check and `handleClearFilters`
  - Add "Head Count" sort option to sort dropdown

### Technical Details

```
API: GET /api/edgar/filings?minHeadcount=50
Already returned: estimatedHeadcount: filingEnrichments.estimatedHeadcount (line 170 of route)
Sort key: estimatedHeadcount: sql`${filingEnrichments.estimatedHeadcount}`
Note: estimatedHeadcount is AI-estimated, not from SEC source
```

---

## Phase 4: Batch Enrichment

Enables users to trigger AI enrichment for multiple unenriched filings from the UI.

### Wave 1 (Parallel)

- [ ] **Create batch enrich endpoint** — `src/app/api/edgar/enrich-batch/route.ts` (NEW)
  - `POST` with Better Auth session (no API key needed)
  - Queries up to 20 unenriched filings (LEFT JOIN where enrichments.id IS NULL)
  - Calls `enrichFiling()` per filing with 2-second delay
  - Returns `{ enriched, errors, remaining }`

- [ ] **Add "Enrich All" button** — `src/app/dashboard/filings/page.tsx`
  - Button with `Sparkles` icon in filter action buttons area
  - Calls `POST /api/edgar/enrich-batch`
  - Shows loading state: "Enriching..."
  - Shows success toast: `"Enriched N filings. M remaining."`
  - Refreshes filings list on completion

### Technical Details

```
New file: src/app/api/edgar/enrich-batch/route.ts
Auth: Better Auth session (not INGEST_API_KEY)
Imports: enrichFiling, getEnrichmentModelName from src/lib/ai/enrichment.ts
Rate limiting: 2-second delay between filings to avoid OpenRouter limits
Batch size: 20 filings per request (call again for more)

Toast: import { toast } from "sonner"
Icons: import { Sparkles, Loader2 } from "lucide-react"
```

---

## Summary

| Phase | Files Modified | Status |
|-------|---------------|--------|
| 1: Score + tooltip | `dashboard/page.tsx`, `api/edgar/stats/route.ts` | ✅ Done |
| 2: Parser fix | `lib/edgar/parser.ts`, `api/edgar/ingest/route.ts` | ✅ Done |
| 3: Head Count | `api/edgar/filings/route.ts`, `dashboard/filings/page.tsx` | ✅ Done |
| 4: Batch enrich | `api/edgar/enrich-batch/route.ts` (new), `dashboard/filings/page.tsx` | ✅ Done |
