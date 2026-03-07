# Action Required: Enhanced Company Research

Manual steps that must be completed by a human. These cannot be automated.

## Before Implementation

- [ ] **Verify Firecrawl plan supports /v2/agent endpoint** - The /agent endpoint may require a specific Firecrawl plan tier. Check your account at firecrawl.dev/dashboard to confirm access and credit balance.

## During Implementation

- [ ] **Run database migration** - After schema changes, run `npm run db:push` to apply new columns to PostgreSQL.

## After Implementation

- [ ] **Test with real filing** - Research a filing from the dashboard to verify the agent returns comprehensive results with emails and funding data.
- [ ] **Share n8n research workflows** - If you have n8n workflows that do company research, configure them to POST results to `/api/edgar/research/webhook` with your INGEST_API_KEY.
- [ ] **Tune maxAgentCredits** - After a few research runs, check credit usage in the research results and adjust the max credits setting if needed (Settings page).

---

> **Note:** These tasks are also listed in context within `implementation-plan.md`
