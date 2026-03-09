# Implementation Plan: Enhanced Company Research

## Overview

Replace the current Firecrawl search+scrape+AI-extract research pipeline with a single Firecrawl `/agent` call that autonomously searches the web for comprehensive company intelligence. Add team profile personalization to research prompts and n8n webhook integration for supplementary data.

## Phase 1: Schema Updates

Extend the `companyResearch` table and related types to support new data fields.

### Tasks

- [ ] Add new columns to `companyResearch` table in schema: `fundingHistory`, `growthSignals`, `companySize`, `socialProfiles`, `researchPrompt`, `creditsUsed`
- [ ] Update `leadershipTeam` JSONB type to include `email` field
- [ ] Add `maxAgentCredits` column to `appSettings` table (integer, default 500)
- [ ] Run `npm run db:push` to apply schema changes

### Technical Details

**File:** `src/lib/schema.ts` (lines 240-272)

New columns on `companyResearch`:
```typescript
fundingHistory: jsonb("funding_history").$type<
  Array<{ round: string; amount: string | null; date: string | null; investors: string[] }>
>(),
growthSignals: jsonb("growth_signals").$type<string[]>(),
companySize: varchar("company_size", { length: 50 }),
socialProfiles: jsonb("social_profiles").$type<{
  linkedin: string | null;
  twitter: string | null;
  crunchbase: string | null;
}>(),
researchPrompt: text("research_prompt"),
creditsUsed: integer("credits_used"),
```

Updated `leadershipTeam` type:
```typescript
leadershipTeam: jsonb("leadership_team").$type<
  Array<{ name: string; title: string; email: string | null; linkedinUrl: string | null }>
>(),
```

New column on `appSettings`:
```typescript
maxAgentCredits: integer("max_agent_credits").default(500),
```

## Phase 2: Research Engine Rewrite [complex]

Replace multi-step search/scrape/AI pipeline with Firecrawl `/agent` endpoint.

### Tasks

- [ ] Create new `researchWithAgent()` function that calls Firecrawl `/v2/agent` endpoint
- [ ] Create `buildAgentPrompt()` function that constructs personalized research prompt from filing data + team profile
- [ ] Define Zod schema for agent structured output matching new DB columns
- [ ] Convert Zod schema to JSON Schema for the agent `schema` parameter
- [ ] Rename existing `researchCompany()` to `researchCompanyLegacy()` as fallback
- [ ] Create new `researchCompany()` that uses agent with legacy fallback on failure
- [ ] Handle agent response parsing and map to DB insert shape

### Technical Details

**File:** `src/lib/ai/research.ts` (full rewrite of main flow)

**Firecrawl Agent API Call:**
```typescript
POST https://api.firecrawl.dev/v2/agent
Headers: { Authorization: "Bearer ${FIRECRAWL_API_KEY}", "Content-Type": "application/json" }
Body: {
  prompt: string,        // built by buildAgentPrompt()
  schema: object,        // JSON Schema for structured output
  maxCredits: number     // from appSettings, default 500
}
```

**Response shape:**
```typescript
{
  success: boolean;
  status: "completed" | "processing" | "failed";
  data: { ...structured fields matching schema };
  creditsUsed: number;
}
```

**Agent prompt construction (`buildAgentPrompt`):**
- Include: company name, industry, location, total offering from filing
- Include team profile context when available: targetMarkets, targetIndustries, expertise, idealCompanyProfile
- Explicitly request: leadership with emails, LinkedIn profiles, funding rounds, growth signals, office locations, employee count, tech stack, recent news, social profiles
- Example prompt structure:
```
Research "${companyName}" comprehensively. This company filed a Form D with the SEC indicating a ${totalOffering} fundraise in the ${industryGroup} sector, based in ${city}, ${state}.

[If team profile exists:]
Context: This research is for ${teamName} at ${companyName}, a team specializing in ${expertise.join(', ')}. They target ${targetMarkets.join(', ')} markets in ${targetIndustries.join(', ')} industries. Their ideal company profile: ${idealCompanyProfile}.

Find and extract:
1. Company website URL
2. 3-4 sentence summary of what the company does, their products/services, and market position
3. Leadership team with: full name, title, email address (search for contact pages, team pages, LinkedIn), LinkedIn profile URL
4. All office locations (city, state, country, type: HQ/branch/satellite)
5. Funding history: all known rounds (type, amount, date, lead investors)
6. Growth signals: hiring velocity, expansion announcements, partnerships, product launches, awards
7. Current job openings count
8. Estimated employee count
9. Technology stack
10. Recent news and press mentions (last 12 months)
11. Social profiles: company LinkedIn page, Twitter/X, Crunchbase page
12. Company size category: startup (<50), scaleup (50-500), or enterprise (500+)

Be thorough. Search multiple sources including the company website, LinkedIn, Crunchbase, news sites, and job boards.
```

**Updated ResearchInput interface:**
```typescript
export interface ResearchInput {
  companyName: string;
  industryGroup: string | null;
  issuerCity: string | null;
  issuerState: string | null;
  totalOffering: string | null;
}

export interface TeamProfileContext {
  teamName: string | null;
  companyName: string | null;
  expertise: string[] | null;
  targetMarkets: string[] | null;
  targetIndustries: string[] | null;
  idealCompanyProfile: string | null;
}
```

**Zod schema for agent output:**
```typescript
const agentResearchSchema = z.object({
  websiteUrl: z.string().nullable(),
  websiteSummary: z.string(),
  leadershipTeam: z.array(z.object({
    name: z.string(),
    title: z.string(),
    email: z.string().nullable(),
    linkedinUrl: z.string().nullable(),
  })),
  officeLocations: z.array(z.object({
    city: z.string(),
    state: z.string(),
    country: z.string(),
    type: z.string(),
  })),
  fundingHistory: z.array(z.object({
    round: z.string(),
    amount: z.string().nullable(),
    date: z.string().nullable(),
    investors: z.array(z.string()),
  })),
  growthSignals: z.array(z.string()),
  jobPostingsCount: z.number().int().nullable(),
  employeeEstimate: z.number().int().nullable(),
  techStack: z.array(z.string()),
  recentNews: z.array(z.object({
    headline: z.string(),
    date: z.string(),
    url: z.string().nullable(),
    summary: z.string(),
  })),
  socialProfiles: z.object({
    linkedin: z.string().nullable(),
    twitter: z.string().nullable(),
    crunchbase: z.string().nullable(),
  }),
  companySize: z.string().nullable(),
});
```

**Convert Zod to JSON Schema:** Use `zod-to-json-schema` package or manually construct. The Firecrawl agent accepts standard JSON Schema in the `schema` field.

## Phase 3: API Route Updates

Update research API routes to use new engine and pass team profile context.

### Tasks

- [ ] Update POST `/api/edgar/filings/[id]/research/route.ts` to load team profile and pass to research function
- [ ] Store `researchPrompt` and `creditsUsed` in database on research completion
- [ ] Update GET handler response to include new fields
- [ ] Update batch research route to use new `researchCompany()` function
- [ ] Add `maxAgentCredits` to settings queries in batch route

### Technical Details

**File:** `src/app/api/edgar/filings/[id]/research/route.ts`

In POST handler:
1. After auth check, query `teamProfiles` for the user's profile
2. Build `TeamProfileContext` from profile data
3. Query `appSettings` for `maxAgentCredits`
4. Call `researchCompany(filingData, teamProfileContext, maxCredits)`
5. Store result including `researchPrompt` and `creditsUsed`

**File:** `src/app/api/edgar/research/batch/route.ts`

- Update to call new `researchCompany()` (no team profile for batch — uses generic prompt)
- Read `maxAgentCredits` from app settings alongside other settings

## Phase 4: n8n Webhook Integration

Create webhook endpoint for receiving research data from external n8n workflows.

### Tasks

- [ ] Create new route `src/app/api/edgar/research/webhook/route.ts`
- [ ] Implement POST handler that accepts research data keyed by filingId
- [ ] Implement merge logic: supplement existing research fields without overwriting non-null values
- [ ] Authenticate via `x-api-key` header (INGEST_API_KEY)

### Technical Details

**File:** `src/app/api/edgar/research/webhook/route.ts` (NEW)

```typescript
// POST /api/edgar/research/webhook
// Headers: x-api-key: INGEST_API_KEY
// Body: {
//   filingId: string,
//   data: Partial<CompanyResearchFields>
// }
```

**Merge logic:**
- If no existing research for filingId: insert as new record with source "n8n"
- If existing research: merge fields — n8n data fills in nulls/empty arrays but does not overwrite existing non-null values
- Leadership team: merge by name (add new people, add emails to existing people who lack them)
- Arrays (growthSignals, techStack): concatenate and deduplicate

## Phase 5: UI Updates [complex]

Update filing detail page to display all new research fields.

### Tasks

- [ ] Add email display on leadership team entries (mailto: links)
- [ ] Add LinkedIn profile links on leadership entries
- [ ] Add funding history section with timeline-style display
- [ ] Add growth signals as badge chips
- [ ] Add social profile links section (LinkedIn, Twitter, Crunchbase icons)
- [ ] Add company size indicator
- [ ] Update research loading message to reflect longer wait time (~1-2 minutes)
- [ ] Handle backward compatibility — existing records without new fields display correctly

### Technical Details

**File:** `src/app/dashboard/filings/[id]/page.tsx` (lines 633-810)

**Leadership team update (lines 712-726):**
Replace simple badges with richer cards showing name, title, email (mailto:), LinkedIn link.

**New sections to add after existing ones:**

Funding History (after office locations):
- Show as a vertical list: "Series A - $5M - Jan 2024 - Led by Acme Ventures"
- Use a simple card layout, no charting needed

Growth Signals (after tech stack):
- Render as Badge components with variant="default"

Social Profiles (after growth signals):
- Horizontal row of icon links: LinkedIn, Twitter/X, Crunchbase
- Use lucide-react icons or simple text links

Company Size (in the stats grid, lines 674-693):
- Add alongside Est. Employees and Open Positions

Loading state (line 647):
- Change message from "30-60 seconds" to "1-2 minutes"

## Phase 6: Settings UI

Add credit control to settings page.

### Tasks

- [ ] Add `maxAgentCredits` slider/input to settings page (range 100-2500, default 500)
- [ ] Wire up save/load for the new setting

### Technical Details

**File:** `src/app/dashboard/settings/page.tsx`

- Add to existing settings form
- Slider component: min=100, max=2500, step=100, default=500
- Label: "Max Firecrawl Credits per Research"
- Helper text: "Controls how deeply the agent researches each company. Higher = more thorough but costs more credits."
- Use existing shadcn Slider component at `src/components/ui/slider.tsx`

## Files Summary

| File | Action |
|------|--------|
| `src/lib/schema.ts` | Extend companyResearch + appSettings tables |
| `src/lib/ai/research.ts` | Rewrite to use Firecrawl /agent with team profile |
| `src/app/api/edgar/filings/[id]/research/route.ts` | Pass team profile, store new fields |
| `src/app/api/edgar/research/batch/route.ts` | Use new research function |
| `src/app/api/edgar/research/webhook/route.ts` | NEW - n8n webhook receiver |
| `src/app/dashboard/filings/[id]/page.tsx` | Display emails, funding, growth signals, social |
| `src/app/dashboard/settings/page.tsx` | Add maxAgentCredits setting |
| `package.json` | Add `zod-to-json-schema` if needed |
