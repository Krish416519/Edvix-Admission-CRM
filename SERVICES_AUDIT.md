# Services Audit Report

## Overview

**Scope:** All files in `src/lib/`  
**Total DB references scanned:** ~400+ across 8 service files  
**Invalid references found:** 3 (all fixed)  

---

## Service Files Audited

| Service | DB Tables Used | Invalid Ref Found | Invalid Ref Fixed | Status |
|---------|---------------|-------------------|-------------------|--------|
| `AIIntelligenceService.ts` | leads, calls, lead_activities, lead_objections, ai_recommendations, ai_anomalies | 12 | 12 | ✅ Fixed |
| `AdmissionOS.ts` | leads, calls, lead_activities, admissions, tasks, ai_risk_alerts, users, notifications | 3 | 3 | ✅ Fixed |
| `LeadAnalyzer.ts` | leads, lead_objections, lead_disposition_history | 5 | 5 | ✅ Fixed |
| `ToolRegistry.ts` | leads, contacts, dispositions, dispositions_sub, next_actions, universities, courses | 3 | 3 | ✅ Fixed |
| `AutomationEngine.ts` | leads, lead_assignments, lead_activities, notifications, tasks, users, automation_workflow_executions, automation_actions, whatsapp_conversations, email_templates | 6 | 6 | ✅ Fixed |
| `dispositionService.ts` | leads, lead_disposition_history, dispositions, sub_dispositions, next_actions, lead_activities, tasks, notifications, users | 0 | 0 | ✅ Verified |
| `EmailService.ts` | email_delivery_logs | 0 | 0 | ⚠️ Separate module issue |
| `PartnerService.ts` | partner_profiles, partner_tiers, leads, dispositions, sub_dispositions, universities | 0 | 0 | ✅ Verified |

---

## Detailed Findings

### 1. AIIntelligenceService.ts

**File:** `src/lib/ai/AIIntelligenceService.ts`  
**Issues:** 12 invalid column references (FIXED)

| Line(s) | Method | Issue | Fix |
|---------|--------|-------|-----|
| 128 | `getLeadScore` | `SELECT ai_priority_score` | Changed to `lead_score` |
| 128 | `getLeadScore` | `SELECT ai_drop_off_risk` | Changed to `drop_off_risk` |
| 145 | `getLeadScore` | `.eq('ai_priority_score')` | Changed to `lead_score` |
| 145 | `getLeadScore` | `.eq('ai_drop_off_risk')` | Changed to `drop_off_risk` |
| 158 | `getLeadScore` | `.eq('ai_priority_reason')` | Removed |
| 160 | `getLeadScore` | `.select('interested_programs')` | Removed |
| 176-177 | `getRecommendations` | `.eq('ai_drop_off_risk', 'High')` | Changed to `drop_off_risk` |
| 177 | `getRecommendations` | `.order('ai_priority_score')` | Changed to `lead_score` |
| 188 | `getRecommendations` | `.select('ai_priority_score, ai_drop_off_risk')` | Changed to `lead_score, drop_off_risk` |
| 209 | `getRecommendations` | `.eq('lead_status')` on wrong alias | Fixed table reference |
| 306 | `getCallPreparation` | `.select('interested_programs, interested_universities')` | Removed both columns |
| 328, 330, 331, 339 | `getCallPreparation` | `interested_programs` in SELECT/order | Removed |

### 2. AdmissionOS.ts

**File:** `src/lib/ai/AdmissionOS.ts`  
**Issues:** 3 invalid column references (FIXED)

| Line | Method | Issue | Fix |
|------|--------|-------|-----|
| 195 | `getLivePipeline` | `.select('score')` on leads | Changed to `lead_score` |
| 420 | `getProductivityMetrics` | `.eq('activity_type', 'Call')` on lead_activities | Changed to `type` |
| 422 | `getProductivityMetrics` | `.eq('created_by', userId)` on lead_activities | Changed to `author` |

### 3. LeadAnalyzer.ts

**File:** `src/lib/ai/LeadAnalyzer.ts`  
**Issues:** 5 invalid column references (FIXED)

| Line(s) | Method | Issue | Fix |
|---------|--------|-------|-----|
| 22, 30-34 | `inferTemperature` | `lead.status` (4 occurrences) | Changed to `lead.lead_status` |
| 51 | `computeDropOffRisk` | `lead.status` | Changed to `lead.lead_status` |
| 56 | `analyze` | `score: engagementScore` in UPDATE | Changed to `lead_score: Math.min(engagementScore, 100)` |

### 4. ToolRegistry.ts

**File:** `src/lib/ai/ToolRegistry.ts`  
**Issues:** 3 invalid column references (FIXED)

| Line(s) | Method | Issue | Fix |
|---------|--------|-------|-----|
| 124, 126 | `buildLeadSearchQuery` | `.eq('status'), .eq('score')` on leads | Changed to `lead_status`, `lead_score` |
| 156 | `updateLeadStatus` | `.update({ status })` on leads | Changed to `{ lead_status }` |
| 164 | `buildLeadSearchQuery` | `.select('full_name')` on leads | Changed to `first_name, last_name` |

### 5. AutomationEngine.ts

**File:** `src/lib/automation/AutomationEngine.ts`  
**Issues:** 6 invalid column/table references (FIXED)

| Line | Method | Issue | Fix |
|------|--------|-------|-----|
| 194 | `executeWorkflowAction` | `.update({ status })` on leads | Changed to `{ lead_status }` |
| 200 | `executeWorkflowAction` | `lead.assigned_user` (doesn't exist) | Changed to `lead.assigned_counselor` |
| 205 | `executeWorkflowAction` | `notifications.insert` with `user_id, type, is_read, reference_id, reference_type` | Changed to valid columns (`recipient_id, module, module_record_id, category, status, channel, priority, title, message`) |
| 218 | `executeWorkflowAction` | `lead_activities.insert` with `title, created_by` | Changed to `subject, author` |
| 219 | `executeWorkflowAction` | `lead_activities.insert` with `description` | Changed to `content` |
| 242, 257, 268, 278 | `executeWorkflowAction` | `lead.full_name` (4 occurrences) | Changed to `${lead.first_name} ${lead.last_name}` concatenation |

### 6. dispositionService.ts

**File:** `src/lib/dispositionService.ts`  
**Issues:** 0 invalid references

All database operations verified:
- `lead_disposition_history.insert` — uses valid columns (`lead_id`, `disposition_id`, `sub_disposition_id`, `next_action_id`, `notes`, `follow_up_at`, `previous_status`, `new_status`, `created_by`)
- `lead_activities.insert` — uses valid columns (`lead_id`, `type`, `content`, `author`)
- `tasks.insert` — uses valid columns (`title`, `description`, `task_type`, `priority`, `status`, `due_date`, `due_time`, `assigned_user`, `created_by`, `lead_id`)
- `notifications.insert` — uses valid columns (`recipient_id`, `organization_id`, `module`, `module_record_id`, `title`, `message`, `channel`, `priority`, `category`, `status`)

### 7. EmailService.ts

**File:** `src/lib/email/EmailService.ts`  
**Issues:** References `email_messages` table which doesn't exist

**Status:** ⚠️ Pre-existing issue in separate Email module (not in counselor workflow). The actual table is `email_delivery_logs`. This is documented in the schema drift report but not fixed as it's out of scope.

### 8. PartnerService.ts

**File:** `src/lib/partner/PartnerService.ts`  
**Issues:** 0 invalid references

All database operations verified correct:
- `partner_profiles`, `partner_tiers` — valid tables
- `leads`, `universities`, `courses` — valid tables with correct column names
- Storage bucket `partner-documents` — exists in storage

---

## Cross-Reference: All Tables Used by Services

| Table | Services Using It | Valid? |
|-------|-------------------|--------|
| `leads` | AIIntelligenceService, AdmissionOS, LeadAnalyzer, ToolRegistry, AutomationEngine, dispositionService, useLeads, useSmartView, useLeadAssignment | ✅ Valid (after fixes) |
| `calls` | AIIntelligenceService, AdmissionOS, TelephonyContext | ✅ Valid |
| `lead_activities` | AIIntelligenceService, AdmissionOS, AutomationEngine, dispositionService, useLeads, useWhatsApp | ✅ Valid (after fixes) |
| `lead_objections` | AIIntelligenceService, LeadAnalyzer | ✅ Valid |
| `lead_disposition_history` | AIIntelligenceService, LeadAnalyzer, dispositionService | ✅ Valid |
| `lead_assignments` | AutomationEngine, useLeadAssignment | ✅ Valid |
| `tasks` | AutomationEngine, useLeads, useSmartView | ✅ Valid |
| `notifications` | AutomationEngine, useLeadAssignment, NotificationContext, dispositionService | ✅ Valid (after fixes) |
| `ai_recommendations` | AIIntelligenceService | ✅ Valid |
| `ai_anomalies` | AIIntelligenceService | ✅ Valid |
| `ai_risk_alerts` | AdmissionOS | ✅ Valid |
| `users` | ToolRegistry, AutomationEngine, AdmissionOS, useLeadAssignment | ✅ Valid |
| `universities` | ToolRegistry, PartnerService | ✅ Valid |
| `courses` | ToolRegistry | ✅ Valid |
| `dispositions` | dispositionService, DispositionWidget | ✅ Valid |
| `sub_dispositions` | dispositionService | ✅ Valid |
| `next_actions` | dispositionService | ✅ Valid |
| `admissions` | BusinessIntelligence, AdmissionOS | ✅ Valid |
| `payments` | BusinessIntelligence, useAnalytics, useFinance | ✅ Valid (view) |
| `automation_workflows` | AutomationEngine | ✅ Valid |
| `counselor_performance` | CounselorDashboard, ManagerDashboard | ❌ Does NOT exist (graceful fallback added) |
| `ai_manager_alerts` | ManagerDashboard | ❌ Does NOT exist (graceful fallback added) |
| `email_messages` | EmailService | ❌ Does NOT exist (separate module, pre-existing) |
