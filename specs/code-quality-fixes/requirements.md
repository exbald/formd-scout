---
feature_name: code-quality-fixes
created: 2026-03-07
status: pending
---

# Code Quality Fixes

## Overview

Fix 3 code quality issues identified during code review of the Lead Intelligence Platform (Phases 1-5).

## Issues to Fix

### 1. setState in useEffect (ERROR)

**File:** `src/components/auth/user-profile.tsx:25`  
**Severity:** ERROR  
**Issue:** Calling `setMounted(true)` synchronously inside useEffect body triggers cascading renders and violates React best practices.

**Current Code:**

```typescript
useEffect(() => {
  setMounted(true);
}, []);
```

**Impact:** Anti-pattern that can hurt performance and is flagged by ESLint.

### 2. useEffect Missing Dependencies (WARNING)

**File:** `src/app/dashboard/filings/[id]/page.tsx:183`  
**Severity:** WARNING  
**Issue:** useEffect uses `fetchFiling` and `fetchResearch` functions but doesn't include them in dependency array, risking stale closures.

**Current Code:**

```typescript
useEffect(() => {
  fetchFiling();
  fetchResearch();
}, [id]); // Missing fetchFiling, fetchResearch
```

**Impact:** Potential stale closure bugs where functions reference outdated values.

### 3. emailTone State Not Synced (BUG)

**File:** `src/app/dashboard/settings/page.tsx:650`  
**Severity:** BUG  
**Issue:** The `emailTone` Select component only updates local state, not the `profile` object. When user saves, stale value is sent to API.

**Current Code:**

```typescript
<Select value={emailTone} onValueChange={setEmailTone}>
```

**Impact:** Data loss - user's tone preference is not saved to the database.

## Success Criteria

- [ ] All ESLint errors and warnings are resolved
- [ ] No functional behavior changes (fixes only)
- [ ] TypeScript compilation passes
- [ ] Production build succeeds
- [ ] No regressions in existing functionality

## Related

- Code review performed on: 2026-03-07
- Feature: Lead Intelligence Platform (Phases 1-5)
