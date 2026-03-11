# Requirements: Per-User Filing Enrichment Scoring

## Problem

The n8n daily pipeline scores all SEC Form D filings using a hardcoded NYC CRE broker profile (`DEFAULT_SCORING_PROFILE`). Users configure personalized profiles during onboarding (target markets, industries, scoring criteria), but these profiles only take effect if a user manually clicks "Re-score All Filings" in Settings. As a result, a recruiter, VC investor, or SaaS sales user sees CRE-optimized relevance scores by default — scores that don't reflect their business.

## Solution

Automatically score filings per-user using their configured profile. The system-wide CRE default scoring remains as a baseline. Per-user scores are generated automatically when:

1. New filings are ingested daily (n8n pipeline triggers per-user scoring after default scoring)
2. A user completes onboarding (recent filings are scored with their new profile)

The dashboard prefers user-specific scores when available, falling back to system defaults.

## Acceptance Criteria

- [ ] `filingEnrichments` table supports per-user rows via a nullable `userId` column
- [ ] System-wide default enrichment (n8n pipeline) continues to work, storing rows with `userId = NULL`
- [ ] New `POST /api/edgar/enrich/per-user` endpoint scores recent filings for all profiled users
- [ ] Pre-filter skips junk filings (system-default score < 20) to control AI costs
- [ ] Per-user enrichment is capped at 10 filings per user per invocation
- [ ] Dashboard filings list shows per-user scores when available, falls back to system default
- [ ] Filing detail page shows per-user scores when available
- [ ] Stats route (high relevance count) uses per-user scores when available
- [ ] User-facing "Re-score All Filings" only affects that user's enrichment rows
- [ ] Completing onboarding auto-triggers per-user scoring for last 30 days of filings
- [ ] n8n workflow updated to call per-user endpoint after default enrichment
- [ ] Existing n8n pipeline and unauthenticated API behavior unchanged

## Dependencies

- Existing `teamProfiles` table with `scoringCriteria`, `targetMarkets`, `targetIndustries`, `idealCompanyProfile`
- Existing `enrichFiling()` function in `src/lib/ai/enrichment.ts` (already accepts `ScoringProfile`)
- Existing `getScoringProfileForUser()` pattern in `src/app/api/edgar/enrich-batch/route.ts`
- n8n workflow at `docs/n8n/daily-pipeline-v2.json`

## Cost Impact

~$0.01/day per user at current scale (gpt-4.1-mini). Pre-filter eliminates obvious mismatches without AI calls.
