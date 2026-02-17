# FormD Scout

Detect funding rounds before the press release. FormD Scout monitors SEC EDGAR Form D filings to detect companies that have recently raised private funding, giving commercial real estate brokers an early signal to identify companies likely to need office space.

## Overview

Form D filings appear on EDGAR 2-3 weeks before press releases. FormD Scout:

1. **Ingests** Form D filings daily from the free SEC EDGAR API
2. **Parses** Form D XML documents to extract structured data
3. **Enriches** filings with AI-generated relevance scores (scored for NYC office leasing)
4. **Displays** everything in a filterable, sortable dashboard

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, recharts
- **Backend**: Next.js API Route Handlers, Drizzle ORM, PostgreSQL
- **AI**: Vercel AI SDK with OpenRouter
- **Auth**: Better Auth with Google OAuth
- **Data**: SEC EDGAR EFTS API (free, no auth required)

## Quick Setup

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Install dependencies and start dev server
./init.sh
```

Or manually:

```bash
# Install deps
npm install
npm install fast-xml-parser date-fns recharts

# Apply database schema
npm run db:push

# Start dev server
npm run dev
```

App available at [http://localhost:3000](http://localhost:3000)

## Environment Variables

Copy `.env` and configure:

| Variable | Description | Required |
|----------|-------------|----------|
| `POSTGRES_URL` | PostgreSQL connection string | Yes |
| `BETTER_AUTH_SECRET` | Auth secret key | Yes |
| `OPENROUTER_API_KEY` | OpenRouter API key (for AI enrichment) | For enrichment |
| `OPENROUTER_MODEL` | AI model to use | For enrichment |
| `INGEST_API_KEY` | API key for ingestion/enrichment endpoints | Yes |
| `NEXT_PUBLIC_APP_URL` | App URL | Yes |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/              # Auth endpoints (DO NOT MODIFY)
│   │   ├── chat/              # AI chat endpoint (DO NOT MODIFY)
│   │   ├── health/            # Health check endpoint
│   │   └── edgar/
│   │       ├── ingest/        # POST - Ingest Form D filings from SEC
│   │       ├── enrich/        # POST - AI enrichment of filings
│   │       ├── filings/       # GET - Query filings with filters
│   │       ├── stats/         # GET - Dashboard statistics
│   │       ├── export/        # GET - CSV export
│   │       └── filters/       # GET/POST/DELETE - Saved filters
│   ├── dashboard/
│   │   ├── page.tsx           # Dashboard home (stats, charts)
│   │   ├── layout.tsx         # Dashboard layout with nav
│   │   └── filings/
│   │       ├── page.tsx       # Filterable filings table
│   │       └── [id]/page.tsx  # Filing detail with AI analysis
│   └── page.tsx               # Landing page
├── components/
│   ├── auth/                  # Auth components
│   └── ui/                    # shadcn/ui components
├── lib/
│   ├── edgar/
│   │   ├── types.ts           # TypeScript interfaces for EDGAR data
│   │   ├── fetcher.ts         # SEC EDGAR API client
│   │   └── parser.ts          # Form D XML parser
│   ├── ai/
│   │   └── enrichment.ts      # AI enrichment service
│   ├── schema.ts              # Drizzle ORM schema
│   ├── db.ts                  # Database connection
│   └── auth.ts                # Auth config
└── scripts/
    └── backfill.ts            # Backfill last 30 days of filings
```

## API Endpoints

### Protected by `x-api-key` (for external automation/n8n)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/edgar/ingest` | Ingest Form D filings for a date range |
| POST | `/api/edgar/enrich` | AI-enrich filings (single or batch) |

### Protected by authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/edgar/filings` | Query filings with pagination, filters, sorting |
| GET | `/api/edgar/stats` | Dashboard statistics |
| GET | `/api/edgar/export` | CSV export with filters |
| GET/POST/DELETE | `/api/edgar/filters` | Saved filter management |

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type check
npm run db:push      # Push schema changes
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio
npm run backfill     # Backfill last 30 days of filings
```

## SEC EDGAR API Notes

- All SEC EDGAR APIs are **free** and require **no authentication**
- A `User-Agent` header is required: `NOCODE-GDN-LLC contact@nocodegdn.com`
- Rate limit: max 10 requests/second (150ms delay between requests)
- Accession numbers stored with dashes (e.g., `0001234567-25-000001`)
- "Indefinite" offering amounts stored as null
