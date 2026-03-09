# FormD Scout Design System

A sharp, enterprise-grade design system built on CSS custom properties, Tailwind CSS v4, and shadcn/ui. Designed for professional financial data interfaces.

## Design Principles

- **Enterprise minimalism** -- Clean, formal, data-dense layouts
- **Sharp corners** -- `0.15rem` border radius throughout (no soft rounded UI)
- **Token-driven** -- Every color flows from CSS custom properties in `globals.css`
- **Dark mode native** -- All tokens have light/dark variants; no manual `dark:` prefixes needed for token-based classes
- **Top-border accent** -- Cards use a 3px primary-colored top border as the signature visual element

---

## Color Tokens

All colors are defined as `hsl()` values in `src/app/globals.css` using CSS custom properties. Tailwind v4 auto-generates utility classes from the `@theme inline` block. Values **must** be wrapped in `hsl()` (e.g. `hsl(220 80% 25%)`) -- bare HSL triplets like `220 80% 25%` are not valid CSS colors and will be silently ignored by browsers.

### Core Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--primary` | `hsl(220 80% 25%)` (Deep Corporate Blue) | `hsl(210 60% 60%)` | Buttons, links, active states, card top borders |
| `--primary-foreground` | `hsl(0 0% 98%)` | `hsl(0 0% 100%)` | Text on primary backgrounds |
| `--secondary` | `hsl(240 4.8% 95.9%)` | `hsl(240 3.7% 15.9%)` | Secondary buttons, subtle backgrounds |
| `--secondary-foreground` | `hsl(240 5.9% 10%)` | `hsl(0 0% 98%)` | Text on secondary backgrounds |
| `--muted` | `hsl(240 4.8% 95.9%)` | `hsl(240 3.7% 15.9%)` | Disabled states, subtle section backgrounds |
| `--muted-foreground` | `hsl(240 3.8% 46.1%)` | `hsl(240 5% 64.9%)` | Secondary text, labels, descriptions |
| `--accent` | `hsl(214 70% 95%)` (Subtle blue tint) | `hsl(215 40% 16%)` | Hover backgrounds |
| `--accent-foreground` | `hsl(220 80% 20%)` | `hsl(210 60% 90%)` | Text on accent backgrounds |
| `--destructive` | `hsl(0 84.2% 60.2%)` | `hsl(0 62.8% 30.6%)` | Error states, delete buttons, danger actions |
| `--destructive-foreground` | `hsl(0 0% 98%)` | `hsl(0 0% 98%)` | Text on destructive backgrounds |

### Surface & Border

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--background` | `hsl(0 0% 100%)` (White) | `hsl(240 10% 3.9%)` (Near-black) | Page background |
| `--foreground` | `hsl(240 10% 3.9%)` | `hsl(0 0% 98%)` | Default text color |
| `--card` | `hsl(0 0% 100%)` | `hsl(240 10% 5.5%)` | Card backgrounds |
| `--card-foreground` | `hsl(240 10% 3.9%)` | `hsl(0 0% 98%)` | Card text |
| `--popover` | `hsl(0 0% 100%)` | `hsl(240 10% 5.5%)` | Dropdown/popover backgrounds |
| `--border` | `hsl(240 5.9% 90%)` | `hsl(240 4% 22%)` | Borders, dividers |
| `--input` | `hsl(240 5.9% 90%)` | `hsl(240 4% 22%)` | Form input borders |
| `--ring` | `hsl(220 80% 25%)` | `hsl(210 60% 60%)` | Focus ring color |

### Status Colors (Planned -- see `specs/centralize-design-tokens/`)

These tokens will be added to replace hardcoded Tailwind color classes:

| Token | Semantic Meaning | Tailwind Classes Generated |
|-------|-----------------|---------------------------|
| `--success` / `-foreground` / `-muted` / `-border` | High relevance, sent, verified, complete | `text-success`, `bg-success-muted`, `border-success-border` |
| `--warning` / `-foreground` / `-muted` / `-border` | Medium relevance, caution | `text-warning`, `bg-warning-muted`, `border-warning-border` |
| `--info` / `-foreground` / `-muted` / `-border` | Draft, informational | `text-info`, `bg-info-muted`, `border-info-border` |
| `--neutral` / `-foreground` / `-muted` / `-border` | Low relevance, archived, inactive | `text-neutral`, `bg-neutral-muted`, `border-neutral-border` |

### Chart Colors

Used by recharts for data visualizations. Reference with `var(--chart-N)` (values already include `hsl()`).

| Token | Light Mode | Dark Mode | Intended Use |
|-------|-----------|-----------|-------------|
| `--chart-1` | `hsl(220 80% 30%)` (Navy blue) | `hsl(220 70% 60%)` | Primary data series |
| `--chart-2` | `hsl(180 60% 35%)` (Cyan/teal) | `hsl(180 50% 60%)` | Secondary data series |
| `--chart-3` | `hsl(140 50% 40%)` (Green) | `hsl(140 40% 60%)` | Tertiary data series |
| `--chart-4` | `hsl(40 70% 50%)` (Gold) | `hsl(40 60% 60%)` | Fourth data series |
| `--chart-5` | `hsl(0 60% 50%)` (Red) | `hsl(0 50% 60%)` | Fifth data series |

### Sidebar Colors

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--sidebar` | `hsl(0 0% 98%)` | `hsl(240 10% 3.9%)` |
| `--sidebar-foreground` | `hsl(240 5.3% 26.1%)` | `hsl(240 4.8% 95.9%)` |
| `--sidebar-primary` | `hsl(240 5.9% 10%)` | `hsl(224.3 76.3% 48%)` |
| `--sidebar-border` | `hsl(220 13% 91%)` | `hsl(240 3.7% 15.9%)` |

---

## Typography

| Property | Value |
|----------|-------|
| Font family (sans) | Inter |
| Font family (mono) | Roboto Mono |
| Font features | `cv02`, `cv03`, `cv04`, `cv11` (alternate glyphs for professional data display) |

Use Tailwind's default type scale. No custom font sizes are defined.

---

## Border Radius

The system uses a sharp, minimal radius for an enterprise aesthetic.

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `0.15rem` (2.4px) | Base radius |
| `--radius-sm` | `calc(var(--radius) - 2px)` | Small elements |
| `--radius-md` | `calc(var(--radius) - 1px)` | Medium elements |
| `--radius-lg` | `var(--radius)` | Large elements |
| `--radius-xl` | `calc(var(--radius) + 2px)` | Extra large elements |

Components use `rounded-[0.15rem]` directly in their class definitions to maintain the sharp look.

---

## Component Patterns

All components are shadcn/ui-based, stored in `src/components/ui/`. They consume design tokens exclusively.

### Card

Signature element of the design system. Features a **3px primary-colored top border**.

```
rounded-[0.15rem] border border-border border-t-[3px] border-t-primary bg-card text-card-foreground shadow-sm
```

- Padding: `p-5` for header, content, and footer
- Description text: `text-sm text-muted-foreground`

### Button

| Variant | Classes |
|---------|---------|
| `default` | `bg-primary text-primary-foreground shadow hover:bg-primary/90` |
| `destructive` | `bg-destructive text-white shadow-xs hover:bg-destructive/90` |
| `outline` | `border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground` |
| `secondary` | `bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80` |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` |
| `link` | `text-primary underline-offset-4 hover:underline` |

Sizes: `default` (h-9), `sm` (h-8), `lg` (h-10), `icon` (size-9)

### Badge

| Variant | Classes |
|---------|---------|
| `default` | `bg-primary text-primary-foreground` |
| `secondary` | `bg-secondary text-secondary-foreground` |
| `destructive` | `bg-destructive text-destructive-foreground` |
| `outline` | `text-foreground` (border only) |

### Collapsible Card

Enterprise-style card with expand/collapse. Uses `collapsible-card.tsx`.

---

## Usage Rules

### Always Use Tokens

```tsx
// CORRECT - uses design tokens
<div className="bg-background text-foreground border-border" />
<span className="text-muted-foreground" />
<Button variant="default" />

// INCORRECT - hardcoded Tailwind colors
<div className="bg-white text-gray-900 border-gray-200" />
<span className="text-gray-500" />
```

### Charts (recharts)

Always reference CSS variables for chart colors:

```tsx
// CORRECT -- variables already contain hsl(), use var() directly
<Bar fill="var(--primary)" />
<CartesianGrid className="stroke-muted" />
<XAxis className="text-muted-foreground" />

// For tooltips (inline styles)
contentStyle={{
  backgroundColor: "var(--card)",
  borderColor: "var(--border)",
}}
```

### Status/State Colors (after token implementation)

Use the centralized utility from `src/lib/relevance-styles.ts`:

```tsx
import { getRelevanceColor, getRelevanceBadgeClass } from "@/lib/relevance-styles";

// Text color for scores
<span className={getRelevanceColor(score)}>{score}</span>

// Badge styling
<span className={`border ${getRelevanceBadgeClass(score)}`}>High</span>
```

### Interactive States

```
hover:bg-muted/50     -- subtle hover for nav items, list rows
hover:bg-accent       -- stronger hover for buttons
hover:text-foreground  -- text hover from muted state
bg-primary/10         -- light accent background for selected states
```

### Dark Mode

Dark mode is handled at the CSS variable level. When using token classes (`text-primary`, `bg-muted`, etc.), dark mode works automatically. Only use `dark:` prefix when you have a genuine reason for a different class in dark mode (rare).

---

## File Reference

| File | Purpose |
|------|---------|
| `src/app/globals.css` | All CSS custom properties (single source of truth for colors) |
| `src/components/ui/` | shadcn/ui component library (24 components) |
| `src/lib/relevance-styles.ts` | Centralized relevance/status styling utilities (planned) |
| `src/lib/utils.ts` | `cn()` helper for merging Tailwind classes |
