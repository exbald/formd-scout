# Requirements: Centralize Design Tokens & Eliminate Hardcoded Colors

## Summary

The app has a CSS custom property design token system in `globals.css` for core UI colors (primary, secondary, muted, destructive, etc.), but lacks semantic tokens for **status states** (success, warning, info, neutral). This causes hardcoded Tailwind color classes scattered across ~8 files with duplication and inconsistencies.

## Problem

- Relevance score color logic is duplicated in 3 dashboard files with slight differences
- `text-yellow-600` (dashboard) vs `text-amber-600` (filing detail) for the same "medium relevance" concept
- Every hardcoded color requires manual `dark:` prefix variants
- Changing "what green means" requires hunting through 8+ files
- Marketing pages use hardcoded green/red classes that don't participate in the token system

## Goal

Every color in the app should flow from centralized CSS custom properties in `globals.css`. Status/state colors (success, warning, info, neutral) should have dedicated tokens. Relevance score styling should be defined once and imported everywhere.

## Acceptance Criteria

1. New semantic CSS tokens exist for success, warning, info, and neutral states (with foreground, muted, and border variants)
2. All relevance score color logic is defined in a single utility file and imported by consumer pages
3. No hardcoded Tailwind color classes (e.g., `text-green-600`, `bg-amber-100`) remain in any dashboard or marketing page
4. The yellow vs amber inconsistency for medium relevance is resolved (standardized to amber/warning)
5. Dark mode works automatically via CSS variables -- no `dark:` prefixes needed for status colors
6. Visual appearance is preserved (green = success/high, amber = warning/medium, gray = neutral/low, blue = info, red = error)
7. The existing `--destructive` token is reused for error states (no redundant `--error` token)

## Scope

### In Scope
- Adding CSS custom properties to `globals.css`
- Creating a centralized relevance/status styling utility
- Updating all files that use hardcoded status colors (~10 files)

### Out of Scope
- Changing the actual color values or visual design
- Modifying shadcn/ui base component styles
- Adding new UI components
- Changing the manifest.ts hex colors (required for PWA metadata)
