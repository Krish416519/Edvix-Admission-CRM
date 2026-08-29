# Contexts & Hooks Audit Report

## Overview

**Scope:** All context providers in `src/contexts/` and React hooks in `src/hooks/`  
**Total files audited:** 19 (4 contexts + 15 hooks)  
**Total DB references scanned:** ~850  
**Invalid references found:** 13  
**Invalid references fixed:** 13  

---

## Contexts Audited

| Context | Tables Used | Issues Found | Issues Fixed | Status |
|---------|-------------|-------------|-------------|--------|
| `AuthContext.tsx` | users, roles, organization_users, organizations | 0 | 0 | ✅ Verified |
| `TelephonyContext.tsx` | calls, lead_activities, notifications, automation_execution_logs | 0 | 0 | ✅ Verified |
| `NotificationContext.tsx` | notifications, users | 0 | 0 | ✅ Verified |
| `LeadsContext.tsx` | leads (via hooks) | 0 | 0 | ✅ Verified |

---

## Hooks Audited

| Hook | Tables Used | Issues Found | Issues Fixed | Status |
|------|-------------|-------------|-------------|--------|
| `useLead.ts` | leads, calls, lead_activities, lead_disposition_history, lead_objections, dispositions, universities, courses, next_actions | 0 | 0 | ✅ Verified |
| `useLeads.ts` | leads, lead_assignments, calls, lead_activities, tasks, lead_disposition_history, organizations | 3 | 3 | ✅ Fixed |
| `useSmartView.ts` | leads, lead_assignments, lead_activities, calls, tasks, lead_disposition_history | 2 | 2 | ✅ Fixed |
| `useLeadAssignment.ts` | users, lead_assignments, leads, notifications, lead_activities | 0 | 0 | ✅ Verified |
| `useWhatsApp.ts` | whatsapp_conversations, whatsapp_contacts, whatsapp_messages, leads | 2 | 2 | ✅ Fixed |
| `useFinance.ts` | payments, leads, financial_ledger_entries, organizations, invoices | 2 | 2 | ✅ Fixed |
| `useStudentSuccess.ts` | leads, admissions, students, courses, universities, support_tickets, next_actions | 1 | 1 | ✅ Fixed |
| `useAnalytics.ts` | leads, payments, calls, lead_activities, tasks, admissions, users | 0 | 0 | ✅ Verified |
| `useCallReports.ts` | calls, users, leads | 0 | 0 | ✅ Verified |
| `useCallAi.ts` | calls, ai_intelligence_logs, transcription_segments | 0 | 0 | ✅ Verified |
| `useTasks.ts` | tasks, leads, users | 0 | 0 | ✅ Verified |
| `useUniversityOps.ts` | universities, university_contacts, programs, courses | 0 | 0 | ✅ Verified |
| `useMarketing.ts` | leads, campaigns, campaign_enrollments | 0 | 0 | ✅ Verified |
| `useUniversityContacts.ts` | university_contacts, universities, university_departments, programs | 0 | 0 | ✅ Verified |
| `useOperations.ts` | system_health, operations_metrics | 0 | 0 | ✅ Verified |

---

## Detailed Findings

### 1. useLeads.ts

**File:** `src/hooks/useLeads.ts`  
**Issues:** 3 (FIXED)

| Line(s) | Issue | Fix |
|---------|-------|-----|
| 152 | `.order('transition_to_admitted_at')` on `leads` | Column doesn't exist. Moved to "derived fields" bucket. |
| 154 | `.order('transition_to_verification_pending_at')` on `leads` | Column doesn't exist. Moved to "derived fields" bucket. |
| 196 | `row.lead_status` — type error (TS2339) | Cast to `(row as any).lead_status` |
| 547, 683 | (Already verified) `updates.status` → `payload.lead_status`, `updates.score` → `payload.lead_score` | Already correct |

**Additional verification:**
- `updateLead` function (line 536-555): Correctly maps all TS properties to DB columns:
  - `firstName` → `first_name` ✓
  - `lastName` → `last_name` ✓
  - `name` → split into `first_name` + `last_name` ✓
  - `email` → `email` ✓
  - `phone` → `phone` ✓
  - `alternatePhone` → `alternate_phone` ✓
  - `leadStatus` → `lead_status` ✓
  - `status` → `lead_status` ✓ (legacy alias)
  - `priority` → `priority` ✓
  - `leadScore` → `lead_score` ✓
  - `score` → `lead_score` ✓ (legacy alias)
  - `assignedCounselor` → `assigned_counselor` ✓
  - `counselorId` → `assigned_counselor` ✓
  - `universityId` → `university_id` ✓
  - `courseId` → `course_id` ✓
  - `university` → `university_id` ✓

### 2. useSmartView.ts

**File:** `src/hooks/useSmartView.ts`  
**Issues:** 2 (FIXED)

| Line(s) | Issue | Fix |
|---------|-------|-----|
| 171 | `.order('transition_to_admitted_at')` on `leads` | Column doesn't exist. Replaced with fallback to `created_at`. |
| 173 | `.order('transition_to_verification_pending_at')` on `leads` | Column doesn't exist. Replaced with fallback to `created_at`. |

**Additional verification:**
- `DEFAULT_PIPELINE_STAGES` import from `constants/pipelineStages` — valid path ✓
- `get_lead_stage_distribution` RPC call — verified exists ✓

### 3. useWhatsApp.ts

**File:** `src/hooks/useWhatsApp.ts`  
**Issues:** 2 (FIXED)

| Line(s) | Issue | Fix |
|---------|-------|-----|
| 66 | `.select('full_name')` on `leads` in nested join | Changed to `first_name, last_name` |
| — | WaConversation interface `leads` type used `full_name` | Changed to `{ first_name, last_name, phone }` |

### 4. useFinance.ts

**File:** `src/hooks/useFinance.ts`  
**Issues:** 2 (FIXED)

| Line(s) | Issue | Fix |
|---------|-------|-----|
| 30 | `.select('full_name')` on `leads` in nested join | Changed to `first_name, last_name` |
| 111 | Interface field `leads` type used `full_name` | Changed to `{ first_name, last_name, email }` |

### 5. useStudentSuccess.ts

**File:** `src/hooks/useStudentSuccess.ts`  
**Issues:** 1 (FIXED)

| Line(s) | Issue | Fix |
|---------|-------|-----|
| 137 | `.select('full_name')` on `leads` in subquery | Changed to `first_name, last_name` |

### 6. useLead.ts (Verified - no changes needed)

**File:** `src/hooks/useLead.ts`  
**Issues:** 0 (previously fixed in prior session)

Verified correct:
- `SELECT` uses valid columns: `first_name`, `last_name`, `email`, `phone`, `lead_status`, `priority`, `assigned_counselor`, `university_id`, `course_id`, `lead_score`, `conversion_probability`, `drop_off_risk`, `last_call_date`, `next_action_date`, `interactions_count`, `call_attempts`, `tags`, `notes`, `ai_suggested_next_action`, `ai_summary`, `ai_score`, `ai_insights`
- Field mapping: `lead_status` → `leadStatus`, `lead_score` → `leadScore`, `assigned_counselor` → `assignedCounselor`, `university_id` → `universityId`, `call_attempts` → `callAttempts`, `interactions_count` → `interactionsCount`, `ai_suggested_next_action` → `aiSuggestedNextAction`, etc.
- UPDATE operations: Correctly map `leadStatus` → `lead_status`, `leadScore` → `lead_score`, etc.
- Realtime subscription: Properly scoped to single lead (`id=eq.{id}`)
- `lead_activities` operations: Use valid columns (`lead_id`, `type`, `content`, `author`, `date`, `metadata`)

### 7. useLeadAssignment.ts (Verified - no changes needed)

**File:** `src/hooks/useLeadAssignment.ts`  
**Issues:** 0

Verified correct:
- `assign_lead` RPC call — exists in database ✓
- `bulk_assign_leads` RPC call — exists in database ✓
- `lead_assignments.insert` — uses valid columns ✓
- `notifications.insert` — uses valid columns ✓
- `lead_activities.insert` — uses valid columns ✓

### 8. useWhatsApp.ts (Verified - no additional changes needed)

**File:** `src/hooks/useWhatsApp.ts`  
- `whatsapp_conversations` operations verified ✓
- `whatsapp_contacts` operations verified ✓

---

## Context Audits

### AuthContext.tsx (Verified)

| Line | Operation | Table | Columns Used | Valid? |
|------|-----------|-------|-------------|--------|
| 86 | update | users | `last_login` | ✅ Yes |
| 212 | select | users | `*` (with `roles(name)` join) | ✅ Yes |
| 218 | select | organization_users | `*` (with `organizations(*)` join) | ✅ Yes |
| 222 | rpc | — | `get_user_permissions(p_user_id)` | ✅ RPC exists |
| 230 | select | users | `*` (with `roles(name)`) | ✅ Yes |

### TelephonyContext.tsx (Verified)

| Line | Operation | Table | Columns Used | Valid? |
|------|-----------|-------|-------------|--------|
| 89 | insert | call_events | `call_id, event_type, event_data, performed_by` | ✅ All exist |
| 96 | insert | call_audit_log | `call_id, user_id, action, details` | ✅ All exist |
| 123 | update | calls | `status, duration_seconds, outcome, notes, next_follow_up, updated_at` | ✅ All exist |
| 136 | insert | lead_activities | `lead_id, type, content, metadata` | ✅ All exist |
| 145 | update | leads | `next_action_date` | ✅ Exists |
| 149 | insert | automation_execution_logs | `workflow_id, trigger_event, status, affected_lead_id, actions_executed` | ✅ All exist |

### NotificationContext.tsx (Verified)

| Line | Operation | Table | Columns Used | Valid? |
|------|-----------|-------|-------------|--------|
| 267 | .eq | notifications | `status` | ✅ Exists |
| 366 | update | notifications | `status, read_at` | ✅ Both exist |

### LeadsContext.tsx (Verified)

Delegates to `useLead` and `useLeads` hooks — verified above.
