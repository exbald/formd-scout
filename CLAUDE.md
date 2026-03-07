# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npm run check            # Lint + typecheck (run before committing)
npm run lint             # ESLint only
npm run typecheck        # TypeScript only (npx tsc --noEmit)
npm run format           # Prettier format
npm run db:push          # Push schema changes to database
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Run migrations
npm run db:studio        # Visual database browser
npm run db:reset         # Drop and recreate database
docker compose up -d     # Start local PostgreSQL (pgvector:pg18)
```

## Architecture

**FormD Scout** monitors SEC EDGAR Form D filings to detect recently-funded companies for commercial real estate brokers. Form D filings appear 2-3 weeks before press releases.

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript strict + Drizzle ORM + PostgreSQL (Neon) + Better Auth + Vercel AI SDK (OpenRouter) + shadcn/ui + Tailwind CSS v4 + recharts

### Data Pipeline

1. **Ingest** (`POST /api/edgar/ingest`) - Fetches Form D filings from SEC EFTS API, parses XML via fast-xml-parser, stores in `formDFilings` table
2. **Enrich** (`POST /api/edgar/enrich`) - AI scores each filing for CRE relevance (1-100) using OpenRouter, stores in `filingEnrichments` table
3. **Research** (`POST /api/edgar/filings/[id]/research`) - Deep company research via Firecrawl, stores in `companyResearch` table
4. **Display** - Filterable dashboard with charts, detail pages, outreach email generation

### Key Directories

- `src/app/api/edgar/` - All EDGAR-related API route handlers
- `src/app/dashboard/` - Dashboard pages (filings list, detail, settings, onboarding, outreach)
- `src/app/(marketing)/` - Public pages (login, profile, chat)
- `src/lib/edgar/` - SEC EDGAR fetcher, XML parser, types
- `src/lib/ai/` - AI enrichment, research, email generation
- `src/lib/schema.ts` - All Drizzle ORM table definitions (extend this for new tables)
- `src/components/ui/` - shadcn/ui components
- `src/lib/relevance-styles.ts` - Centralized relevance score and status badge styling

### Auth Flow

- Better Auth with Google OAuth + email/password
- `src/proxy.ts` - Middleware for route protection (cookie-based fast check)
- Protected routes: `/chat`, `/profile`, `/dashboard` and sub-routes
- Dashboard layout enforces onboarding: redirects to `/dashboard/onboarding` if no `teamProfile`
- Server: `auth.api.getSession()` | Client: `useSession()` hook

### SEC EDGAR API

- Free, no auth required. Only needs `User-Agent` header
- EFTS search: `https://efts.sec.gov/LATEST/search-index?forms=D&dateRange=custom&startdt=YYYY-MM-DD&enddt=YYYY-MM-DD`
- Rate limit: max 10 req/sec (app uses 150ms delay between requests)
- Accession numbers: SEC returns without dashes, app stores with dashes (`0001583168-24-000001`)

### Design System

- **Tokens:** All colors defined as `hsl()` CSS custom properties in `src/app/globals.css` (values MUST include `hsl()` wrapper for Tailwind v4)
- **Status tokens:** `--success`, `--warning`, `--info`, `--neutral` (with `-foreground`, `-muted`, `-border` variants)
- **Primary:** `hsl(220 80% 25%)` (Deep Corporate Blue light) / `hsl(210 60% 60%)` (dark)
- **Accent:** `hsl(214 70% 95%)` (Subtle blue tint for hover states) / `hsl(215 40% 16%)` (dark)
- **Border radius:** `0.15rem` -- sharp enterprise corners throughout
- **Card signature:** 3px primary-colored top border (`border-t-[3px] border-t-primary`)
- **Full reference:** `docs/design-system.md`

## Rules

### DO NOT MODIFY (boilerplate files)

- `src/app/api/auth/` - Auth endpoints
- `src/app/api/chat/` - AI chat endpoint
- `src/lib/auth.ts`, `src/lib/auth-client.ts` - Auth config
- `src/lib/db.ts` - Database connection
- `src/lib/storage.ts` - File storage
- `src/lib/utils.ts` - Utilities

### Tech Stack Rules

- Use ONLY the existing stack. No Express, Prisma, or additional ORMs
- Drizzle ORM for all database operations. Extend `src/lib/schema.ts` for new tables, then `npm run db:push`
- shadcn/ui for all UI components. Add via existing pattern in `src/components/ui/`
- Server components by default. `'use client'` only when needed (hooks, event handlers, browser APIs)
- All API routes in `src/app/api/` as Next.js Route Handlers (`route.ts`)
- Vercel AI SDK with OpenRouter for AI calls (model: `openai/gpt-4.1-mini`)
- fast-xml-parser for XML, date-fns for dates, recharts for charts
- TypeScript strict mode. No `any` types

### Styling Rules

- All colors must use CSS custom property tokens from `globals.css` -- never hardcode Tailwind color classes like `text-green-600`
- Use `text-success`, `bg-warning-muted`, `border-info-border`, etc. for status colors
- Use `src/lib/relevance-styles.ts` utilities for relevance score and status badge styling
- Dark mode is handled at the CSS variable level -- avoid `dark:` prefixes for token-based classes
- Use `cn()` from `@/lib/utils` for conditional class merging
