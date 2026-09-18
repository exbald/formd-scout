# FormD Scout Design System

Quiet-luxury “private desk” system for CRE intelligence. Built on CSS custom properties, Tailwind CSS v4, and shadcn/ui.

## Design Principles

- **Private desk** — Warm stone, espresso ink, a single bronze accent
- **Type leads** — Newsreader headlines, Source Sans 3 UI, IBM Plex Mono for data
- **Chrome recedes** — Hairline borders, soft shadows, no competing card bars
- **Token-driven** — Every color flows from CSS custom properties in `globals.css`
- **Dark mode native** — Dual palettes on `:root` / `.dark`; prefer token classes over `dark:` prefixes

---

## Color Tokens

All colors are defined as `hsl()` values in `src/app/globals.css`. Tailwind v4 auto-generates utility classes from the `@theme inline` block. Values **must** be wrapped in `hsl()`.

### Core Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--primary` | `hsl(25 20% 14%)` (Ink) | `hsl(40 22% 88%)` (Ivory) | Buttons, wordmark, primary actions |
| `--primary-foreground` | `hsl(40 20% 97%)` | `hsl(25 15% 10%)` | Text on primary |
| `--highlight` | `hsl(28 55% 42%)` (Bronze) | `hsl(32 48% 58%)` | Active nav, high-signal scores, kickers |
| `--highlight-foreground` | `hsl(40 30% 97%)` | `hsl(25 15% 10%)` | Text on highlight |
| `--secondary` | `hsl(36 16% 93%)` | `hsl(25 8% 14%)` | Secondary buttons |
| `--muted` | `hsl(36 14% 93%)` | `hsl(25 8% 14%)` | Subtle fills |
| `--muted-foreground` | `hsl(28 10% 42%)` | `hsl(30 8% 62%)` | Labels, descriptions |
| `--accent` | `hsl(36 20% 92%)` | `hsl(25 10% 14%)` | Hover wash (not a brand color) |
| `--destructive` | `hsl(8 55% 42%)` | `hsl(8 45% 48%)` | Errors, deletes |

### Surface & Border

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--background` | `hsl(40 18% 97%)` (Limestone) | `hsl(25 10% 7%)` (Warm charcoal) | Page background |
| `--foreground` | `hsl(25 18% 12%)` (Espresso) | `hsl(40 18% 94%)` | Default text |
| `--card` | `hsl(40 25% 99%)` | `hsl(25 10% 10%)` | Cards (slightly lifted from page) |
| `--border` | `hsl(36 12% 86%)` | `hsl(25 8% 18%)` | Hairline borders |
| `--ring` | `hsl(28 45% 38%)` | `hsl(32 40% 55%)` | Focus ring (bronze) |

### Status Colors

Desaturated sage / amber / slate so they sit on stone.

| Token | Meaning | Classes |
|-------|---------|---------|
| `--success` | Complete, sent, verified | `text-success`, `bg-success-muted`, `border-success-border` |
| `--warning` | Caution, incomplete profile | `text-warning`, `bg-warning-muted` |
| `--info` | Draft, informational | `text-info`, `bg-info-muted` |
| `--neutral` | Low / archived | `text-neutral`, `bg-neutral-muted` |

High-relevance scores use **highlight (bronze)**, not success. See `src/lib/relevance-styles.ts`.

### Chart Colors

| Token | Intended use |
|-------|----------------|
| `--chart-1` | Ink |
| `--chart-2` | Bronze |
| `--chart-3` | Sage |
| `--chart-4` | Stone |
| `--chart-5` | Muted red |

---

## Typography

| Role | Face | Utility |
|------|------|---------|
| Display | Newsreader | `font-display` — `h1`, landing hero, brand “FormD”, empty-state titles |
| UI | Source Sans 3 | `font-sans` — body, nav, forms, tables |
| Data | IBM Plex Mono | `font-mono` — amounts, scores, accession numbers, kickers |

Kickers: `font-mono text-[11px] font-medium tracking-[0.22em] uppercase text-highlight`

Page titles: `PageHeader` in `src/components/page-header.tsx` (mono kicker + Newsreader `h1` + muted description).

---

## Border Radius

`--radius: 0.5rem` (8px).

| Token | Usage |
|-------|-------|
| `--radius-sm` / `rounded-sm` | Tight chips |
| `--radius-md` / `rounded-md` | Buttons, inputs, badges |
| `--radius-lg` / `rounded-lg` | Cards |
| `--radius-xl` / `rounded-xl` | Marketing frames |

Never hardcode `rounded-[…]` for the system radius.

---

## Component Patterns

### Brand mark

`src/components/brand-mark.tsx` — bronze “D”, italic Newsreader “FormD”, tracked sans “Scout”. Use `inverted` on the dark auth panel.

### Card

Hairline border, soft shadow, no top accent bar.

```
rounded-lg border border-border bg-card text-card-foreground shadow-[0_1px_2px_hsl(25_18%_12%/0.06)]
```

- Padding: `p-6` on header / content / footer
- Lift on hover: add `card-lift` (dashboard/marketing only)
- High-signal stats: add `signal-card` (2px left bronze bar)

### Button

Ink fill (`bg-primary`) in light mode; ivory fill in dark. Sizes: default `h-9`, sm `h-8`, lg `h-10`.

### Badge

`rounded-md`. Relevance high = bronze (`getRelevanceBadgeClass`).

---

## Motion

CSS only. No animation library.

- `page-enter` on `main` — short fade + 6px rise
- `card-lift` — 1px translate + shadow on hover
- Header: `bg-background/80` + `backdrop-blur-md`

---

## Usage Rules

### Always Use Tokens

```tsx
// CORRECT
<div className="bg-background text-foreground border-border" />
<span className="text-highlight" />

// INCORRECT
<div className="bg-white text-gray-900" />
```

### Charts

```tsx
<Bar fill="var(--highlight)" />
<CartesianGrid className="stroke-muted" />
```

### Status / relevance

```tsx
import { getRelevanceColor, getRelevanceBadgeClass } from "@/lib/relevance-styles";

<span className={getRelevanceColor(score)}>{score}</span>
<span className={`border ${getRelevanceBadgeClass(score)}`}>High</span>
```

### Dark Mode

Prefer token classes. Dark identity is warm charcoal, ivory primary, brighter bronze highlight.

---

## File Reference

| File | Purpose |
|------|---------|
| `src/app/globals.css` | Color, radius, font, motion tokens |
| `src/app/layout.tsx` | Newsreader, Source Sans 3, IBM Plex Mono |
| `src/components/brand-mark.tsx` | Wordmark |
| `src/components/page-header.tsx` | Dashboard page titles |
| `src/components/ui/` | shadcn primitives |
| `src/lib/relevance-styles.ts` | Relevance / outreach status classes |
