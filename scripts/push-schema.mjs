import pg from "pg";
const { Client } = pg;

const client = new Client({
  user: "dev_user",
  password: "dev_password",
  port: 5432,
  host: "localhost",
  database: "postgres_dev",
});

await client.connect();

// First, create auth tables if they don't exist (needed by saved_filters FK)
await client.query(`
  CREATE TABLE IF NOT EXISTS "user" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "email_verified" boolean DEFAULT false NOT NULL,
    "image" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  );
`);
console.log("Created/verified user table");

await client.query(`
  CREATE TABLE IF NOT EXISTS "session" (
    "id" text PRIMARY KEY,
    "expires_at" timestamp NOT NULL,
    "token" text NOT NULL UNIQUE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
  );
`);
console.log("Created/verified session table");

await client.query(`
  CREATE TABLE IF NOT EXISTS "account" (
    "id" text PRIMARY KEY,
    "account_id" text NOT NULL,
    "provider_id" text NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "access_token" text,
    "refresh_token" text,
    "id_token" text,
    "access_token_expires_at" timestamp,
    "refresh_token_expires_at" timestamp,
    "scope" text,
    "password" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp NOT NULL
  );
`);
console.log("Created/verified account table");

await client.query(`
  CREATE TABLE IF NOT EXISTS "verification" (
    "id" text PRIMARY KEY,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  );
`);
console.log("Created/verified verification table");

// Auth indexes
await client.query(`CREATE INDEX IF NOT EXISTS "user_email_idx" ON "user" ("email");`);
await client.query(`CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" ("user_id");`);
await client.query(`CREATE INDEX IF NOT EXISTS "session_token_idx" ON "session" ("token");`);
await client.query(`CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account" ("user_id");`);
await client.query(`CREATE INDEX IF NOT EXISTS "account_provider_account_idx" ON "account" ("provider_id", "account_id");`);
console.log("Created auth indexes");

// Create formDFilings table
await client.query(`
  CREATE TABLE IF NOT EXISTS "form_d_filings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "cik" varchar(10) NOT NULL,
    "accession_number" varchar(25) NOT NULL UNIQUE,
    "company_name" text NOT NULL,
    "entity_type" varchar(50),
    "state_of_inc" varchar(10),
    "sic_code" varchar(10),
    "filing_date" date NOT NULL,
    "is_amendment" boolean DEFAULT false,
    "total_offering" numeric(15,2),
    "amount_sold" numeric(15,2),
    "amount_remaining" numeric(15,2),
    "num_investors" integer,
    "min_investment" numeric(15,2),
    "revenue_range" varchar(100),
    "industry_group" varchar(200),
    "issuer_street" text,
    "issuer_city" varchar(100),
    "issuer_state" varchar(10),
    "issuer_zip" varchar(20),
    "issuer_phone" varchar(30),
    "filing_url" text,
    "xml_url" text,
    "first_sale_date" date,
    "yet_to_occur" boolean,
    "more_than_one_year" boolean,
    "federal_exemptions" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  );
`);
console.log("Created form_d_filings table");

// Create filing_enrichments table
await client.query(`
  CREATE TABLE IF NOT EXISTS "filing_enrichments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "filing_id" uuid NOT NULL REFERENCES "form_d_filings"("id") ON DELETE CASCADE,
    "company_summary" text,
    "relevance_score" integer,
    "relevance_reasoning" text,
    "estimated_headcount" integer,
    "growth_signals" jsonb,
    "competitors" jsonb,
    "enriched_at" timestamp DEFAULT now() NOT NULL,
    "model_used" varchar(100)
  );
`);
console.log("Created filing_enrichments table");

// Create saved_filters table
await client.query(`
  CREATE TABLE IF NOT EXISTS "saved_filters" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "filter_name" varchar(200) NOT NULL,
    "min_offering" numeric(15,2),
    "max_offering" numeric(15,2),
    "industry_groups" jsonb,
    "states" jsonb,
    "min_relevance" integer,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now() NOT NULL
  );
`);
console.log("Created saved_filters table");

// Create indexes
await client.query(`CREATE INDEX IF NOT EXISTS "filing_date_idx" ON "form_d_filings" ("filing_date");`);
await client.query(`CREATE INDEX IF NOT EXISTS "industry_group_idx" ON "form_d_filings" ("industry_group");`);
await client.query(`CREATE INDEX IF NOT EXISTS "issuer_state_idx" ON "form_d_filings" ("issuer_state");`);
await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "accession_number_idx" ON "form_d_filings" ("accession_number");`);
await client.query(`CREATE INDEX IF NOT EXISTS "filing_id_idx" ON "filing_enrichments" ("filing_id");`);
await client.query(`CREATE INDEX IF NOT EXISTS "saved_filters_user_id_idx" ON "saved_filters" ("user_id");`);
console.log("Created indexes");

// Verify
const tables = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name
`);
console.log("Tables:", tables.rows.map(r => r.table_name));

await client.end();
console.log("SCHEMA PUSH COMPLETE");
