# Action Required: Per-User Filing Enrichment Scoring

Manual steps that must be completed by a human. These cannot be automated.

## During Implementation

- [ ] **Run `npm run db:push`** - Apply the schema migration adding `userId` column to `filingEnrichments`

## After Implementation

- [ ] **Update n8n workflow** - Add the per-user enrichment node to the live n8n instance (the JSON file is updated but the running workflow needs manual import/update)
- [ ] **Trigger initial per-user scoring** - For existing users who already completed onboarding, manually call `POST /api/edgar/enrich/per-user?daysBack=30` once to backfill their per-user scores

---

> **Note:** These tasks are also listed in context within `implementation-plan.md`
