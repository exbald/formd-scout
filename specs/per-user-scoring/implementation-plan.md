# Implementation Plan: Per-User Filing Enrichment Scoring

## Overview

Add per-user scoring to the filing enrichment system. A nullable `userId` column on `filingEnrichments` allows multiple enrichment rows per filing — one system default (`userId = NULL`) and one per user. The dashboard prefers user-specific scores, falling back to the system default. Two automatic triggers create per-user scores: the daily n8n pipeline and post-onboarding.

## Phase 1: Schema Migration

Add `userId` column to `filingEnrichments` and update indexes.

### Tasks

- [ ] Add nullable `userId` column to `filingEnrichments` in `src/lib/schema.ts`
- [ ] Replace `filing_id_idx` with composite unique index on `(filingId, userId)` and add `userId` index
- [ ] Run `npm run db:push` to apply migration

### Technical Details

**File:** `src/lib/schema.ts` (lines 142-159)

Add to the `filingEnrichments` column definitions:
```typescript
userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
```

Replace the existing index:
```typescript
// Before:
(table) => [index("filing_id_idx").on(table.filingId)]

// After:
(table) => [
  uniqueIndex("enrichment_filing_user_idx").on(table.filingId, table.userId),
  index("enrichment_user_id_idx").on(table.userId),
]
```

Note: PostgreSQL treats NULL as distinct in unique indexes, so `(filingId, NULL)` and `(filingId, 'user123')` are both allowed — exactly what we want.

Run: `npm run db:push`

## Phase 2: Update Existing Enrichment Routes

Scope system-default route to `userId IS NULL`, and make user-facing routes write per-user rows.

### Tasks

- [ ] Update system-default enrich route to scope queries to `userId IS NULL` [complex]
  - [ ] Scope "already enriched" check to `AND userId IS NULL`
  - [ ] Scope unenriched LEFT JOIN query to `AND userId IS NULL`
  - [ ] Explicitly set `userId: null` on insert
- [ ] Update batch enrich route to write per-user rows [complex]
  - [ ] Insert with `userId: session.user.id`
  - [ ] `rescoreAll`: delete only this user's enrichments, not system defaults
  - [ ] Unenriched check: scope to filings missing enrichment for this user
- [ ] Update per-filing enrich route to write per-user rows
  - [ ] Insert with authenticated user's ID
  - [ ] Delete only user's enrichment row when re-scoring

### Technical Details

**File:** `src/app/api/edgar/enrich/route.ts`

Line 72-94 (unenriched query) — change LEFT JOIN condition:
```typescript
.leftJoin(
  filingEnrichments,
  and(
    eq(formDFilings.id, filingEnrichments.filingId),
    isNull(filingEnrichments.userId)
  )
)
```

Line 144-148 (already enriched check):
```typescript
const [existing] = await db
  .select()
  .from(filingEnrichments)
  .where(and(eq(filingEnrichments.filingId, filingId), isNull(filingEnrichments.userId)))
  .limit(1);
```

Line 183 (insert) — add `userId: null` explicitly.

**File:** `src/app/api/edgar/enrich-batch/route.ts`

Line 71 LEFT JOIN — scope to user:
```typescript
.leftJoin(
  filingEnrichments,
  and(
    eq(formDFilings.id, filingEnrichments.filingId),
    eq(filingEnrichments.userId, session.user.id)
  )
)
```

Line 85-86 (rescoreAll delete) — scope to user:
```typescript
await db.delete(filingEnrichments).where(
  and(eq(filingEnrichments.id, filing.enrichmentId), eq(filingEnrichments.userId, session.user.id))
);
```

Line 112 (insert) — add `userId: session.user.id`.

Line 138-142 (remaining count) — scope to user:
```typescript
.leftJoin(filingEnrichments, and(
  eq(formDFilings.id, filingEnrichments.filingId),
  eq(filingEnrichments.userId, session.user.id)
))
```

**File:** `src/app/api/edgar/filings/[id]/enrich/route.ts`

Same pattern — insert with `userId: session.user.id`, delete scoped to user.

## Phase 3: New Per-User Enrichment Endpoint

Create the core endpoint that scores filings for all profiled users.

### Tasks

- [ ] Create `POST /api/edgar/enrich/per-user` route [complex]
  - [ ] Fetch all users with `teamProfiles` that have `scoringCriteria`
  - [ ] For each user, find recent filings missing per-user enrichment
  - [ ] Pre-filter: skip filings where system-default score < 20
  - [ ] Call `enrichFiling()` with user's profile, insert with `userId`
  - [ ] Cap at 10 filings per user per invocation
  - [ ] Return summary response
- [ ] Extract shared `getScoringProfileForUser()` to a reusable location

### Technical Details

**New file:** `src/app/api/edgar/enrich/per-user/route.ts`

Auth: `x-api-key` header (same `INGEST_API_KEY` env var).

Request body:
```typescript
{ daysBack?: number } // default 1
```

Response:
```typescript
{ users: number, enriched: number, skipped: number, errors: number, details: {...} }
```

Core query to find unenriched filings for a user:
```typescript
const filings = await db
  .select({
    id: formDFilings.id,
    // ... all enrichment input fields
    defaultScore: filingEnrichments.relevanceScore,
  })
  .from(formDFilings)
  .leftJoin(filingEnrichments, and(
    eq(formDFilings.id, filingEnrichments.filingId),
    isNull(filingEnrichments.userId) // system default
  ))
  .where(and(
    gte(formDFilings.filingDate, cutoffDate),
    sql`NOT EXISTS (
      SELECT 1 FROM filing_enrichments
      WHERE filing_id = ${formDFilings.id} AND user_id = ${userId}
    )`
  ))
  .limit(10);
```

Then filter out filings with `defaultScore < 20` before calling AI.

Reuse `getScoringProfileForUser()` — currently duplicated in `enrich/route.ts` and `enrich-batch/route.ts`. Extract to `src/lib/ai/enrichment.ts` or a shared helper.

## Phase 4: Update Query Routes for Per-User Scores

Make filings list, detail, and stats routes prefer per-user enrichments.

### Tasks

- [ ] Update filings list route to prefer per-user enrichments [complex]
  - [ ] Accept optional `userId` query param
  - [ ] Use lateral join or dual LEFT JOIN with COALESCE to prefer user-specific rows
  - [ ] Update count query to match
- [ ] Update filing detail route to prefer per-user enrichments
- [ ] Update stats route to scope high relevance count to user

### Technical Details

**File:** `src/app/api/edgar/filings/route.ts`

Strategy — use `LEFT JOIN LATERAL` via raw SQL for the enrichment join:
```sql
LEFT JOIN LATERAL (
  SELECT * FROM filing_enrichments
  WHERE filing_id = form_d_filings.id
    AND (user_id = $1 OR user_id IS NULL)
  ORDER BY user_id IS NULL ASC  -- prefer non-null (user-specific) first
  LIMIT 1
) enrichment ON true
```

In Drizzle, use `sql` template for the join condition. If `userId` param is absent, fall back to current behavior (`LEFT JOIN ... WHERE userId IS NULL`).

**File:** `src/app/api/edgar/filings/[id]/route.ts`

Same lateral join pattern for single filing.

**File:** `src/app/api/edgar/stats/route.ts` (line 86-91)

Scope the high relevance count query: if `userId` is provided, join to user-specific enrichments first.

## Phase 5: Dashboard & Onboarding Integration

Wire up the frontend to pass userId and trigger per-user scoring on onboarding.

### Tasks

- [ ] Update dashboard filings page to pass `userId` when fetching
- [ ] Add post-onboarding trigger to score recent filings with new profile
- [ ] Update n8n workflow JSON to call per-user endpoint after default enrichment

### Technical Details

**File:** `src/app/dashboard/filings/page.tsx`

When building the fetch URL for filings, append `userId`:
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (session?.user?.id) {
  params.set("userId", session.user.id);
}
```

**File:** `src/app/dashboard/onboarding/page.tsx`

After successful profile save (the existing submit handler), fire-and-forget:
```typescript
fetch("/api/edgar/enrich/per-user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ daysBack: 30, userId: session.user.id }),
});
toast.info("Scoring filings with your profile...");
```

Note: The per-user endpoint needs to also accept an optional `userId` body param to scope to a single user (for the onboarding trigger case vs. the n8n "all users" case).

**File:** `docs/n8n/daily-pipeline-v2.json`

Add a new HTTP Request node after "Build Summary" / "Enrich Batch 3":
- Method: POST
- URL: `https://formd-scout.vercel.app/api/edgar/enrich/per-user`
- Header: `x-api-key: {{ $vars.INGEST_API_KEY }}`
- Body: `{ "daysBack": 1 }`
- Timeout: 300000ms

## Files Summary

| File | Action |
|------|--------|
| `src/lib/schema.ts` | Add `userId` column + indexes to `filingEnrichments` |
| `src/app/api/edgar/enrich/per-user/route.ts` | **New** — per-user enrichment endpoint |
| `src/app/api/edgar/enrich/route.ts` | Scope to `userId IS NULL` |
| `src/app/api/edgar/enrich-batch/route.ts` | Write per-user rows |
| `src/app/api/edgar/filings/[id]/enrich/route.ts` | Write per-user rows |
| `src/app/api/edgar/filings/route.ts` | Prefer per-user enrichments via lateral join |
| `src/app/api/edgar/filings/[id]/route.ts` | Prefer per-user enrichments |
| `src/app/api/edgar/stats/route.ts` | Scope stats to user |
| `src/app/dashboard/filings/page.tsx` | Pass `userId` to API |
| `src/app/dashboard/onboarding/page.tsx` | Trigger per-user scoring post-onboarding |
| `docs/n8n/daily-pipeline-v2.json` | Add per-user enrichment node |
