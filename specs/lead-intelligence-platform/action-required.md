# Action Required: Lead Intelligence Platform

Manual steps that must be completed by a human. These cannot be automated.

## Before Implementation

- [x] **Firecrawl API key** - Sign up at firecrawl.dev, create API key, add as `FIRECRAWL_API_KEY` env var in `.env` and Vercel. Required for company deep research (Phase 3).
- [ ] **Resend API key** (optional) - Sign up at resend.com, create API key, add as `RESEND_API_KEY` env var. Required for email alert digests (Phase 6). Can be deferred if alerts aren't needed immediately.
- [x] **Verify n8n access** - Confirm self-hosted n8n instance is accessible and the existing daily workflow (`docs/technical/n8n-cron.md`) is running correctly.

## During Implementation

- [x] **Run `npm run db:push`** - After Phase 1 schema changes, push to database. Verify all 6 new tables are created.
- [x] **Add Firecrawl package** - If not using MCP tools from API routes, install `@mendable/firecrawl-js` npm package: `npm install @mendable/firecrawl-js`

## After Implementation

- [x] **Import updated n8n workflow** - After Phase 6, import `docs/n8n/daily-pipeline-v2.json` into n8n. Verify API key and endpoint URL are correct. Test with a manual trigger before enabling the cron schedule.
- [ ] **Configure first team profile** - Complete the onboarding wizard with CBRE-specific data: target markets (Manhattan, NYC Tri-State), key clients (Stripe, etc.), team bio and expertise.
- [ ] **Set Vercel env vars** - Ensure `FIRECRAWL_API_KEY` and `RESEND_API_KEY` (if used) are set in Vercel project settings for production deployment.
- [ ] **Test daily pipeline end-to-end** - After n8n workflow is imported, trigger a manual run and verify: ingest → enrich → research → digest all complete without errors.

---

> **Note:** These tasks are also listed in context within `implementation-plan.md`
