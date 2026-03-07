---
feature_name: code-quality-fixes
total_phases: 1
---

# Implementation Plan: Code Quality Fixes

## Phase 1: Fix Code Quality Issues ✅

**Goal:** Resolve all 3 code quality issues identified in code review

### Task 1.1: Fix setState in useEffect (user-profile.tsx) ✅

**File:** `src/components/auth/user-profile.tsx`

**Issue:** Line 25 calls `setMounted(true)` synchronously in useEffect body - anti-pattern that causes cascading renders.

**Solution:** Use `useSyncExternalStore` or move initialization to component body.

**Implementation:**

```typescript
// Option A: Use useSyncExternalStore (recommended)
import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

// In component:
const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
```

**Or Option B (simpler):**

```typescript
// Initialize with a check for window existence
const [mounted, setMounted] = useState(false);

useEffect(() => {
  // Defer to next tick to avoid sync setState warning
  const timer = setTimeout(() => setMounted(true), 0);
  return () => clearTimeout(timer);
}, []);
```

**Acceptance Criteria:**

- [ ] ESLint error "setState in useEffect" is resolved
- [ ] Component still hydrates correctly on client-side
- [ ] No flicker or layout shift on initial render
- [ ] TypeScript compilation passes

---

### Task 1.2: Add Missing useEffect Dependencies (filings/[id]/page.tsx) ✅

**File:** `src/app/dashboard/filings/[id]/page.tsx`

**Issue:** Line 183 - useEffect uses `fetchFiling` and `fetchResearch` but doesn't include them in dependency array.

**Solution:** Wrap fetch functions in `useCallback` and add to deps, or suppress warning if intentional.

**Implementation:**

```typescript
const fetchFiling = useCallback(async () => {
  setIsLoading(true);
  setError(null);
  try {
    const response = await fetch(`/api/edgar/filings/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        setError("Filing not found");
      } else if (response.status === 401) {
        setError("Unauthorized - please log in");
      } else {
        setError("Failed to load filing");
      }
      return;
    }
    const data = await response.json();
    setFiling(data.filing);
  } catch (err) {
    console.error("Error fetching filing:", err);
    setError("Failed to load filing");
  } finally {
    setIsLoading(false);
  }
}, [id]); // id is the only dependency

const fetchResearch = useCallback(async () => {
  try {
    const response = await fetch(`/api/edgar/filings/${id}/research`);
    if (response.ok) {
      const data = await response.json();
      setResearch(data.research);
    }
  } catch (err) {
    console.error("Error fetching research:", err);
  }
}, [id]); // id is the only dependency

useEffect(() => {
  fetchFiling();
  fetchResearch();
}, [id, fetchFiling, fetchResearch]); // Now properly includes all dependencies
```

**Acceptance Criteria:**

- [ ] ESLint warning about missing dependencies is resolved
- [ ] No infinite render loops
- [ ] Filing and research data still loads correctly
- [ ] No stale closure bugs
- [ ] TypeScript compilation passes

---

### Task 1.3: Sync emailTone State to Profile (settings/page.tsx) ✅

**File:** `src/app/dashboard/settings/page.tsx`

**Issue:** Line 650 - `emailTone` Select updates local state but not `profile.emailTone`, causing data loss on save.

**Current Code:**

```typescript
<Select value={emailTone} onValueChange={setEmailTone}>
```

**Solution:** Update both `emailTone` state AND `profile.emailTone` when user changes the Select.

**Implementation:**

```typescript
<Select
  value={emailTone}
  onValueChange={(value) => {
    setEmailTone(value);
    setProfile(prev => ({ ...prev, emailTone: value }));
  }}
>
```

**Alternative (remove duplicate state):**

```typescript
// Remove the separate emailTone state entirely
// Use profile.emailTone directly

// In the component:
const [profile, setProfile] = useState<TeamProfile>(defaultProfile);

// Initialize from fetched profile:
useEffect(() => {
  // ... fetch profile
  if (data.profile) {
    setProfile(data.profile);
  }
}, []);

// In the Select:
<Select
  value={profile.emailTone || "professional"}
  onValueChange={(value) => {
    setProfile(prev => ({ ...prev, emailTone: value }));
  }}
>
```

**Acceptance Criteria:**

- [ ] User can select a tone and it persists correctly
- [ ] Saving settings sends the correct emailTone value to API
- [ ] Tone selection is preserved on page reload
- [ ] No duplicate state management
- [ ] TypeScript compilation passes

---

## Final Verification

After all tasks are complete:

1. **Run linting:**

   ```bash
   npm run lint
   ```

   Expected: 0 errors, 0 warnings related to these fixes

2. **Run type checking:**

   ```bash
   npm run typecheck
   ```

   Expected: No type errors

3. **Run production build:**

   ```bash
   npm run build
   ```

   Expected: Build succeeds

4. **Manual testing:**
   - [ ] User profile loads without errors
   - [ ] Filing detail page loads correctly
   - [ ] Settings page saves email tone correctly

## Notes

- These are bug fixes only - no new features
- Maintain existing code style and patterns
- Do not refactor beyond what's needed to fix the issues
- Test each fix independently before moving to the next
