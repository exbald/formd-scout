# Implementation Plan: Lead Intelligence Platform

## Overview

Add onboarding wizard, Firecrawl-powered company research, configurable AI scoring, email draft generator, and automated n8n pipeline to FormD Scout. 6 new database tables, 3 new AI modules, 10+ new API routes, 3 new dashboard pages.

---

## Phase 1: Database Schema ✅ COMPLETE

All new tables added at once to minimize migration steps.

### Tasks

- [x] Add `teamProfiles` table to `src/lib/schema.ts`
- [x] Add `appSettings` table to `src/lib/schema.ts`
- [x] Add `companyResearch` table to `src/lib/schema.ts`
- [x] Add `alertConfigs` table to `src/lib/schema.ts`
- [x] Add `alertHistory` table to `src/lib/schema.ts`
- [x] Add `emailDrafts` table to `src/lib/schema.ts`
- [x] Add `officeSpaceLikelihood` varchar field to `filingEnrichments` table
- [x] Run `npm run db:push` to apply schema

### Technical Details

**File:** `src/lib/schema.ts`

All tables follow existing patterns: uuid PKs via `uuid("id").primaryKey().defaultRandom()`, timestamps via `timestamp("created_at").defaultNow().notNull()`, FK references with `{ onDelete: "cascade" }`.

```typescript
// teamProfiles - drives scoring, outreach, and onboarding
export const teamProfiles = pgTable(
  "team_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    teamName: varchar("team_name", { length: 200 }),
    companyName: varchar("company_name", { length: 200 }),
    keyClients:
      jsonb("key_clients").$type<
        Array<{ name: string; industry: string; relationship: string; notableDeals: string }>
      >(),
    teamBio: text("team_bio"),
    expertise: jsonb("expertise").$type<string[]>(),
    targetMarkets: jsonb("target_markets").$type<string[]>(),
    targetIndustries: jsonb("target_industries").$type<string[]>(),
    idealCompanyProfile: text("ideal_company_profile"),
    scoringCriteria: jsonb("scoring_criteria").$type<{
      high: string;
      medium: string;
      low: string;
    }>(),
    emailSignature: text("email_signature"),
    emailTone: varchar("email_tone", { length: 20 }), // "professional" | "warm" | "casual"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("team_profiles_user_id_idx").on(table.userId)]
);

// appSettings - user-level configuration for automation
export const appSettings = pgTable(
  "app_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    autoResearchThreshold: integer("auto_research_threshold").default(60),
    autoResearchEnabled: boolean("auto_research_enabled").default(true),
    maxDailyResearch: integer("max_daily_research").default(15),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("app_settings_user_id_idx").on(table.userId)]
);

// companyResearch - Firecrawl-powered deep research
export const companyResearch = pgTable(
  "company_research",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filingId: uuid("filing_id")
      .notNull()
      .references(() => formDFilings.id, { onDelete: "cascade" }),
    websiteUrl: text("website_url"),
    websiteSummary: text("website_summary"),
    jobPostings:
      jsonb("job_postings").$type<
        Array<{ title: string; location: string; url: string; datePosted: string }>
      >(),
    jobPostingsCount: integer("job_postings_count"),
    leadershipTeam:
      jsonb("leadership_team").$type<Array<{ name: string; title: string; linkedinUrl: string }>>(),
    officeLocations:
      jsonb("office_locations").$type<
        Array<{ city: string; state: string; country: string; type: string }>
      >(),
    techStack: jsonb("tech_stack").$type<string[]>(),
    recentNews:
      jsonb("recent_news").$type<
        Array<{ headline: string; date: string; url: string; summary: string }>
      >(),
    employeeEstimate: integer("employee_estimate"),
    researchedAt: timestamp("researched_at").defaultNow().notNull(),
    source: varchar("source", { length: 50 }), // "firecrawl" | "manual"
  },
  (table) => [index("company_research_filing_id_idx").on(table.filingId)]
);

// alertConfigs - user alert preferences
export const alertConfigs = pgTable(
  "alert_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    minRelevanceScore: integer("min_relevance_score"),
    states: jsonb("states").$type<string[]>(),
    industries: jsonb("industries").$type<string[]>(),
    minOffering: numeric("min_offering", { precision: 15, scale: 2 }),
    emailEnabled: boolean("email_enabled").default(false),
    emailAddress: text("email_address"),
    webhookUrl: text("webhook_url"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("alert_configs_user_id_idx").on(table.userId)]
);

// alertHistory - track sent alerts
export const alertHistory = pgTable("alert_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  alertConfigId: uuid("alert_config_id")
    .notNull()
    .references(() => alertConfigs.id, { onDelete: "cascade" }),
  filingId: uuid("filing_id")
    .notNull()
    .references(() => formDFilings.id, { onDelete: "cascade" }),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  channel: varchar("channel", { length: 20 }), // "email" | "webhook"
});

// emailDrafts - generated outreach emails
export const emailDrafts = pgTable(
  "email_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filingId: uuid("filing_id")
      .notNull()
      .references(() => formDFilings.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipientName: varchar("recipient_name", { length: 200 }),
    recipientTitle: varchar("recipient_title", { length: 200 }),
    recipientEmail: varchar("recipient_email", { length: 200 }),
    subject: text("subject"),
    body: text("body"),
    followUpSequence:
      jsonb("follow_up_sequence").$type<
        Array<{ delayDays: number; subject: string; body: string }>
      >(),
    referencedClients: jsonb("referenced_clients").$type<string[]>(),
    status: varchar("status", { length: 20 }).default("draft"), // "draft" | "sent" | "archived"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("email_drafts_filing_id_idx").on(table.filingId),
    index("email_drafts_user_id_idx").on(table.userId),
  ]
);
```

Also add to `filingEnrichments`:

```typescript
officeSpaceLikelihood: varchar("office_space_likelihood", { length: 20 }),
```

**Command:** `npm run db:push`

---

## Phase 2: Onboarding Wizard

Creates the team profile that all other features depend on.

### Tasks

- [ ] Create industry template definitions in `src/lib/onboarding/templates.ts`
- [ ] Create team profile API route `src/app/api/edgar/profile/route.ts` (GET/POST/PUT)
- [ ] Create app settings API route `src/app/api/edgar/settings/route.ts` (GET/PUT)
- [ ] Create onboarding wizard page `src/app/dashboard/onboarding/page.tsx` [complex]
  - [ ] Step 1: Industry vertical selection (card grid)
  - [ ] Step 2: Target markets multi-select (pre-filled from template)
  - [ ] Step 3: Scoring criteria review/edit (pre-filled, editable)
  - [ ] Step 4: Key clients input (optional, skip-able)
  - [ ] Step 5: Research threshold slider
  - [ ] Finish: create records + redirect to dashboard
- [ ] Add onboarding redirect check in `src/app/dashboard/layout.tsx`

### Technical Details

**`src/lib/onboarding/templates.ts`** - Industry templates:

```typescript
export interface IndustryTemplate {
  id: string;
  name: string;
  icon: string; // lucide icon name
  description: string;
  targetMarkets: string[];
  targetIndustries: string[];
  idealCompanyProfile: string;
  scoringCriteria: { high: string; medium: string; low: string };
  emailTone: "professional" | "warm" | "casual";
  autoResearchThreshold: number;
}

// Templates: "cre-broker", "b2b-saas", "recruiter", "vc-investor", "professional-services"
```

CRE Broker template (default):

- targetMarkets: ["New York", "Manhattan", "NYC Tri-State"]
- targetIndustries: ["Technology", "Fintech", "AI/ML", "SaaS", "E-commerce"]
- idealCompanyProfile: "Growth-stage technology companies with 50+ employees likely to need significant office space in major US metro areas"
- scoringCriteria.high: "Tech/growth company, large funding round ($10M+), in target market, clear indicators of office space needs (hiring, expanding)"
- scoringCriteria.medium: "Potential office needs but less certain - smaller round, non-tech but growing, or outside primary target market"
- scoringCriteria.low: "Pooled investment fund, real estate holding, very small round (<$1M), shell company, or no clear office space need"
- emailTone: "professional"
- autoResearchThreshold: 60

**`src/app/api/edgar/profile/route.ts`**:

- GET: Fetch team profile for authenticated user. Return null if none exists.
- POST: Create team profile (used by onboarding wizard)
- PUT: Update team profile (used by settings page)
- Session auth required (use existing Better Auth pattern from `src/app/api/edgar/filings/[id]/enrich/route.ts`)

**`src/app/api/edgar/settings/route.ts`**:

- GET: Fetch app settings for authenticated user. Return defaults if none saved: `{ autoResearchThreshold: 60, autoResearchEnabled: true, maxDailyResearch: 15 }`
- PUT: Upsert app settings

**Onboarding gate** in `src/app/dashboard/layout.tsx`:

- After auth check, query `teamProfiles` for the user
- If no profile exists AND path is not `/dashboard/onboarding`, redirect to `/dashboard/onboarding`

---

## Phase 3: Company Deep Research (Firecrawl) ✅ COMPLETE

### Tasks

- [x] Create research AI module `src/lib/ai/research.ts` [complex]
  - [x] `searchCompanyWebsite(companyName)` - Firecrawl search
  - [x] `scrapeCompanyData(url)` - Firecrawl scrape
  - [x] `extractResearchData(scrapedContent, filingData)` - AI structured extraction
- [x] Create research API route `src/app/api/edgar/filings/[id]/research/route.ts` (GET/POST)
- [x] Add "Company Intel" section to filing detail page `src/app/dashboard/filings/[id]/page.tsx` [complex]
  - [x] "Research Company" button with loading state
  - [x] Display cards: website summary, job postings, leadership, offices, news
  - [x] Empty/error states

### Technical Details

**`src/lib/ai/research.ts`** - Firecrawl + AI research module:

Uses Firecrawl MCP tools (available via the firecrawl skill):

1. `firecrawl_search` with query `"<companyName> company"` to find website URL
2. `firecrawl_scrape` on the found URL with `onlyMainContent: true`
3. `firecrawl_search` with query `"<companyName> careers jobs hiring"` for job data

Then pass scraped markdown to `generateObject` with Zod schema (same pattern as `src/lib/ai/enrichment.ts`):

```typescript
const researchSchema = z.object({
  websiteSummary: z.string().describe("2-3 sentence summary of what the company does"),
  jobPostings: z
    .array(
      z.object({
        title: z.string(),
        location: z.string(),
        url: z.string().optional(),
        datePosted: z.string().optional(),
      })
    )
    .describe("Current job openings found"),
  jobPostingsCount: z.number().int().describe("Total number of open positions"),
  leadershipTeam: z
    .array(
      z.object({
        name: z.string(),
        title: z.string(),
        linkedinUrl: z.string().optional(),
      })
    )
    .describe("Key executives and leadership"),
  officeLocations: z
    .array(
      z.object({
        city: z.string(),
        state: z.string(),
        country: z.string().default("US"),
        type: z.string().default("office"),
      })
    )
    .describe("Known office locations"),
  techStack: z.array(z.string()).describe("Technologies and platforms used"),
  recentNews: z
    .array(
      z.object({
        headline: z.string(),
        date: z.string(),
        url: z.string().optional(),
        summary: z.string(),
      })
    )
    .describe("Recent news or press mentions"),
  employeeEstimate: z.number().int().describe("Estimated employee count from website/data"),
});
```

**Note on Firecrawl integration**: The firecrawl MCP tools are available as skills. For the API route, we need to call Firecrawl via their REST API or npm package, not MCP tools. Check if `firecrawl` npm package is installed, otherwise use `fetch` against the Firecrawl API endpoint. The API key should be in env var `FIRECRAWL_API_KEY`.

**`src/app/api/edgar/filings/[id]/research/route.ts`**:

- POST: Trigger research. Accepts session auth OR x-api-key (for n8n). Calls research module, stores in `companyResearch` table.
- GET: Return existing research for the filing. Returns 404 if not researched yet.
- Pattern: follow `src/app/api/edgar/filings/[id]/enrich/route.ts` exactly.

---

## Phase 4: Dynamic Configurable Scoring ✅ COMPLETE

### Tasks

- [x] Create `ScoringProfile` interface and `buildDynamicEnrichmentPrompt()` in `src/lib/ai/enrichment.ts`
- [x] Update `enrichFiling()` to accept optional `ScoringProfile` and `websiteContent` params
- [x] Add `officeSpaceLikelihood` to enrichment Zod schema
- [x] Update `/api/edgar/enrich` route to load team profile for prompt building
- [x] Update `/api/edgar/enrich-batch` route to load team profile
- [x] Add "Re-score all filings" button to settings page

### Technical Details

**`src/lib/ai/enrichment.ts`** changes:

```typescript
export interface ScoringProfile {
  targetMarkets: string[];
  targetIndustries: string[];
  idealCompanyProfile: string;
  scoringCriteria: {
    high: string;
    medium: string;
    low: string;
  };
}

// Default profile (backward compatible with current hardcoded prompt)
export const DEFAULT_SCORING_PROFILE: ScoringProfile = {
  targetMarkets: ["New York", "Manhattan", "NYC tri-state area"],
  targetIndustries: ["technology", "fintech", "AI/ML", "SaaS"],
  idealCompanyProfile: "Growth-stage technology companies likely to need significant office space",
  scoringCriteria: {
    high: "Tech/growth company, large funding round, in target market, likely to need significant office space",
    medium:
      "Potential office needs but less certain - smaller round, non-tech but growing, or outside primary target market",
    low: "Pooled investment fund, real estate fund, very small round, shell company, or no clear office space need",
  },
};
```

New `buildEnrichmentPrompt(filing: EnrichmentInput, profile: ScoringProfile, websiteContent?: string)`:

- Replaces hardcoded NYC/tech text with profile values
- When `websiteContent` is provided, adds a "Website Research Data:" section to the prompt
- Scoring guidelines section uses `profile.scoringCriteria.high/medium/low`

Add to enrichment Zod schema:

```typescript
officeSpaceLikelihood: z.enum(["high", "medium", "low", "unknown"]).describe("Likelihood this company needs office space based on all available data"),
```

**Enrich API routes** (`/api/edgar/enrich` and `/api/edgar/enrich-batch`):

- When called with session auth: load user's team profile from `teamProfiles` table
- When called with x-api-key: accept optional `profileId` body param. If provided, load that profile. Otherwise, load the first team profile found (system default).
- Pass profile to `enrichFiling()` as `ScoringProfile`

---

## Phase 5: AI Email Draft Generator ✅ COMPLETE

### Tasks

- [x] Create email generation AI module `src/lib/ai/email-generator.ts`
- [x] Create email generate API route `src/app/api/edgar/email/generate/route.ts`
- [x] Create email drafts CRUD API route `src/app/api/edgar/email/drafts/route.ts`
- [x] Create Outreach dashboard page `src/app/dashboard/outreach/page.tsx` [complex]
  - [x] Drafts table with status filters
  - [x] Expand/edit draft inline
  - [x] Copy to clipboard
- [x] Add "Draft Email" button to filing detail page `src/app/dashboard/filings/[id]/page.tsx`
- [x] Add Team Profile form to settings page `src/app/dashboard/settings/page.tsx` [complex]
  - [x] Team info section (name, company)
  - [x] Scoring profile section (target markets, industries, ideal profile, criteria)
  - [x] Key clients section (add/remove list)
  - [x] Outreach section (bio, expertise, signature, tone)
- [x] Add "Outreach" to nav items in `src/app/dashboard/nav.tsx`

### Technical Details

**`src/lib/ai/email-generator.ts`**:

Same `generateObject` + Zod pattern. Input:

```typescript
interface EmailGenerationInput {
  filing: {
    companyName: string;
    totalOffering: string | null;
    industryGroup: string | null;
    issuerCity: string | null;
    issuerState: string | null;
    filingDate: string;
  };
  enrichment: {
    companySummary: string | null;
    relevanceScore: number | null;
    growthSignals: string[] | null;
    competitors: string[] | null;
  };
  research: {
    websiteSummary: string | null;
    jobPostingsCount: number | null;
    leadershipTeam: Array<{ name: string; title: string }> | null;
  } | null;
  teamProfile: {
    teamName: string | null;
    companyName: string | null;
    keyClients: Array<{ name: string; industry: string; relationship: string }>;
    teamBio: string | null;
    expertise: string[];
    emailSignature: string | null;
    emailTone: string;
  };
  overrides?: {
    recipientName?: string;
    recipientTitle?: string;
    tone?: string;
  };
}
```

Output Zod schema:

```typescript
const emailDraftSchema = z.object({
  subject: z.string().describe("Email subject line - concise, specific, not salesy"),
  body: z
    .string()
    .describe(
      "Email body - personalized, references team clients, mentions filing signals, sounds human-written"
    ),
  followUps: z
    .array(
      z.object({
        delayDays: z.number().int(),
        subject: z.string(),
        body: z.string(),
      })
    )
    .describe("2-3 follow-up emails with suggested timing"),
  referencedClients: z.array(z.string()).describe("Which team clients were mentioned in the email"),
});
```

AI prompt should:

- Reference the team's specific clients that are relevant to the target company's industry
- Mention the funding signal naturally ("We noticed your recent growth...")
- NOT mention Form D or SEC filings directly
- Include the email signature
- Match the configured tone

**`src/app/api/edgar/email/generate/route.ts`**:

- POST with `{ filingId, recipientName?, recipientTitle?, tone? }`
- Session auth required
- Loads filing + enrichment + research (if available) + team profile
- Calls `generateEmailDraft()`
- Stores result in `emailDrafts` table
- Returns the draft

**`src/app/api/edgar/email/drafts/route.ts`**:

- GET: `?status=draft&limit=20&offset=0` - list user's drafts
- PATCH: `{ id, subject?, body?, status? }` - update draft
- DELETE: `{ id }` - remove draft

**`src/app/dashboard/outreach/page.tsx`**:

- Fetches drafts from API with status filter tabs (All / Draft / Sent / Archived)
- Table columns: Company, Recipient, Subject, Status, Date
- Click row to expand inline: shows full email, edit fields, copy button
- Follow existing table patterns from `src/app/dashboard/filings/page.tsx`

**Nav update** in `src/app/dashboard/nav.tsx` line 15-19:

```typescript
{ href: "/dashboard/outreach", label: "Outreach", icon: Mail },
```

---

## Phase 6: n8n Automated Pipeline ✅ COMPLETE

### Tasks

- [x] Create batch research API route `src/app/api/edgar/research/batch/route.ts`
- [x] Create alert config CRUD API route `src/app/api/edgar/alerts/route.ts`
- [x] Create alert digest API route `src/app/api/edgar/alerts/digest/route.ts`
- [x] Add Research Automation section to settings page `src/app/dashboard/settings/page.tsx`
  - [x] Auto-research threshold slider (1-100)
  - [x] Enable/disable toggle
  - [x] Max daily research cap input
- [x] Add Alert Configuration section to settings page
  - [x] Alert form: name, min relevance, states, industries, email toggle
  - [x] List existing alerts with enable/disable
- [x] Create updated n8n workflow JSON `docs/n8n/daily-pipeline-v2.json`

### Technical Details

**`src/app/api/edgar/research/batch/route.ts`**:

- POST with x-api-key auth (same pattern as `src/app/api/edgar/ingest/route.ts:37-43`)
- Reads user's `appSettings` for threshold and daily cap
- Queries `formDFilings` joined with `filingEnrichments` where `relevanceScore >= threshold` and no `companyResearch` record exists
- Processes up to 5 per call (Firecrawl rate limits)
- Returns `{ researched, errors, threshold, remaining, details }`

**`src/app/api/edgar/alerts/route.ts`**:

- Standard CRUD with session auth
- GET: list alerts for user
- POST: create alert `{ name, minRelevanceScore, states, industries, minOffering, emailEnabled, emailAddress, webhookUrl }`
- PUT: update alert by id
- DELETE: remove alert by id

**`src/app/api/edgar/alerts/digest/route.ts`**:

- POST with x-api-key auth
- Queries filings from last 24h joined with enrichments
- For each active alert config, checks if filing matches criteria
- For email-enabled alerts: send email via fetch to a simple email API (Resend recommended - `RESEND_API_KEY` env var)
- Records in `alertHistory` table to prevent duplicate sends
- Returns `{ alertsSent, filingsMatched, details }`

**Updated n8n workflow** (`docs/n8n/daily-pipeline-v2.json`):
Extends existing workflow from `docs/technical/n8n-cron.json`. New nodes added after "Build Summary":

1. "Research High-Relevance" → POST /api/edgar/research/batch (x-api-key header)
2. "More to Research?" → IF researched >= 4 (near batch limit)
3. "Research Batch 2" → POST /api/edgar/research/batch
4. "Send Alert Digest" → POST /api/edgar/alerts/digest (x-api-key header)

Same retry/timeout patterns as existing nodes (retryOnFail: true, maxTries: 2-3, timeout: 300000ms).

**Settings UI additions** in `src/app/dashboard/settings/page.tsx`:

Research Automation section:

- Slider component for threshold (shadcn Slider or input type="range")
- Description text: "Filings scoring above this threshold will be automatically researched. Lower = more research, higher cost. Higher = fewer, more targeted."
- Toggle for enable/disable
- Number input for max daily cap

Alert Configuration section:

- Form to create/edit alerts
- Reuse `src/components/ui/multi-select.tsx` for states/industries (same component used in filings filter page)
- List of existing alerts with active/inactive toggle

---

## Phase 7: Verification & Polish ✅ COMPLETE

### Tasks

- [x] Verify full schema with `npm run db:push`
- [x] Test onboarding flow: new user → wizard → dashboard
- [x] Test deep research: filing detail → "Research Company" → data appears
- [x] Test configurable scoring: change profile → re-enrich → score changes
- [x] Test email drafts: filing detail → "Draft Email" → personalized email appears
- [x] Test outreach page: view/edit/copy drafts
- [x] Test n8n batch research: POST /api/edgar/research/batch → researches high-relevance filings
- [x] Test alert digest: configure alert → POST /api/edgar/alerts/digest → email sent
- [x] Run `npm run typecheck` and `npm run lint` to verify no errors
