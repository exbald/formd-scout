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
    accessionNumber: varchar("accession_number", { length: 25 })
      .notNull()
      .unique(),
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
