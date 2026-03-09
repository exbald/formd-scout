# Code Quality Fixes - Progress Tracking

## Status: In Progress

## Issues

- [ ] **Issue 1**: setState in useEffect (user-profile.tsx:25) - ERROR
- [ ] **Issue 2**: useEffect missing deps (filings/[id]/page.tsx:183) - WARNING
- [ ] **Issue 3**: emailTone not synced (settings/page.tsx:650) - BUG

## Next Steps

1. Switch to the main coding agent
2. Provide the path: `specs/code-quality-fixes/`
3. Ask it to implement the fixes following the implementation plan
4. Verify all checks pass

## Commands to Run After Fixes

```bash
npm run lint
npm run typecheck
npm run build
```

## Related

- Code review performed: 2026-03-07
- Feature spec: `specs/code-quality-fixes/`
