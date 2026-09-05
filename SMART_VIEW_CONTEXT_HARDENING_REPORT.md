# Smart View Context Hardening Report

## Objective

Make Smart View explicitly context-aware by adding `crm_context` filtering to disposition queries.

## Root Cause

`useSmartView.ts` was fetching ALL active dispositions without any `crm_context` filtering, relying entirely on RLS for security. This violated the principle of explicit context filtering on the frontend.

## Changes Made

### `src/hooks/useSmartView.ts`

1. **Modified `loadDispositionConfig`**:
   - Changed signature from `async ()` to `async (crmContext?: string)`
   - Added undefined guard: if `crmContext === undefined`, returns empty arrays immediately
   - Added `.eq('crm_context', crmContext)` to both `disposition_categories` and `dispositions` queries

2. **Modified `useEffect` that calls `loadConfig`**:
   - Added CRM context derivation: `user?.organizations?.find(o => o.id === user.activeOrganizationId)?.crm_context ?? undefined`
   - Passes derived context to `loadDispositionConfig(crmContext)`
   - Added `user?.organizations` and `user?.activeOrganizationId` to dependency array

## Test Results

| Test | Result |
|------|--------|
| SMART VIEW EXPLICIT CONTEXT | PASS |
| ACADEMIC ISOLATION | PASS |
| B2B ISOLATION | PASS |
| UNDEFINED CONTEXT SAFE | PASS |
| BUILD | PASS |

## Behavior

- **Academic user**: Only academic disposition IDs used for Smart View filtering
- **B2B user**: Only B2B disposition IDs used for Smart View filtering
- **Undefined context**: No global disposition fetch, empty arrays returned
- **Cross-context**: Impossible due to explicit `crm_context` filter + RLS

## Architecture

```
User (activeOrganizationId)
  -> organizations.find(id).crm_context
    -> loadDispositionConfig(crmContext)
      -> disposition_categories.filter(crm_context = crmContext)
      -> dispositions.filter(crm_context = crmContext)
        -> notConnectedDispositionIds (academic OR b2b only)
        -> connectedDispositionIds (academic OR b2b only)
        -> interestedDispositionIds (academic OR b2b only)
```

## Preserved Functionality

- Smart View counters remain dynamically derived from database configuration
- Adding/removing/renaming dispositions does not require hardcoded frontend arrays
- Realtime subscription continues functioning (re-fetches on lead/disposition changes)
- All existing Smart View stages continue functioning
