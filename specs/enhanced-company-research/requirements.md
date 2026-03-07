# Requirements: Enhanced Company Research

## Problem

The current research pipeline produces thin, low-value results. It scrapes only 1 company webpage and 1 jobs page via Firecrawl search+scrape, then asks AI to extract structured data from limited content. The result:

- No contact emails for leadership/decision-makers
- No funding history or growth signals
- No social profile links (LinkedIn company page, Crunchbase)
- Leadership names often just echo what's already in the Form D filing
- Website summary is generic and brief
- No personalization based on the user's team profile or target markets

## Goal

Replace the research engine with Firecrawl's `/agent` endpoint, which autonomously searches the web and returns rich, structured data from multiple sources. Research should be personalized based on the user's team profile (target markets, industries, expertise, ideal company profile, search terms). Add n8n webhook integration as a secondary data enrichment path.

## Acceptance Criteria

### Core Research Quality
- [ ] Research returns leadership team with **email addresses** when publicly available
- [ ] Research returns **LinkedIn profile URLs** for leadership
- [ ] Research returns **funding history** (rounds, amounts, dates, investors)
- [ ] Research returns **growth signals** (hiring velocity, expansion plans, recent milestones)
- [ ] Research returns **social profiles** (company LinkedIn, Twitter/X, Crunchbase)
- [ ] Research returns **company size category** (startup/scaleup/enterprise)
- [ ] Website summary is substantive (not just repeating Form D data)

### Personalization
- [ ] Research prompt incorporates team profile data (targetMarkets, targetIndustries, expertise, idealCompanyProfile) when available
- [ ] Search terms are tailored to the user's business context (e.g., CRE broker looking for office space needs vs. generic research)

### n8n Integration
- [ ] Webhook endpoint accepts research data from external n8n workflows
- [ ] n8n data supplements existing research (merge, not replace)
- [ ] Webhook is authenticated via INGEST_API_KEY

### UI Display
- [ ] Filing detail page shows contact emails with mailto: links
- [ ] Filing detail page shows LinkedIn profile links on leadership entries
- [ ] Filing detail page shows funding history section
- [ ] Filing detail page shows growth signals as badges
- [ ] Filing detail page shows social profile links
- [ ] Loading state reflects longer research time (~1-2 minutes)

### Settings & Controls
- [ ] User can configure max Firecrawl credits per research run
- [ ] Credits used are tracked and stored per research record

### Backward Compatibility
- [ ] Existing research records continue to display correctly
- [ ] Batch research endpoint uses new agent-based research
- [ ] Graceful fallback if Firecrawl agent fails

## Dependencies

- Firecrawl API key (already configured)
- Firecrawl `/v2/agent` endpoint access
- OpenRouter API key (already configured, used for email generation — not needed for agent research)
- Existing tables: `formDFilings`, `companyResearch`, `teamProfiles`, `appSettings`
