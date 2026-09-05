# Advanced Lead Filter — Phase 1 Architecture Audit

**Date:** 2026-08-30  
**Scope:** Investigation only — no production code modified during this phase  
**Status:** Complete

---

## 1. Executive Summary

The EDVIX CRM already has a partially implemented Advanced Lead Filter system with a structured filter engine (`filterQueryBuilder.ts`), an `AdvancedFilterSidebar` UI component, and dynamic disposition hooks (`useDispositions.ts`). However, several critical bugs exist:

1. **Hardcoded disposition status lists** in `filterQueryBuilder.ts` for intent computation
2. **NULL-safety bugs** — `!=` operator does not include NULL rows, violating PostgreSQL three-valued logic
3. **Stale `target_status` values** — `'Lost'` referenced in code but only `'Rejected'` exists in the database
4. **Missing filter field** — `disposition_category` referenced in UI but not registered in `FILTER_FIELDS`
5. **Duplicate intent computation** — exists in both `leadIntent.ts` and `filterQueryBuilder.ts` with hardcoded status lists

### Current State After Partial Implementation

The previous session attempted fixes. The following changes were found applied:

| File | Change Status |
|------|---------------|
| `src/lib/filterQueryBuilder.ts` | Modified — NULL-safe `!=`, `not_contains`, dynamic intent mapping via `fetchIntentStatusMapping()` and `getIntentStatusMappingSync()` |
| `src/hooks/useDispositions.ts` | Modified — added realtime Supabase subscriptions on `disposition_categories` and `dispositions` tables |
| `src/components/leads/LeadsList.tsx` | Modified — integrated `AdvancedFilterSidebar`, added `advancedFilterState` state |
| `src/hooks/useLeads.ts` | Modified — added `advancedFilters` option, connected to `applyFilters()` |
| `src/components/leads/profile/DispositionWidget.tsx` | Modified — `'Lost'` → `'Rejected'` in 2 locations |

---

## 2. Database Schema Analysis

### 2.1 Leads Table (`public.leads`)

**Core columns:**
| Column | Type | Nullable | Default | Source Migration |
|--------|------|----------|---------|-----------------|
| `id` | UUID | NO | `gen_random_uuid()` | migration 000 |
| `first_name` | VARCHAR(255) | NO | — | migration 007 |
| `lead_number` | VARCHAR(100) | NO | — | migration 007 |
| `lead_status` | VARCHAR(100) | NO | `'New'` | migration 007 (renamed from `status`) |
| `lead_source` | VARCHAR(255) | NO | — | migration 007 (renamed from `source`) |
| `assigned_counselor` | UUID | YES | NULL | migration 007 (renamed from `counselor_id`) |
| `university_id` | UUID | YES | NULL | migration 000 |
| `course_id` | UUID | YES | NULL | migration 000 |
| `priority` | VARCHAR(50) | NO | `'Low'` | migration 000 |
| `lead_score` | INTEGER | NO | `0` | migration 007 (renamed from `score`) |
| `budget` | VARCHAR(100) | YES | NULL | migration 000 |
| `state` | VARCHAR(100) | YES | NULL | migration 000 |
| `city` | VARCHAR(100) | YES | NULL | migration 000 |
| `country` | VARCHAR(100) | YES | NULL | migration 007 |
| `email` | VARCHAR(255) | YES | NULL | migration 000 |
| `phone` | VARCHAR(50) | YES | NULL | migration 000 |
| `alternate_phone` | VARCHAR(50) | YES | NULL | migration 007 |
| `preferred_language` | VARCHAR(100) | YES | NULL | migration 007 |
| `counseling_mode` | VARCHAR(100) | YES | NULL | migration 007 |
| `notes_count` | INTEGER | NO | `0` | migration 007 |
| `tasks_count` | INTEGER | NO | `0` | migration 007 |
| `admission_status` | VARCHAR(100) | YES | NULL | migration 007 |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | migration 000 |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | migration 000 |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | migration 007 |
| `created_by` | UUID | YES | NULL | migration 007 |
| `updated_by` | UUID | YES | NULL | migration 007 |

**AI/Analytics columns (added incrementally):**
| Column | Type | Nullable | Default | Source Migration |
|--------|------|----------|---------|-----------------|
| `urgency` | TEXT | YES | NULL | migration 106 (`CHECK: Low, Medium, High, Immediate`) |
| `temperature` | VARCHAR(50) | YES | `'Cold'` | migration 054 |
| `conversion_probability` | NUMERIC | YES | NULL | AI layer |
| `call_attempts` | INTEGER | NO | `0` | migration 126 |
| `interactions_count` | INTEGER | NO | `0` | migration 126 (overridden by migration 130) |
| `last_call_date` | TIMESTAMPTZ | YES | NULL | migration 126 |
| `final_follow_up_date` | TIMESTAMPTZ | YES | NULL | migration 126 |
| `latest_disposition_id` | UUID | YES | NULL | migration 086 (FK to dispositions.id) |
| `latest_sub_disposition_id` | UUID | YES | NULL | migration 086 (FK to sub_dispositions.id) |
| `next_action_date` | TIMESTAMPTZ | YES | NULL | migration 086 |
| `transition_to_fallout_at` | TIMESTAMPTZ | YES | NULL | migration 124 |
| `transition_to_counselled_at` | TIMESTAMPTZ | YES | NULL | migration 124 |
| `transition_to_ob_initiated_at` | TIMESTAMPTZ | YES | NULL | migration 124 |
| `transition_to_offer_at` | TIMESTAMPTZ | YES | NULL | migration 124 |
| `transition_to_converted_at` | TIMESTAMPTZ | YES | NULL | migration 124 |
| `transition_to_screening_at` | TIMESTAMPTZ | YES | NULL | migration 124 |

**Important — Columns NOT in database but referenced in code:**
- `transition_to_admitted_at` — **Does NOT exist** in DB schema (migration 124 adds fallout, counselled, ob_initiated, offer, converted, screening — NOT admitted)
- `transition_to_verification_pending_at` — **Does NOT exist** in DB schema
- `assignment_date` (as a column) — **Derived from** `lead_assignments` table, not stored in `leads`
- `first_call_date` (as a column) — **Derived from** `calls` table, not stored in `leads`
- `contacted_timestamp` — **Derived from** `lead_disposition_history`, not stored in `leads`

### 2.2 Calls Table (`public.calls`)

```sql
CREATE TABLE public.calls (
    id UUID PRIMARY KEY,
    lead_id UUID REFERENCES leads(id),
    counselor_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL CHECK (status IN (
        'initiated', 'ringing', 'in-progress', 'completed',
        'missed', 'failed', 'voicemail', 'busy', 'no-answer'
    )),
    duration_seconds INTEGER DEFAULT 0,
    next_follow_up TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Canonical Call Definitions (migration 130):**
- **Call Attempts** = `COUNT(*) FROM calls WHERE lead_id = X` (all call records, all statuses)
- **Connected Calls / Interactions** = `COUNT(*) FROM calls WHERE lead_id = X AND status IN ('completed', 'in-progress')`
- **Not Connected** = `COUNT(*) FROM calls WHERE lead_id = X AND status NOT IN ('completed', 'in-progress')`

### 2.3 Lead Assignments Table (`public.lead_assignments`)

```sql
CREATE TABLE public.lead_assignments (
    id UUID PRIMARY KEY,
    lead_id UUID REFERENCES leads(id),
    assignee_id UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);
```

**Assignment definition:** The most recent active assignment record for a lead determines the `assigned_counselor`.

### 2.4 Disposition Tables

**`disposition_categories`** (migration 086):
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | UUID | NO | `gen_random_uuid()` |
| `name` | VARCHAR(255) | NO | — |
| `order_index` | INTEGER | NO | `0` |
| `is_active` | BOOLEAN | NO | `true` |
| `created_at` | TIMESTAMPTZ | NO | `now()` |
| `updated_at` | TIMESTAMPTZ | NO | `now()` |

**Seeded categories:**
1. `CONTACTED` (order_index: 10)
2. `NOT CONNECTED` (order_index: 5)
3. `INTEREST / INTENT` (order_index: 20) — **Currently `is_active = FALSE`**
4. `QUALIFICATION` (order_index: 30)
5. `OBJECTION / BARRIER` (order_index: 40)
6. `NOT INTERESTED` (order_index: 50)
7. `FOLLOW-UP REQUIRED` (order_index: 60)
8. `PARTNER ONBOARDING` (order_index: 70)
9. `CONVERTED` (order_index: 80)
10. `LOST / CLOSED` (order_index: 90)
11. `Tst` — legacy inactive test category

**`dispositions`** (migration 086):
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | UUID | NO | `gen_random_uuid()` |
| `category_id` | UUID | YES | NULL |
| `name` | VARCHAR(255) | NO | — |
| `requires_follow_up` | BOOLEAN | NO | `false` |
| `requires_note` | BOOLEAN | NO | `false` |
| `next_action_required` | BOOLEAN | NO | `false` |
| `target_status` | VARCHAR(100) | YES | NULL |
| `is_active` | BOOLEAN | NO | `true` |
| `order_index` | INTEGER | NO | `0` |

**Current disposition `target_status` values (from seed + migration 134):**
- `'Hot'` — e.g., Counselled, Highly Interested, Interested, Follow-up Offer, Follow-up Referral
- `'Warm'` — Follow Up, Wants More Information, Payout Concern, Trust Concern
- `'Qualified'` — Qualified Partner, Potential Partner
- `'Application'` — Registration Done, Onboarding Started
- `'Docs Pending'` — Document Collected, Documents Pending
- `'Admitted'` — Semester Fee Paid, Partner Activated
- `'Not Connected'` — Switched Off, Not Reachable, Number Busy, Ringing No Answer, Call Back Requested
- `'Rejected'` — Not Interested, Invalid Number, Loan Rejected, Lost, Wrong Number

**Key finding:** `'Lost'` does NOT exist as a `target_status` value in the database. The `useSmartView.ts` references `'Lost'` in the `lost` smart view filter which will never match.

### 2.5 RLS Policies on Leads

**Current effective policies (after migration 042, superseded by migration 108):**

1. **"Counselors view/edit own leads"** — Counselors can only see/modify leads where `assigned_counselor = auth.uid()`
2. **"Authenticated users can insert leads"** — Any authenticated user can create leads
3. **Super Admin/Admin** — Full access via `public.is_admin()` or `public.user_role() IN ('Super Admin', 'Admin')`
4. **Partners** — Can only see own leads (filtered by `partner_id`)
5. **University users** — Can only see assigned leads
6. **Manager/TL** — View access to team leads (via `public.user_role() IN ('Manager', 'Team Leader')`)

**Critical:** RLS policies are enforced at the database level. Frontend filtering is NOT security — it's convenience only.

### 2.6 RLS on Disposition Tables (migration 086)

All disposition tables (`disposition_categories`, `dispositions`, `sub_dispositions`, `next_actions`, `lead_disposition_history`) have RLS enabled. Read access is granted to all authenticated users; write access is restricted to Super Admin/Admin roles only.

---

## 3. Existing Filter Architecture

### 3.1 Filter Types and Enums

**`src/types/filter.ts`** defines:

```typescript
export type FilterOperator =
  | '=' | '!=' | '>' | '<' | '>=' | '<='
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'in' | 'not_in'
  | 'is_null' | 'is_not_null'
  | 'between' | 'before' | 'after'
  | 'relative_date' | 'today' | 'yesterday' | 'this_week' | 'this_month';

export type FilterFieldType = 'string' | 'number' | 'date' | 'boolean' | 'uuid' | 'array';

export type FilterCategory =
  | 'lead_info' | 'date' | 'call_activity' | 'disposition'
  | 'status' | 'assignment' | 'analytics' | 'academic';
```

### 3.2 Filter Fields (from `FILTER_FIELDS` in filterQueryBuilder.ts)

| ID | Label | Category | Type | DB Column | Operators |
|----|-------|----------|------|-----------|-----------|
| `lead_id` | Lead ID | lead_info | uuid | `id` | =, != |
| `name` | Lead Name | lead_info | string | `first_name` | =, !=, contains, not_contains, starts_with, ends_with, in, not_in |
| `phone` | Phone | lead_info | string | `phone` | =, !=, contains, not_contains, starts_with, ends_with, in, not_in |
| `email` | Email | lead_info | string | `email` | =, !=, contains, not_contains, starts_with, ends_with, in, not_in |
| `city` | City | lead_info | string | `city` | =, !=, contains, not_contains, starts_with, ends_with, in, not_in |
| `state` | State | lead_info | string | `state` | =, !=, contains, not_contains, starts_with, ends_with, in, not_in |
| `country` | Country | lead_info | string | `country` | =, !=, contains, not_contains, starts_with, ends_with, in, not_in |
| `lead_source` | Lead Source | lead_info | string | `lead_source` | =, !=, in, not_in |
| `campaign` | Campaign | lead_info | string | `campaign` | =, !=, contains, not_contains, in, not_in |
| `tags` | Tags | lead_info | array | `tags` | contains, not_contains |
| `created_at` | Lead Created | date | date | `created_at` | =, !=, before, after, between, relative_date, today, yesterday, this_week, this_month |
| `updated_at` | Modified | date | date | `updated_at` | =, !=, before, after, between, relative_date |
| `last_call_date` | Last Call | date | date | `last_call_date` | =, !=, before, after, between, relative_date, is_null, is_not_null |
| `first_call_date` | First Call | date | date | *(subquery)* | is_null, is_not_null, before, after, between, relative_date |
| `final_follow_up_date` | Final Follow-Up | date | date | `final_follow_up_date` | =, !=, before, after, between, relative_date, is_null, is_not_null |
| `next_action_date` | Next Action Date | date | date | `next_action_date` | =, !=, before, after, between, relative_date, is_null, is_not_null |
| `assignment_date` | Assignment Date | date | date | *(subquery)* | is_null, is_not_null, before, after, between, relative_date |
| `lead_status` | Lead Status | status | string | `lead_status` | =, !=, in, not_in |
| `lead_stage` | Lead Stage | status | string | `lead_status` | =, !=, in, not_in |
| `lead_score` | Lead Score | analytics | number | `lead_score` | =, !=, >, <, >=, <=, between |
| `priority` | Priority | lead_info | string | `priority` | =, !=, in, not_in |
| `intent` | Intent | status | string | `lead_status` | =, !=, in, not_in |
| `call_attempts` | Call Attempts | call_activity | number | `call_attempts` | =, !=, >, <, >=, <=, between |
| `interactions_count` | Interactions | call_activity | number | `interactions_count` | =, !=, >, <, >=, <=, between |
| `latest_disposition_id` | Disposition | disposition | uuid | `latest_disposition_id` | =, !=, in, not_in, is_null |
| `assigned_counselor` | Counselor | assignment | uuid | `assigned_counselor` | =, !=, in, not_in, is_null |
| `notes_count` | Notes Count | analytics | number | `notes_count` | =, !=, >, <, >=, <=, between |
| `tasks_count` | Tasks Count | analytics | number | `tasks_count` | =, !=, >, <, >=, <=, between |
| `university` | University | academic | string | *(subquery)* | =, !=, contains, in, not_in |
| `course` | Course | academic | string | *(subquery)* | =, !=, contains, in, not_in |
| `temperature` | Temperature | analytics | string | `temperature` | =, !=, in, not_in |
| `age` | Age | lead_info | number | `age` | =, !=, >, <, >=, <=, between |
| `urgency` | Urgency | lead_info | string | `urgency` | =, !=, in, not_in |
| `conversion_probability` | Conversion Probability | analytics | number | `conversion_probability` | =, !=, >, <, >=, <=, between |

### 3.3 Hardcoded Filter Options

The following values are **hardcoded** in `filterQueryBuilder.ts`:

#### Intent Status Lists (HARDCODED)
```javascript
// In applyHotIntent / applyWarmIntent / applyColdIntent
HOT_STATUSES = ['Hot', 'Qualified', 'Admitted']
WARM_STATUSES = ['Warm', 'Interested', 'Connected', 'Docs Pending']
```

These should be dynamically derived from the `dispositions.target_status` column. When a Super Admin adds a new disposition with `target_status = 'Hot'`, the intent filter will NOT automatically include the new status.

#### Disposition Category Reference Missing
The `AdvancedFilterSidebar.tsx` references `field.id === 'disposition_category'` at line 166, but there is **NO** filter field with id `disposition_category` in `FILTER_FIELDS`. This means the disposition category select dropdown in the advanced filter sidebar has no registered field to render.

#### Intent Options (Hardcoded in UI)
```javascript
// In AdvancedFilterSidebar.tsx
const INTENT_OPTIONS = ['HOT', 'WARM', 'COLD'];
```
This is acceptable as these are the intent levels, not disposition values.

### 3.4 Dynamic Filter Options

#### Lead Status Options
The `LeadStatus` type in `schema.ts:100` is defined as `string` (allowing dynamic pipeline stages), but there are hardcoded status arrays in multiple places:

```typescript
// In smartViews.ts and useSmartView.ts
['Inquiry', 'New']  // fresh_lead
['Qualified']       // qualified
['Application']     // application_started
['Docs Pending']   // documents_pending
['Admitted']        // admission_done
['Rejected', 'Lost'] // lost smart view (BUG: 'Lost' doesn't exist)
```

These status values should ideally be derived from the `target_status` column of active dispositions rather than hardcoded.

#### Counselor/User Options
Not implemented as filter field options. The `counselorFilter` in LeadsList uses a separate select. The `useLeadAssignment` hook fetches users dynamically.

#### Disposition Category Options
The `useDispositions` hook fetches categories dynamically from the database. LeadsList uses this for the dispositionFilter dropdown. However, `useSmartView` duplicates this logic by fetching directly from `supabase` instead of using the `useDispositions` hook.

---

## 4. Query Architecture

### 4.1 Query Building Pattern

Both `useLeads` and `useSmartView` use a **`buildQuery` pattern**:

1. Start with a base `supabase.from('leads').select(columns, { count: 'exact' })`
2. Chain `.eq()`, `.is()`, `.not()`, `.in()` filters
3. Apply sorting with `.order()`
4. Apply pagination with `.range(start, end)`
5. Execute with `await query`
6. Post-process results in JavaScript for derived fields

### 4.2 Advanced Filter Integration

The advanced filter system works as follows:

```
FilterState (JSON structure)
    ↓
applyFilters(query, filterState)  // from filterQueryBuilder.ts
    ↓
Query built with Supabase PostgREST filters
    ↓
Results returned from database
```

**`applyFilters`** supports:
- `AND` logic (default for conditions in a group)
- `OR` logic (for groups with `logic: 'OR'`)
- Nested groups (recursive structure)

**Current integration in `useLeads`:**
```typescript
if (options?.advancedFilters && !excludeStatusFilter) {
  query = applyFilters(query, options.advancedFilters);
}
```

### 4.3 Disposition Query Pattern (useLeads)

```typescript
// Maps category name → category ID → disposition IDs → latest_disposition_id IN (...)
const { data: catData } = await supabase
  .from('disposition_categories')
  .select('id')
  .eq('name', options.filters.dispositionCategory)
  .maybeSingle();

if (catData) {
  const { data: dispData } = await supabase
    .from('dispositions')
    .select('id')
    .eq('category_id', catData.id)
    .eq('is_active', true);
  matchingDispositionIds = dispData.map(d => d.id);
}
```

This correctly follows the canonical disposition source, but uses a different approach than the filter engine.

---

## 5. NULL Handling Analysis

### 5.1 Critical NULL Bugs Found

| Field | Bug | Location | Impact |
|-------|-----|----------|--------|
| `urgency` | `urgency != 'Immediate'` excludes NULL rows | `filterQueryBuilder.ts` in `applyColdIntent` | Cold intent filter misses leads with NULL urgency |
| `urgency` | `urgency.neq.High` in cold intent filter | `filterQueryBuilder.ts:433` | Same issue for WARM exclusion |
| `assigned_counselor` | `= 'Unassigned'` string passed to UUID column | `useLeads.ts:160` (now fixed in current changes) | Returns empty results instead of unassigned leads |
| `not_contains` | `query.not(col, 'ilike', ...)` excludes NULL rows | `filterQueryBuilder.ts:482-483` | NOT CONTAINS filters miss NULL values |
| `!=` operator | `query.not(col, 'in', value)` for arrays | `filterQueryBuilder.ts:469-470` | Incorrect implementation — uses `not('id-for-skip', 'in', value)` which is a hack |

### 5.2 Canonical NULL Behavior Requirements

| Operator | NULL Semantics |
|----------|----------------|
| `IS NULL` | Returns rows where column IS NULL |
| `IS NOT NULL` | Returns rows where column IS NOT NULL |
| `= value` | Returns rows where column = value (NULLs excluded) |
| `!= value` | Must return: column IS NULL OR column != value |
| `not_contains` value | Must return: column IS NULL OR column NOT LIKE %value% |
| `>` / `<` | NULLs are excluded (standard SQL behavior) |

---

## 6. Role-Based Access Control (RBAC)

### 6.1 Role Definitions (from database)

| Role Name | Source Migration | Description |
|-----------|-----------------|-------------|
| `Super Admin` | migration 026 | Full system access, bypasses all RLS |
| `Admin` | migration 026 | Full access within organization |
| `Manager` | migration 040 | View team leads, manage team |
| `Team Leader` | migration 121 | View team leads, manage assignments |
| `Counselor` | migration 026 | View/edit own assigned leads only |
| `Accounts` | migration 026 | Read-only access for finance |
| `Partner` | migration 048 | View own leads only |
| `Marketing` | migration 040 | Marketing read access |
| `University` | migration 049 | University-specific access |
| `Viewer` | migration 040 | Read-only limited access |
| `Student` | migration 103 | Student-facing access |

**Note:** The `Role` type in `src/types/auth.ts:1` defines 8 roles, missing `Manager` and `Team Leader`.

### 6.2 RBAC in useLeads

```typescript
// useLeads.ts:111
if (user.role !== 'Super Admin' && user.role !== 'Admin') {
  query = query.eq('assigned_counselor', user.id);
}
```

This restricts non-admin users to their own assigned leads at the query level.

### 6.3 RBAC in useSmartView

```typescript
// useSmartView.ts:131
const isSuperAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';

// useSmartView.ts:169-172
if (!isSuperAdmin) {
  query = query.eq('assigned_counselor', user.id);
}
```

### 6.4 RBAC in Filter Query

**Current gap:** The `applyFilters` function in `filterQueryBuilder.ts` does NOT apply RBAC filtering. It only applies the explicit filter conditions from the `FilterState`. RBAC must be enforced separately (either in RLS or in the calling hook).

---

## 7. Realtime Subscriptions

### 7.1 Leads List (useLeads)

```typescript
// Subscribes to changes on: leads, calls, lead_activities
const channel = supabase
  .channel(channelId)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads())
  .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => fetchLeads())
  .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_activities' }, () => fetchLeads())
  .subscribe();
```

### 7.2 Smart View (useSmartView)

```typescript
// Same pattern but also subscribes to 'dispositions' table
.on('postgres_changes', { event: '*', schema: 'public', table: 'dispositions' }, () => fetchLeads())
```

### 7.3 useDispositions (Enhanced)

Current state includes realtime subscriptions on `disposition_categories` and `dispositions` tables (from the partial implementation), triggering `fetchDispositions()` on any change.

---

## 8. Disposition System Architecture

### 8.1 Current Architecture

```
Super Admin Portal (DispositionManagement.tsx)
    ↓
dispositionService.ts (CRUD operations)
    ↓
Supabase: disposition_categories, dispositions, sub_dispositions, next_actions
    ↓
useDispositions.ts (hook - fetches categories + dispositions)
    ↓
LeadsList.tsx (uses categories for dispositionFilter dropdown)
DispositionWidget.tsx (uses categories for disposition selector)
useSmartView.ts (fetches directly, does NOT use useDispositions hook)
AdvancedFilterSidebar.tsx (uses useDispositions for category dropdown)
```

### 8.2 Disposition Data Flow Issues

1. **useSmartView duplicates data fetching** — Does not use `useDispositions` hook, fetches directly from Supabase
2. **AdvancedFilterSidebar `disposition_category` field** — Referenced but not registered in `FILTER_FIELDS`
3. **Intent computation duplication** — `computeIntent()` in `leadIntent.ts` and `getIntentFromLeadStatus()` in `filterQueryBuilder.ts` have different status lists

### 8.3 Hardcoded Disposition Arrays

```javascript
// DispositionWidget.tsx - hardcoded display names for NOT CONNECTED handling
const contactedCat = getCategoryByName(categories, 'CONTACTED');
const notConnectedCat = getCategoryByName(categories, 'NOT CONNECTED');
```

The category names `'CONTACTED'` and `'NOT CONNECTED'` are hardcoded but fetched dynamically — if Super Admin renames these categories, the widget breaks.

---

## 9. Current Bugs Summary

| # | Bug | File | Severity | Status |
|---|-----|------|----------|--------|
| 1 | `target_status === 'Lost'` — does not exist in DB | DispositionWidget.tsx:391,392,1068 | HIGH | Fixed in current changes |
| 2 | `lead_status IN ('Rejected', 'Lost')` in smart view | useSmartView.ts:613 | HIGH | Not fixed |
| 3 | `counselorFilter === 'Unassigned'` passes string to UUID | useLeads.ts:160 | HIGH | Fixed in current changes |
| 4 | `urgency != 'Immediate'` excludes NULL rows | filterQueryBuilder.ts:427-434 | CRITICAL | Fixed in current changes |
| 5 | `not_contains` operator excludes NULL rows | filterQueryBuilder.ts:482-483 | HIGH | Fixed in current changes |
| 6 | `!=` for arrays uses broken `not('id-for-skip'` | filterQueryBuilder.ts:469-470 | HIGH | Fixed in current changes |
| 7 | `disposition_category` field referenced but not in FILTER_FIELDS | AdvancedFilterSidebar.tsx:166 | HIGH | Not fixed |
| 8 | `INTEREST / INTENT` category is inactive | Database | MEDIUM | Not fixed |
| 9 | Intent computation hardcoded in two places | leadIntent.ts + filterQueryBuilder.ts | HIGH | Partially fixed (dynamic mapping added) |
| 10 | Migration 134 not applied to remote DB | Database | HIGH | Not fixed |
| 11 | Duplicate disposition rows exist (7 pairs) | Database | MEDIUM | Not fixed |

---

## 10. Dependency Map

```
Database Tables
    ↓
dispositionService.ts (CRUD operations)
    ↓
useDispositions.ts (hook - fetches categories + dispositions)
    ↓
LeadsList.tsx (dispositionFilter dropdown)
DispositionWidget.tsx (status selector)
useSmartView.ts (fetches directly — duplicate logic)
AdvancedFilterSidebar.tsx (category dropdown)

FilterState (JSON structure)
    ↓
applyFilters() from filterQueryBuilder.ts
    ↓
Supabase PostgREST query
    ↓
Database results
```

### File Dependencies for Modification

| File | Related To | Safe to Modify | Agent Isolation |
|------|------------|----------------|-----------------|
| `src/hooks/useDispositions.ts` | Disposition data source | YES | Agent 1 |
| `src/lib/filterQueryBuilder.ts` | Filter engine, intent logic | YES | Agent 2 |
| `src/types/filter.ts` | Filter type definitions | YES | Shared (careful) |
| `src/components/leads/LeadsList.tsx` | UI integration | YES | Agent 3 |
| `src/hooks/useLeads.ts` | Lead fetching, RBAC | YES | Agent 2 |
| `src/hooks/useSmartView.ts` | Smart views | YES | Agent 1 |
| `src/components/leads/AdvancedFilterSidebar.tsx` | UI component | YES | Agent 3 |
| `src/components/leads/profile/DispositionWidget.tsx` | Disposition UI | YES | Agent 1 |
| `src/lib/leadIntent.ts` | Intent computation | YES | Shared (careful) |
| `src/constants/smartViews.ts` | Smart view definitions | YES | Agent 2 |
| `src/types/auth.ts` | Role type | YES (minor) | Shared |

### Agent Isolation Strategy

- **Agent 1**: Disposition data layer (`useDispositions.ts`, `DispositionWidget.tsx`, `useSmartView.ts`)
- **Agent 2**: Filter engine and logic (`filterQueryBuilder.ts`, `useLeads.ts`, `smartViews.ts`, `leadIntent.ts`)
- **Agent 3**: UI components (`LeadsList.tsx`, `AdvancedFilterSidebar.tsx`)
- **Shared**: `types/filter.ts` and `types/auth.ts` — only modify if needed by all agents

---

## 11. Implementation Plan

### Phase 2: Fix NULL-Safe Filtering (Agent 2)
- [ ] Fix all `!=` operators to include IS NULL
- [ ] Fix `not_contains` to include IS NULL
- [ ] Fix `not_in` to include IS NULL where appropriate
- [ ] Fix `!=` for arrays to use correct Supabase syntax

### Phase 3: Dynamic Disposition Source (Agent 1 + Agent 2)
- [ ] Add `disposition_category` field to `FILTER_FIELDS` in `filterQueryBuilder.ts`
- [ ] Create `fetchIntentStatusMapping()` async function (DONE in current changes)
- [ ] Pre-fetch intent mapping before building queries in `useLeads`
- [ ] Add `disposition_category` operator support in `applySimpleCondition`
- [ ] Convert hardcoded status arrays to use dynamic mapping
- [ ] Consolidate `getIntentFromLeadStatus` to use `leadIntent.ts`

### Phase 4: RBAC-Aware Filters (Agent 2)
- [ ] Verify RBAC is enforced in `applyFilters` (should NOT be — enforced at query and RLS level)
- [ ] Ensure counselor filter respects role restrictions
- [ ] Ensure partner filters restrict to own data

### Phase 5: UI Integration (Agent 3)
- [ ] Connect `AdvancedFilterSidebar` to `LeadsList` properly
- [ ] Add disposition category dropdown with dynamic options
- [ ] Add status dropdown with dynamic options from dispositions
- [ ] Add urgency filter with NULL-aware UI

### Phase 6: Migration & Database (Agent 1)
- [ ] Apply migration 134 to remote DB (`supabase db push --linked`)
- [ ] Activate `INTEREST / INTENT` category
- [ ] Clean up duplicate dispositions (migration 135 exists)
- [ ] Create test users for RBAC testing

### Phase 7: Testing & Verification
- [ ] Run all 18 critical test cases from the test requirements
- [ ] Verify TypeScript compilation
- [ ] Verify no regressions in existing functionality
- [ ] Produce `ADVANCED_LEAD_FILTER_FINAL_E2E_AUDIT.md`

---

## 12. Production Readiness Assessment

**Current Status:** Partially Ready

| Criteria | Status | Notes |
|----------|--------|-------|
| Dynamic dispositions | ⚠️ Partial | Hook has realtime, but intent mapping cache needs pre-fetching |
| NULL-safe filtering | ⚠️ Partial | Fixed in `filterQueryBuilder.ts` but `useSmartView.ts` still has `'Lost'` bug |
| Database filtering | ✅ Good | Uses Supabase PostgREST, server-side |
| RBAC enforcement | ✅ Good | Database RLS policies are authoritative |
| Pagination | ✅ Good | Uses `.range()` correctly |
| Sorting | ✅ Partial | Derived fields fallback to `created_at` |
| Realtime | ⚠️ Partial | Subscriptions exist but could be optimized (debounced) |

---

**End of Phase 1 Audit**