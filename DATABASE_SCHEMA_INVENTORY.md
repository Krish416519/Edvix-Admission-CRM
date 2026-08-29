# Database Schema Inventory

## Audit Source
- **Database:** Remote Supabase instance
- **Migrations Applied:** 126
- **Total Tables:** 193

---

## Core CRM Tables (Audited)

### 1. `leads` (106 columns)

**Primary Key:** `id` (uuid)  
**Foreign Keys:** `organization_id` → `organizations.id`, `assigned_counselor` → `users.id`, `course_id` → `courses.id`, `university_id` → `universities.id`, `created_by` → `users.id`, `updated_by` → `users.id`, `partner_id` → `users.id`, `latest_disposition_id` → `dispositions.id`, `latest_sub_disposition_id` → `sub_dispositions.id`  
**Unique:** `lead_number`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| first_name | varchar | NO | - | |
| last_name | varchar | YES | NULL | |
| email | varchar | YES | NULL | |
| phone | varchar | NO | - | |
| lead_status | varchar | NO | 'New' | NOT `status` |
| priority | varchar | NO | 'Low' | |
| lead_score | integer | NO | 0 | NOT `score` |
| assigned_counselor | uuid | YES | NULL | FK → users |
| university_id | uuid | YES | NULL | FK → universities (NO `university` text column) |
| course_id | uuid | YES | NULL | FK → courses |
| course | varchar | YES | NULL | Text field (legacy) |
| organization_id | uuid | NO | - | FK → organizations |
| last_call_date | timestamptz | YES | NULL | NOT `last_contacted_at` |
| next_action_date | timestamptz | YES | NULL | NOT `next_follow_up` |
| call_attempts | integer | YES | 0 | |
| interactions_count | integer | YES | 0 | |
| final_follow_up_date | timestamptz | YES | NULL | |
| lead_number | varchar | NO | - | Unique |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |
| deleted_at | timestamptz | YES | NULL | Soft delete |
| ai_score | integer | YES | NULL | |
| ai_insights | text | YES | NULL | |
| ai_suggested_next_action | text | YES | NULL | |
| ai_summary | text | YES | NULL | |
| conversion_probability | numeric | YES | 0.0 | |
| temperature | varchar | YES | 'Cold' | |
| drop_off_risk | varchar | YES | 'Low' | NOT `ai_drop_off_risk` |
| payment_probability | numeric | YES | 0.0 | |
| tags | text[] | YES | '{}' | |
| notes_count | integer | YES | 0 | |
| tasks_count | integer | YES | 0 | |
| ... (60+ additional academic/professional profile columns) | | | | |

### 2. `calls`

**Primary Key:** `id` (uuid)  
**Foreign Keys:** `lead_id` → `leads.id`, `provider_id` → `telephony_providers.id`, `counselor_id` → `auth.users.id`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| lead_id | uuid | YES | NULL | FK → leads |
| counselor_id | uuid | YES | NULL | FK → auth.users |
| direction | text | NO | - | |
| status | text | NO | - | |
| duration_seconds | integer | YES | 0 | |
| outcome | text | YES | NULL | |
| notes | text | YES | NULL | |
| next_follow_up | timestamptz | YES | NULL | Valid on `calls` table |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |
| lead_name | text | YES | NULL | |
| lead_phone | text | YES | NULL | |
| counselor_name | text | YES | NULL | |

### 3. `lead_activities`

**Primary Key:** `id` (uuid)  
**Foreign Keys:** `lead_id` → `leads.id`, `organization_id` → `organizations.id`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| lead_id | uuid | NO | - | FK → leads (NOT NULL) |
| type | varchar | NO | - | NOT `activity_type` |
| content | text | NO | - | NOT `description`/`notes` |
| subject | varchar | YES | NULL | NOT `title` |
| duration | varchar | YES | NULL | |
| metadata | jsonb | YES | '{}' | |
| date | timestamptz | YES | NULL | NOT `created_at` for inserts |
| author | varchar | YES | NULL | NOT `created_by` |
| status | varchar | YES | NULL | |
| due_date | timestamptz | YES | NULL | |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |
| organization_id | uuid | NO | - | FK → organizations (NOT NULL, set by trigger) |

### 4. `lead_objections`

**Primary Key:** `id` (uuid)  
**Foreign Keys:** `lead_id` → `leads.id`, `created_by` → `users.id`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| lead_id | uuid | NO | - | |
| objection_type | text | NO | - | |
| student_concern | text | YES | NULL | |
| counselor_response | text | YES | NULL | |
| outcome | text | YES | NULL | |
| follow_up_required | boolean | YES | false | |
| status | text | YES | 'Open' | |
| created_by | uuid | YES | NULL | |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |
| deleted_at | timestamptz | YES | NULL | |

### 5. `lead_disposition_history`

**Primary Key:** `id` (uuid)  
**Foreign Keys:** `lead_id` → `leads.id`, `disposition_id` → `dispositions.id`, `sub_disposition_id` → `sub_dispositions.id`, `next_action_id` → `next_actions.id`, `created_by` → `users.id`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| lead_id | uuid | YES | NULL | |
| disposition_id | uuid | YES | NULL | |
| sub_disposition_id | uuid | YES | NULL | |
| next_action_id | uuid | YES | NULL | |
| notes | text | YES | NULL | |
| follow_up_at | timestamptz | YES | NULL | |
| previous_status | varchar | YES | NULL | |
| new_status | varchar | YES | NULL | |
| created_by | uuid | YES | NULL | |
| created_at | timestamptz | YES | now() | |

### 6. `tasks`

**Primary Key:** `id` (uuid)  
**Foreign Keys:** `lead_id` → `leads.id`, `admission_id` → `admissions.id`, `assigned_user` → `users.id`, `created_by` → `users.id`, `organization_id` → `organizations.id`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| task_number | varchar | YES | NULL | |
| lead_id | uuid | YES | NULL | |
| admission_id | uuid | YES | NULL | |
| title | varchar | NO | - | |
| description | text | YES | NULL | |
| task_type | varchar | NO | - | |
| assigned_user | uuid | YES | NULL | |
| created_by | uuid | YES | NULL | |
| priority | varchar | NO | 'Medium' | |
| status | varchar | NO | 'Pending' | |
| due_date | date | NO | - | |
| due_time | time | YES | NULL | |
| completed_date | timestamptz | YES | NULL | |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |
| deleted_at | timestamptz | YES | NULL | |
| organization_id | uuid | YES | NULL | |

### 7. `lead_assignments`

**Primary Key:** `id` (uuid)  
**Foreign Keys:** `lead_id` → `leads.id`, `assignee_id` → `users.id`, `assigned_by` → `users.id`, `previous_assignee_id` → `users.id`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| lead_id | uuid | NO | - | |
| assignee_id | uuid | NO | - | |
| assigned_by | uuid | YES | NULL | |
| previous_assignee_id | uuid | YES | NULL | |
| assignment_type | varchar | YES | 'Manual' | |
| notes | text | YES | NULL | |
| assigned_at | timestamptz | YES | now() | |
| is_active | boolean | YES | true | |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

### 8. `courses`

**Primary Key:** `id` (uuid)  
**Foreign Keys:** `university_id` → `universities.id`, `organization_id` → `organizations.id`  
**Unique:** `code, university_id`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| name | varchar | NO | - | |
| code | varchar | NO | - | |
| university_id | uuid | NO | - | |
| level | varchar | NO | - | |
| fee | numeric | NO | 0.00 | |
| status | varchar | NO | 'Active' | |

### 9. `universities`

**Primary Key:** `id` (uuid)  
**Foreign Keys:** `organization_id` → `organizations.id`  
**Unique:** `code`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| name | varchar | NO | - | |
| code | varchar | NO | - | Unique |
| country | varchar | NO | - | |
| status | varchar | NO | 'Active' | |

### 10. `users`

**Primary Key:** `id` (uuid)  
**Foreign Keys:** `id` → `auth.users.id`, `role_id` → `roles.id`, `manager_id` → `users.id`  
**Unique:** `email`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | - | PK, cross-schema FK → auth.users |
| email | varchar | NO | - | Unique |
| name | varchar | NO | - | |
| role_id | uuid | YES | NULL | FK → roles |
| is_active | boolean | NO | true | |
| created_at | timestamptz | NO | now() | |
| full_name | varchar | YES | NULL | Alternative to name |

### 11. `notifications`

**Primary Key:** `id` (uuid)  
**Foreign Keys:** `recipient_id` → `users.id`, `organization_id` → `organizations.id`  
**Unique:** `notification_number`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| recipient_id | uuid | NO | - | FK → users |
| module | varchar | NO | - | NOT `type` |
| module_record_id | uuid | YES | NULL | NOT `reference_id` |
| title | text | NO | - | |
| message | text | NO | - | |
| channel | varchar | NO | 'In-App' | |
| priority | varchar | NO | 'Low' | |
| category | varchar | YES | NULL | |
| status | varchar | NO | 'Unread' | |
| read_at | timestamptz | YES | NULL | NOT `is_read` |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |
| organization_id | uuid | NO | - | |

### 12. `payments` (VIEW — not a real table)

**Note:** The `payments` table was converted to a VIEW. Data comes from `invoice_items` and `payment_installments`.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | YES | From invoice_items or payment_installments |
| payment_id | uuid | YES | |
| payment_method | varchar | YES | |
| status | varchar | YES | |
| net_amount | numeric | YES | |
| amount | numeric | YES | |
| payment_date | timestamptz | YES | |
| created_at | timestamptz | YES | |
| updated_at | timestamptz | YES | |
| organization_id | uuid | YES | |

---

## Non-Existent Tables Referenced in Code (P0/P1 Issues)

| Table Name | Referenced In | Impact |
|------------|---------------|--------|
| `counselor_performance` | CounselorDashboard.tsx, ManagerDashboard.tsx | Table doesn't exist; queries fail |
| `ai_manager_alerts` | ManagerDashboard.tsx | Table doesn't exist; queries fail |
| `email_messages` | EmailService.ts | Email module broken |
| `ai_feedback` | AIIntelligenceService.ts | Track feedback fails |
| `bi_scheduled_reports` | (likely referenced) | BI module broken |
| `communication_preferences` | WhatsAppService.ts | WhatsApp opt-in check fails |
| `enrollment_checklists` | (likely referenced) | Student success module broken |
| `enrollment_milestones` | (likely referenced) | Student success module broken |
| `sms_messages` | (likely referenced) | SMS module broken |
| `partner-documents` | PartnerService.ts | Invalid table name (contains hyphen) |

---

## Non-Existent Columns Referenced in Code

### Columns on `leads` table that DON'T exist but were referenced:

| Invalid Reference | Valid Column | Files |
|-------------------|--------------|-------|
| `status` | `lead_status` | ToolRegistry.ts:156,164, AutomationEngine.ts:194, CounselorDashboard.tsx:58,68 |
| `score` | `lead_score` | ToolRegistry.ts:124, AdmissionOS.ts:195, LeadAnalyzer.ts:51 |
| `full_name` | `first_name` + `last_name` | useWhatsApp.ts:66, useStudentSuccess.ts:137, useFinance.ts:30,111 |
| `ai_priority_score` | (use `lead_score`) | AIIntelligenceService.ts:128,145,158,160,176,177, CounselorDashboard.tsx:59,182 |
| `ai_drop_off_risk` | `drop_off_risk` | AIIntelligenceService.ts:158,188,209, CounselorDashboard.tsx:67,176 |
| `interested_programs` | (use `preferred_specialization`) | AIIntelligenceService.ts:306,328,330,339 |
| `interested_universities` | (none equivalent) | AIIntelligenceService.ts:306,331 |
| `last_contacted_at` | `last_call_date` | (already fixed in prior session) |
| `next_follow_up` (on leads) | `next_action_date` | (already fixed in prior session) |
| `ai_objection_detected` | (use `lead_objections` table) | (already fixed in prior session) |
| `transition_to_admitted_at` | (doesn't exist) | useLeads.ts:152, useSmartView.ts:171 |
| `transition_to_verification_pending_at` | (doesn't exist) | useLeads.ts:154, useSmartView.ts:173 |
| `university` (text) | `university_id` (FK) | (verified not referenced, only via join) |
| `ai_coach_notes` | (doesn't exist) | (TS interface only, not queried) |
| `ai_priority_reason` | (doesn't exist) | (TS interface only, not queried) |

### Columns on `notifications` table that DON'T exist but were referenced:

| Invalid Reference | Valid Column | Files |
|-------------------|--------------|-------|
| `user_id` | `recipient_id` | AutomationEngine.ts:200 |
| `type` | `module` | AutomationEngine.ts:203 |
| `is_read` | `read_at` (datetime) | AutomationEngine.ts:205 |
| `reference_id` | `module_record_id` | AutomationEngine.ts:206 |
| `reference_type` | `category` | AutomationEngine.ts:207 |

### Columns on `lead_activities` table that DON'T exist but were referenced:

| Invalid Reference | Valid Column | Files |
|-------------------|--------------|-------|
| `activity_type` | `type` | AdmissionOS.ts:420 |
| `created_by` | `author` | AdmissionOS.ts:422 |
| `title` | `subject` | AutomationEngine.ts:218 |
| `description` | `content` | AutomationEngine.ts:219 |

---

## Trigger Functions

### `update_lead_activity_counts(p_lead_id uuid)`
- **Type:** Function (not trigger)
- **Called by:** `trigger_update_lead_on_call_change`, `trigger_update_lead_on_activity_change`, `trigger_update_lead_on_task_change` triggers
- **Affects:** `leads.call_attempts`, `leads.interactions_count`, `leads.last_call_date`, `leads.final_follow_up_date`
- **Status:** FIXED — was broken, now properly uses subquery aliases

### `trigger_update_lead_on_call_change()`
- **Event:** AFTER INSERT/UPDATE/DELETE ON `calls`
- **Calls:** `update_lead_activity_counts(NEW/OLD.lead_id)`
- **Status:** Working

### `trigger_update_lead_on_activity_change()`
- **Event:** AFTER INSERT/UPDATE/DELETE ON `lead_activities`
- **Calls:** `update_lead_activity_counts(NEW/OLD.lead_id)`
- **Status:** Working

### `trigger_update_lead_on_task_change()`
- **Event:** AFTER INSERT/UPDATE/DELETE ON `tasks`
- **Calls:** `update_lead_tasks_count()`
- **Status:** Working

### `update_lead_tasks_count()`
- **Type:** Trigger function
- **Event:** AFTER INSERT/UPDATE/DELETE ON `tasks`
- **Status:** Exists and working

---

## RPC Functions

| RPC | Parameters | Returns | Status |
|-----|-----------|---------|--------|
| `get_lead_stage_distribution` | p_user_id uuid | TABLE(stage_name, stage_count, total_leads) | ✅ Verified |
| `assign_lead` | p_lead_id, p_assignee_id, p_assigned_by, p_notes, p_assignment_type | jsonb | ✅ Verified |
| `bulk_assign_leads` | p_lead_ids, p_assignee_id, p_assigned_by | jsonb | ✅ Verified |
| `bulk_delete_leads` | p_lead_ids | jsonb | ✅ Verified |
| `bulk_update_leads` | p_lead_ids, p_updates | jsonb | ✅ Verified |
| `get_analytics_kpis` | - | json | ✅ Verified |
| `get_user_permissions` | p_user_id | record | ✅ Verified |
| `increment_lead_tasks_count` | p_lead_id | void | ✅ Created (was missing) |
| `get_bi_source_performance` | - | record | ❌ Does NOT exist |
| `get_bi_counselor_performance` | - | record | ❌ Does NOT exist |
| `get_bi_revenue_forecast` | p_days | record | ❌ Does NOT exist |
| `get_bi_at_risk_revenue` | - | record | ❌ Does NOT exist |
| `get_bi_funnel_leakage` | - | record | ❌ Does NOT exist |
| `get_bi_executive_summary` | - | jsonb | ❌ Does NOT exist |
| `get_bi_anomaly_detection` | - | record | ❌ Does NOT exist |

---

## Realtime Subscriptions

| Component | Table | Event | Filter | Scope | Status |
|-----------|-------|-------|--------|-------|--------|
| `useLead.ts` | `leads` | UPDATE | `id=eq.{id}` | Scoped to single lead | ✅ Correct |
| `useLead.ts` | `lead_objections` | * | `lead_id=eq.{id}` | Scoped to single lead | ✅ Correct |
| `useLeadAssignment.ts` | `lead_assignments` | * | `lead_id=eq.{leadId}` | Scoped | ✅ Correct |
| `AuthContext.tsx` | `users` | UPDATE | `id=eq.{userId}` | Scoped | ✅ Correct |

---

## RLS Policies Summary

| Table | Policy Count | Key Rules |
|-------|-------------|-----------|
| `leads` | 15 | Counselor access to assigned leads, Admin/Super Admin full access |
| `calls` | 5 | Counselor access to own calls, RLS via `counselor_id` |
| `lead_activities` | 3 | Organization-scoped access |
| `lead_objections` | 3 | Organization-scoped access |
| `lead_disposition_history` | 2 | Organization-scoped access |
| `tasks` | 4 | Assigned user + organization-scoped |
| `lead_assignments` | 4 | Assignee + organization-scoped |

**RLS Status:** ✅ Intact — no policies were modified during audit.
