# Requirements: Lead Intelligence Platform

## Overview

Transform FormD Scout from a filing monitor into a full lead intelligence platform. The app currently ingests SEC Form D filings daily, scores them with AI, and displays them in a filterable dashboard. This feature set adds company deep research, personalized email outreach, configurable scoring, automated n8n pipelines, and a guided onboarding wizard.

## Strategic Direction

**CRE niche marketing, universal engine underneath.** Market to commercial real estate firms first (CBRE Manhattan, JLL San Francisco, Cushman & Wakefield), but build the scoring/research/outreach engine to be fully configurable per team. When a recruiter, B2B SaaS sales team, or VC shows interest, the same product serves them with zero code changes.

## Business Context

- **Primary client**: Jeff's team at CBRE Manhattan (biggest CRE firm in the world, office leasing for tech companies)
- **Intermediary**: Dylan (marketing agency owner, CRE background, bringing warm leads)
- **Pipeline**: JLL San Francisco also interested; Dylan has UK CRE network
- **Pricing target**: $20-40k build + monthly retainer per client
- **Core value prop**: Form D filings appear 2-3 weeks before press releases, giving brokers first-mover advantage

## Feature Requirements

### F0: Onboarding Wizard

First-time users see a guided multi-step wizard that configures their scoring profile, alert thresholds, and team info from industry templates. Gets users to value in 60 seconds.

**Acceptance Criteria:**
- New users without a team profile are redirected to the onboarding wizard
- Wizard offers industry vertical selection: CRE Broker, B2B SaaS Sales, Recruiter, VC/Investor, Professional Services
- Each vertical pre-fills target markets, industries, scoring criteria, and email tone
- Users can customize all pre-filled values
- "Skip for now" creates a default CRE profile
- Completing the wizard creates both `teamProfiles` and `appSettings` records
- Users land on the dashboard after completion

### F1: Company Deep Research (Firecrawl)

On-demand and automated company research using Firecrawl web scraping. Scrapes company websites to extract real data: what they do, job postings, leadership team, office locations, tech stack, recent news.

**Acceptance Criteria:**
- "Research Company" button on filing detail pages triggers Firecrawl-powered research
- Research results display inline: website summary, job postings (count + list), leadership team, office locations, recent news
- Research data is stored in `companyResearch` table for reuse
- GET endpoint returns existing research without re-scraping
- Loading and empty states match existing UX patterns

### F2: Dynamic Configurable Scoring

Replace hardcoded NYC/tech scoring prompt with a fully dynamic system driven by team profiles. Each team's AI scoring criteria reflect their specific market, industry focus, and ideal company profile.

**Acceptance Criteria:**
- Enrichment AI prompt is built dynamically from team profile (target markets, industries, ideal company profile, scoring criteria)
- Default profile matches current NYC/tech behavior (backward compatible)
- When website research data is available, it's included in the enrichment prompt for better scoring
- New `officeSpaceLikelihood` field added to enrichment output (generalize name later if needed)
- n8n batch enrichment accepts a `profileId` param or uses system default
- Settings page allows editing all scoring parameters
- "Re-score all filings" button triggers batch re-enrichment with updated profile

### F3: AI Email Draft Generator

One-click personalized outreach email generation that references the team's existing clients, the filing data, and company research. Drafts sound human-written, not bot-generated.

**Acceptance Criteria:**
- "Draft Email" button on filing detail pages
- Generated emails reference team's key clients relevant to the filing's industry
- Emails include filing-specific signals (funding amount, growth indicators)
- Email tone configurable (professional/warm/casual) per team profile
- Follow-up sequence generated (2-3 emails with suggested timing)
- Drafts stored in `emailDrafts` table with status tracking
- Outreach page lists all drafts with status filters and edit capability
- Copy to clipboard works on any draft
- Team profile settings include key clients, bio, expertise, email signature

### F4: n8n Automated Pipeline

Extend the existing n8n daily workflow to include automated deep research on high-relevance filings and email alert digests. User-configurable thresholds control what gets auto-researched.

**Acceptance Criteria:**
- Batch research API endpoint processes filings above the user's configured threshold
- `autoResearchThreshold` is configurable per user in settings (slider, 1-100, default 60)
- `autoResearchEnabled` toggle and `maxDailyResearch` cap prevent runaway costs
- Alert configs allow users to define: min relevance, target states, target industries, email delivery
- Daily digest email sent after pipeline completes with matching filings
- Updated n8n workflow JSON extends the existing workflow (no disruption to current automation)
- Pipeline flow: Ingest -> Enrich -> Research (high-relevance only) -> Alert Digest

## Dependencies

- F0 (Onboarding) creates the `teamProfiles` record that F1, F2, F3 depend on
- F1 (Research) provides website data that improves F2 (Scoring) and F3 (Emails)
- F2 (Scoring) must be in place before F4 (n8n) so the pipeline uses configurable profiles
- F3 (Emails) is independent but benefits from F1 research data

## Non-Functional Requirements

- All new API routes follow existing auth patterns (x-api-key for n8n, session auth for UI)
- Firecrawl calls are rate-limited and capped per user settings
- AI calls use existing OpenRouter + Vercel AI SDK pattern
- All new tables use uuid PKs, timestamps, and proper FK references with cascade deletes
- UI components use existing shadcn/ui library
- Mobile-responsive following existing dashboard patterns
