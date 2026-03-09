# Implementation Plan: Centralize Design Tokens & Eliminate Hardcoded Colors

## Overview

Add semantic status color tokens (success, warning, info, neutral) to the existing CSS variable system, create a centralized utility for relevance/status styling, and replace all hardcoded Tailwind color classes across ~10 files.

## Phase 1: Add Semantic Status Tokens

Add CSS custom properties for status states to `globals.css`, following the existing HSL pattern.

### Tasks

- [ ] Add success/warning/info/neutral CSS custom properties to `:root` block in `globals.css`
- [ ] Add corresponding dark mode values to `.dark` block in `globals.css`
- [ ] Register all new tokens in the `@theme inline` block so Tailwind v4 auto-generates utility classes

### Technical Details

**File:** `src/app/globals.css`

Each status color needs 4 variants: base, foreground, muted, border.

**Light mode (`:root`) values:**
```css
/* Status Colors */
--success: 142 71% 45%;
--success-foreground: 142 76% 22%;
--success-muted: 142 76% 95%;
--success-border: 142 50% 82%;

--warning: 38 92% 50%;
--warning-foreground: 32 95% 30%;
--warning-muted: 48 96% 94%;
--warning-border: 48 70% 80%;

--info: 217 91% 60%;
--info-foreground: 221 83% 30%;
--info-muted: 214 95% 94%;
--info-border: 214 70% 82%;

--neutral: 220 9% 46%;
--neutral-foreground: 220 9% 36%;
--neutral-muted: 220 14% 96%;
--neutral-border: 220 13% 85%;
```

**Dark mode (`.dark`) values:**
```css
--success: 142 60% 55%;
--success-foreground: 142 60% 55%;
--success-muted: 142 30% 12%;
--success-border: 142 30% 25%;

--warning: 38 70% 55%;
--warning-foreground: 38 70% 55%;
--warning-muted: 38 30% 12%;
--warning-border: 38 30% 25%;

--info: 217 70% 60%;
--info-foreground: 217 70% 60%;
--info-muted: 217 30% 12%;
--info-border: 217 30% 25%;

--neutral: 220 10% 55%;
--neutral-foreground: 220 10% 55%;
--neutral-muted: 220 5% 15%;
--neutral-border: 220 5% 25%;
```

**`@theme inline` registrations (add after existing `--color-sidebar-ring`):**
```css
--color-success: var(--success);
--color-success-foreground: var(--success-foreground);
--color-success-muted: var(--success-muted);
--color-success-border: var(--success-border);
--color-warning: var(--warning);
--color-warning-foreground: var(--warning-foreground);
--color-warning-muted: var(--warning-muted);
--color-warning-border: var(--warning-border);
--color-info: var(--info);
--color-info-foreground: var(--info-foreground);
--color-info-muted: var(--info-muted);
--color-info-border: var(--info-border);
--color-neutral: var(--neutral);
--color-neutral-foreground: var(--neutral-foreground);
--color-neutral-muted: var(--neutral-muted);
--color-neutral-border: var(--neutral-border);
```

This automatically creates Tailwind classes: `text-success`, `bg-success-muted`, `border-warning-border`, etc.

## Phase 2: Create Centralized Styling Utilities

Create a single utility file for all relevance score and status badge styling.

### Tasks

- [ ] Create `src/lib/relevance-styles.ts` with relevance score and status badge utilities

### Technical Details

**New file:** `src/lib/relevance-styles.ts`

```typescript
export type RelevanceLevel = "high" | "medium" | "low" | "unknown";

export function getRelevanceLevel(score: number | null): RelevanceLevel {
  if (score === null) return "unknown";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function getRelevanceColor(score: number | null): string {
  const level = getRelevanceLevel(score);
  switch (level) {
    case "high":    return "text-success";
    case "medium":  return "text-warning";
    case "low":     return "text-neutral-foreground";
    case "unknown": return "text-muted-foreground";
  }
}

export function getRelevanceBadgeClass(score: number | null): string {
  const level = getRelevanceLevel(score);
  switch (level) {
    case "high":
      return "bg-success-muted text-success-foreground border-success-border";
    case "medium":
      return "bg-warning-muted text-warning-foreground border-warning-border";
    case "low":
    case "unknown":
      return "bg-neutral-muted text-neutral-foreground border-neutral-border";
  }
}

export function getRelevanceBadgeVariant(
  score: number | null
): "default" | "secondary" | "outline" {
  if (score === null) return "outline";
  if (score >= 70) return "default";
  if (score >= 40) return "secondary";
  return "outline";
}

export function getStatusBadgeClass(status: string | null): string {
  switch (status) {
    case "sent":
      return "bg-success-muted text-success-foreground border-success-border";
    case "archived":
      return "bg-neutral-muted text-neutral-foreground border-neutral-border";
    default:
      return "bg-info-muted text-info-foreground border-info-border";
  }
}
```

## Phase 3: Update Dashboard Pages

Replace local inline color logic with imports from the centralized utility.

### Tasks

- [ ] Update `src/app/dashboard/page.tsx` -- delete local `getRelevanceBadgeVariant` and `getRelevanceColor`, import from `@/lib/relevance-styles`
- [ ] Update `src/app/dashboard/filings/page.tsx` -- delete local badge class logic, import `getRelevanceBadgeClass`
- [ ] Update `src/app/dashboard/filings/[id]/page.tsx` -- delete local `getRelevanceColor` and badge class logic, import both
- [ ] Update `src/app/dashboard/outreach/page.tsx` -- delete local status badge logic, import `getStatusBadgeClass`

### Technical Details

Each file needs:
1. Add `import { ... } from "@/lib/relevance-styles"` at top
2. Delete the local function definitions (they have identical signatures to the shared versions)
3. No other changes -- the JSX consuming these functions stays the same

**Key lines to find and replace:**
- `dashboard/page.tsx` ~lines 95-109: local `getRelevanceBadgeVariant` and `getRelevanceColor`
- `filings/page.tsx` ~lines 168-176: local `getRelevanceBadgeClass` with hardcoded green/amber/gray classes
- `filings/[id]/page.tsx` ~lines 113-127: local `getRelevanceColor` and `getRelevanceBadgeClass`
- `outreach/page.tsx` ~lines 201-210: local status badge class function

## Phase 4: Update Marketing Pages & Components

Replace remaining hardcoded Tailwind color classes with token-based classes.

### Tasks

- [ ] Update `src/app/(marketing)/profile/page.tsx` -- replace `text-green-600`, `border-green-600`, `bg-green-500` with token classes
- [ ] Update `src/app/(marketing)/chat/page.tsx` -- replace `text-green-500` with `text-success`
- [ ] Update `src/app/(marketing)/(auth)/login/page.tsx` -- replace `text-green-600 dark:text-green-400` with `text-success`
- [ ] Update `src/components/setup-checklist.tsx` -- replace `text-green-600` with `text-success`, `text-red-600` with `text-destructive`

### Technical Details

**Replacements by file:**

`profile/page.tsx`:
- `text-green-600 dark:text-green-400` -> `text-success`
- `border-green-600 dark:border-green-400` -> `border-success`
- `bg-green-500` -> `bg-success`

`chat/page.tsx`:
- `text-green-500` -> `text-success`

`login/page.tsx`:
- `text-green-600 dark:text-green-400` -> `text-success`

`setup-checklist.tsx`:
- `text-green-600 dark:text-green-400` -> `text-success`
- `text-red-600 dark:text-red-400` -> `text-destructive`

## Phase 5: Verification

Confirm all changes are correct and visual appearance is preserved.

### Tasks

- [ ] Run `npx tsc --noEmit` to confirm no type errors
- [ ] Visual check: filings list page relevance badges (green/amber/gray)
- [ ] Visual check: filing detail page score colors match list page (amber for medium, not yellow)
- [ ] Visual check: outreach page status badges (sent/draft/archived)
- [ ] Visual check: dark mode toggle -- all status colors adapt automatically
- [ ] Visual check: marketing profile page verified/active badges
- [ ] Visual check: setup checklist green check / red X icons
