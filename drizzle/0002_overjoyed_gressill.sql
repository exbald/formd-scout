CREATE TABLE "filing_enrichments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filing_id" uuid NOT NULL,
	"company_summary" text,
	"relevance_score" integer,
	"relevance_reasoning" text,
	"estimated_headcount" integer,
	"growth_signals" jsonb,
	"competitors" jsonb,
	"enriched_at" timestamp DEFAULT now() NOT NULL,
	"model_used" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "form_d_filings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cik" varchar(10) NOT NULL,
	"accession_number" varchar(25) NOT NULL,
	"company_name" text NOT NULL,
	"entity_type" varchar(50),
	"state_of_inc" varchar(10),
	"sic_code" varchar(10),
	"filing_date" date NOT NULL,
	"is_amendment" boolean DEFAULT false,
	"total_offering" numeric(15, 2),
	"amount_sold" numeric(15, 2),
	"amount_remaining" numeric(15, 2),
	"num_investors" integer,
	"min_investment" numeric(15, 2),
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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "form_d_filings_accession_number_unique" UNIQUE("accession_number")
);
--> statement-breakpoint
CREATE TABLE "saved_filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"filter_name" varchar(200) NOT NULL,
	"min_offering" numeric(15, 2),
	"max_offering" numeric(15, 2),
	"industry_groups" jsonb,
	"states" jsonb,
	"min_relevance" integer,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "filing_enrichments" ADD CONSTRAINT "filing_enrichments_filing_id_form_d_filings_id_fk" FOREIGN KEY ("filing_id") REFERENCES "public"."form_d_filings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "filing_id_idx" ON "filing_enrichments" USING btree ("filing_id");--> statement-breakpoint
CREATE INDEX "filing_date_idx" ON "form_d_filings" USING btree ("filing_date");--> statement-breakpoint
CREATE INDEX "industry_group_idx" ON "form_d_filings" USING btree ("industry_group");--> statement-breakpoint
CREATE INDEX "issuer_state_idx" ON "form_d_filings" USING btree ("issuer_state");--> statement-breakpoint
CREATE UNIQUE INDEX "accession_number_idx" ON "form_d_filings" USING btree ("accession_number");--> statement-breakpoint
CREATE INDEX "saved_filters_user_id_idx" ON "saved_filters" USING btree ("user_id");