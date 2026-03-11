import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uuid,
  varchar,
  numeric,
  integer,
  date,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// IMPORTANT! ID fields should ALWAYS use UUID types, EXCEPT the BetterAuth tables.

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("user_email_idx").on(table.email)]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_token_idx").on(table.token),
  ]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    index("account_provider_account_idx").on(table.providerId, table.accountId),
  ]
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// ===================== FormD Scout Tables =====================

export const formDFilings = pgTable(
  "form_d_filings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cik: varchar("cik", { length: 10 }).notNull(),
    accessionNumber: varchar("accession_number", { length: 25 }).notNull().unique(),
    companyName: text("company_name").notNull(),
    entityType: varchar("entity_type", { length: 50 }),
    stateOfInc: varchar("state_of_inc", { length: 10 }),
    sicCode: varchar("sic_code", { length: 10 }),
    filingDate: date("filing_date").notNull(),
    isAmendment: boolean("is_amendment").default(false),
    totalOffering: numeric("total_offering", { precision: 15, scale: 2 }),
    amountSold: numeric("amount_sold", { precision: 15, scale: 2 }),
    amountRemaining: numeric("amount_remaining", { precision: 15, scale: 2 }),
    numInvestors: integer("num_investors"),
    minInvestment: numeric("min_investment", { precision: 15, scale: 2 }),
    revenueRange: varchar("revenue_range", { length: 100 }),
    industryGroup: varchar("industry_group", { length: 200 }),
    issuerStreet: text("issuer_street"),
    issuerCity: varchar("issuer_city", { length: 100 }),
    issuerState: varchar("issuer_state", { length: 10 }),
    issuerZip: varchar("issuer_zip", { length: 20 }),
    issuerPhone: varchar("issuer_phone", { length: 30 }),
    filingUrl: text("filing_url"),
    xmlUrl: text("xml_url"),
    firstSaleDate: date("first_sale_date"),
    yetToOccur: boolean("yet_to_occur"),
    moreThanOneYear: boolean("more_than_one_year"),
    federalExemptions: text("federal_exemptions"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("filing_date_idx").on(table.filingDate),
    index("industry_group_idx").on(table.industryGroup),
    index("issuer_state_idx").on(table.issuerState),
    uniqueIndex("accession_number_idx").on(table.accessionNumber),
  ]
);

export const filingEnrichments = pgTable(
  "filing_enrichments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filingId: uuid("filing_id")
      .notNull()
      .references(() => formDFilings.id, { onDelete: "cascade" }),
    companySummary: text("company_summary"),
    relevanceScore: integer("relevance_score"),
    relevanceReasoning: text("relevance_reasoning"),
    estimatedHeadcount: integer("estimated_headcount"),
    growthSignals: jsonb("growth_signals").$type<string[]>(),
    competitors: jsonb("competitors").$type<string[]>(),
    officeSpaceLikelihood: varchar("office_space_likelihood", { length: 20 }),
    enrichedAt: timestamp("enriched_at").defaultNow().notNull(),
    modelUsed: varchar("model_used", { length: 100 }),
  },
  (table) => [index("filing_id_idx").on(table.filingId)]
);

export const savedFilters = pgTable(
  "saved_filters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    filterName: varchar("filter_name", { length: 200 }).notNull(),
    minOffering: numeric("min_offering", { precision: 15, scale: 2 }),
    maxOffering: numeric("max_offering", { precision: 15, scale: 2 }),
    industryGroups: jsonb("industry_groups").$type<string[]>(),
    states: jsonb("states").$type<string[]>(),
    minRelevance: integer("min_relevance"),
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("saved_filters_user_id_idx").on(table.userId)]
);

// ===================== Lead Intelligence Platform Tables =====================

export const teamProfiles = pgTable(
  "team_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    teamName: varchar("team_name", { length: 200 }),
    companyName: varchar("company_name", { length: 200 }),
    keyClients: jsonb("key_clients").$type<
      Array<{
        name: string;
        industry: string;
        relationship: string;
        notableDeals: string;
      }>
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
    emailTone: varchar("email_tone", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("team_profiles_user_id_idx").on(table.userId)]
);

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
    maxAgentCredits: integer("max_agent_credits").default(500),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("app_settings_user_id_idx").on(table.userId)]
);

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
        Array<{ title: string; location: string; url: string | null; datePosted: string | null }>
      >(),
    jobPostingsCount: integer("job_postings_count"),
    leadershipTeam:
      jsonb("leadership_team").$type<
        Array<{ name: string; title: string; email: string | null; linkedinUrl: string | null }>
      >(),
    officeLocations:
      jsonb("office_locations").$type<
        Array<{ city: string; state: string; country: string; type: string }>
      >(),
    techStack: jsonb("tech_stack").$type<string[]>(),
    recentNews:
      jsonb("recent_news").$type<
        Array<{ headline: string; date: string; url: string | null; summary: string }>
      >(),
    employeeEstimate: integer("employee_estimate"),
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
    researchedAt: timestamp("researched_at").defaultNow().notNull(),
    source: varchar("source", { length: 50 }),
  },
  (table) => [index("company_research_filing_id_idx").on(table.filingId)]
);

export const researchJobs = pgTable(
  "research_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filingId: uuid("filing_id")
      .notNull()
      .references(() => formDFilings.id, { onDelete: "cascade" }),
    agentId: text("agent_id").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    prompt: text("prompt"),
    maxCredits: integer("max_credits"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("research_jobs_filing_id_idx").on(table.filingId),
    index("research_jobs_agent_id_idx").on(table.agentId),
  ]
);

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

export const alertHistory = pgTable("alert_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  alertConfigId: uuid("alert_config_id")
    .notNull()
    .references(() => alertConfigs.id, { onDelete: "cascade" }),
  filingId: uuid("filing_id")
    .notNull()
    .references(() => formDFilings.id, { onDelete: "cascade" }),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  channel: varchar("channel", { length: 20 }),
});

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
    status: varchar("status", { length: 20 }).default("draft"),
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
