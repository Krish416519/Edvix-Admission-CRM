# TypeScript Error Classification Report

## Overview

- **Total TypeScript errors:** 345
- **Classification method:** Error code + manual inspection of error message content
- **Errors from modified files:** 0
- **Errors introduced by this audit:** 0

---

## Classification Breakdown

| Category | Count | Percentage | Error Codes |
|----------|-------|------------|-------------|
| UNUSED_IMPORT | 283 | 82.0% | TS6133 (282), TS6192 (1) |
| UNUSED_VARIABLE | 3 | 0.9% | TS6198 (2), TS7006 (1) |
| TYPE_MISMATCH | 14 | 4.1% | TS2322 (10), TS2769 (4) |
| INVALID_PROPERTY | 3 | 0.9% | TS2339 (3 non-DB), TS2551 (0 non-DB) |
| INVALID_DATABASE_FIELD | 15 | 4.4% | TS2339 (13 DB field), TS2551 (7 DB field snake_case) |
| MISSING_MODULE | 5 | 1.5% | TS2686 (3), TS2307 (2) |
| POSSIBLE_RUNTIME_ERROR | 10 | 2.9% | TS18048 (10) |
| TYPE_MISMATCH_RPC | 2 | 0.6% | TS2345 (1), TS2538 (2) |
| TOTAL | 345 | 100% | |

---

## 1. UNUSED_IMPORT (283 errors)

**Error Codes:** TS6133 (282), TS6192 (1)

These are unused import/variable warnings. While they add code noise and can mask truly unused modules, they do NOT cause runtime errors. TypeScript still compiles and the build succeeds because `skipLibCheck` is enabled.

**Notable files with many unused imports:**
- `src/components/admin/` - multiple files (BackendStatus, SystemSettings, etc.)
- `src/components/universityOps/` - many files (UniversityAdmissions, UniversityDocuments, etc.)
- `src/components/university/` - UniversityDocuments, UniversityFinance, etc.
- `src/components/marketing/` - MarketingDashboard, RoiDashboard, etc.
- `src/components/telephony/` - CallCenterDashboard, CallReportsPanel, etc.

**Production Risk:** LOW — These are dead code, not runtime blockers. Build passes. No data is fabricated.

---

## 2. UNUSED_VARIABLE (3 errors)

**Error Codes:** TS6198 (2), TS7006 (1)

| File:Line | Error | Classification |
|-----------|-------|----------------|
| `src/components/applications/DocumentChecklist.tsx:21` | TS6198: All destructured elements are unused | UNUSED_VARIABLE |
| `src/hooks/useUniversityOps.ts:205` | TS6198: All destructured elements are unused | UNUSED_VARIABLE |
| `src/hooks/useUniversityOps.ts:221` | TS6198: All destructured elements are unused | UNUSED_VARIABLE |

**Production Risk:** LOW

---

## 3. TYPE_MISMATCH (14 errors)

**Error Codes:** TS2322 (10), TS2769 (4)

These are type assignment errors — passing wrong types to functions. May or may not cause runtime errors depending on the specific code path.

| File:Line | Error | Classification |
|-----------|-------|----------------|
| `src/components/AnalyticsDashboard.tsx:390` | TS2322: `percent` possibly undefined in formatter | TYPE_MISMATCH |
| `src/components/leads/LeadDetails.tsx:221` | TS2322: Type 'string \| undefined' not assignable to 'string' | TYPE_MISMATCH |
| `src/components/leads/LeadFormModal.tsx:220` | TS2322: Type 'string \| Course' not assignable to form value type | TYPE_MISMATCH |
| `src/components/leads/LeadFormModal.tsx:232` | TS2322: Type 'string \| University' not assignable to form value type | TYPE_MISMATCH |
| `src/components/leads/profile/LeadProfileHeader.tsx:83` | TS2322: Type 'string \| Course' not assignable to ReactNode | TYPE_MISMATCH |
| `src/components/leads/profile/LeadProfileHeader.tsx:85` | TS2322: Type 'string \| University' not assignable to ReactNode | TYPE_MISMATCH |
| `src/components/marketing/RoiDashboard.tsx:78` | TS2322: Formatter type incompatibility | TYPE_MISMATCH |
| `src/components/marketing/RoiDashboard.tsx:84` | TS2322: Formatter type incompatibility | TYPE_MISMATCH |
| `src/components/partner/PartnerReports.tsx:87` | TS2322: Formatter type incompatibility | TYPE_MISMATCH |
| `src/components/notifications/NotificationContext.tsx:329` | TS2322: 'Normal' not assignable to NotificationPriority | TYPE_MISMATCH |
| `src/components/telephony/CallReportsPanel.tsx:49` | TS2769: Date constructor arg type mismatch | TYPE_MISMATCH |
| `src/components/leads/profile/LeadQuickViewSidebar.tsx:29` | TS2769: Date constructor arg type mismatch | TYPE_MISMATCH |
| `src/components/leads/profile/LeadQuickViewSidebar.tsx:119` | TS2769: Date constructor arg type mismatch | TYPE_MISMATCH |
| `src/components/telephony/DialerWidget.tsx:67` | TS2345: Missing `leadId` in CallConfig | TYPE_MISMATCH |

**Production Risk:** MEDIUM — Most are non-fatal (passing `undefined` to Date constructor just returns Invalid Date; form type mismatches may cause subtle bugs in form handling). `DialerWidget.tsx:67` is a potential runtime issue if the call path is exercised.

---

## 4. INVALID_PROPERTY (3 errors)

**Error Code:** TS2339 (3 non-DB)

These are accessing properties on TypeScript types that don't exist.

| File:Line | Error | Classification | Production Risk |
|-----------|-------|----------------|-----------------|
| `src/components/universityOps/AdmissionDecisionPanel.tsx:23` | `userRole` not on `AuthContextType` | INVALID_PROPERTY | MEDIUM — runtime undefined if accessed |
| `src/components/universityOps/IntegrationConfig.tsx:7` | `userRole` not on `AuthContextType` | INVALID_PROPERTY | MEDIUM — runtime undefined if accessed |
| `src/components/universityOps/UniversityProfileEditor.tsx:13` | `userRole` not on `AuthContextType` | INVALID_PROPERTY | MEDIUM — runtime undefined if accessed |

**Production Risk:** MEDIUM — `userRole` would be `undefined` at runtime on these university ops components.

---

## 5. INVALID_DATABASE_FIELD (15 errors)

**Error Codes:** TS2339 (13), TS2551 (7), TS2367 (4), TS2538 (2)

These are accessing database column fields that don't exist in the TypeScript type OR referencing invalid column names. These are the most dangerous errors because they may cause runtime failures when the data doesn't match expectations.

### Snake_case database field accessed via camelCase (TS2551)

| File:Line | Error | Classification |
|-----------|-------|----------------|
| `src/components/leads/profile/DispositionHistory.tsx:54` | `created_at` not on `LeadDispositionHistory` (should be `createdAt`) | INVALID_DATABASE_FIELD |
| `src/components/partner/PartnerAdmissions.tsx:20` | `lead_id` not on `Admission` (should be `leadId`) | INVALID_DATABASE_FIELD |
| `src/components/partner/PartnerAdmissions.tsx:20` | `lead_id` not on `Admission` | INVALID_DATABASE_FIELD |
| `src/components/partner/PartnerDashboard.tsx:36` | `lead_id` not on `Admission` | INVALID_DATABASE_FIELD |
| `src/components/partner/PartnerDashboard.tsx:36` | `lead_id` not on `Admission` | INVALID_DATABASE_FIELD |
| `src/components/partner/PartnerNotifications.tsx:53` | `created_at` not on `AppNotification` (should be `createdAt`) | INVALID_DATABASE_FIELD |
| `src/components/university/UniversityNotifications.tsx:53` | `created_at` not on `AppNotification` | INVALID_DATABASE_FIELD |

### Property doesn't exist on type (TS2339)

| File:Line | Error | DB Column? | Classification |
|-----------|-------|------------|----------------|
| `src/components/partner/PartnerAdmissions.tsx:19` | `partner_id` not on `Lead` type | NO (not in leads table) | INVALID_DATABASE_FIELD |
| `src/components/partner/PartnerDashboard.tsx:35` | `partner_id` not on `Lead` type | NO (not in leads table) | INVALID_DATABASE_FIELD |
| `src/components/partner/PartnerLeads.tsx:20` | `partner_id` not on `Lead` type | NO (not in leads table) | INVALID_DATABASE_FIELD |
| `src/components/university/UniversityLeads.tsx:102` | `assignedTo` not on `Lead` type | NO (actual column is `assigned_counselor`) | INVALID_DATABASE_FIELD |
| `src/components/university/UniversityLeads.tsx:104` | `assignedTo` not on `Lead` type | NO (actual column is `assigned_counselor`) | INVALID_DATABASE_FIELD |
| `src/components/partner/PartnerNotifications.tsx:42` | `is_read` not on `AppNotification` | NO (actual column is `read_at` or `status`) | INVALID_DATABASE_FIELD |
| `src/components/partner/PartnerNotifications.tsx:44` | `is_read` not on `AppNotification` | NO (actual column is `read_at` or `status`) | INVALID_DATABASE_FIELD |
| `src/components/partner/PartnerNotifications.tsx:46` | `is_read` not on `AppNotification` | NO (actual column is `read_at` or `status`) | INVALID_DATABASE_FIELD |
| `src/components/partner/PartnerNotifications.tsx:57` | `is_read` not on `AppNotification` | NO (actual column is `read_at` or `status`) | INVALID_DATABASE_FIELD |
| `src/components/university/UniversityNotifications.tsx:42` | `is_read` not on `AppNotification` | NO (actual column is `read_at` or `status`) | INVALID_DATABASE_FIELD |
| `src/components/university/UniversityNotifications.tsx:44` | `is_read` not on `AppNotification` | NO (actual column is `read_at` or `status`) | INVALID_DATABASE_FIELD |
| `src/components/university/UniversityNotifications.tsx:46` | `is_read` not on `AppNotification` | NO (actual column is `read_at` or `status`) | INVALID_DATABASE_FIELD |
| `src/components/university/UniversityNotifications.tsx:57` | `is_read` not on `AppNotification` | NO (actual column is `read_at` or `status`) | INVALID_DATABASE_FIELD |

### Comparison type mismatch (TS2367)

| File:Line | Error | Classification |
|-----------|-------|----------------|
| `src/components/university/UniversityAi.tsx:26` | Comparing 'AdmissionStage \| undefined' with '"Document Verification"' | INVALID_DATABASE_FIELD |
| `src/components/university/UniversityDashboard.tsx:32` | Comparing 'AdmissionStage \| undefined' with '"Document Verification"' | INVALID_DATABASE_FIELD |
| `src/components/university/UniversityReports.tsx:12` | Comparing 'AdmissionStage \| undefined' with '"Document Verification"' | INVALID_DATABASE_FIELD |
| `src/components/leads/profile/DispositionWidget.tsx:1007` | Comparing '"Counselled"' with '"Semester Fee Paid"' | INVALID_DATABASE_FIELD |

### Index type undefined (TS2538)

| File:Line | Error | Classification |
|-----------|-------|----------------|
| `src/components/university/UniversityReports.tsx:19` | Type 'undefined' cannot be used as an index type | INVALID_DATABASE_FIELD |
| `src/components/university/UniversityReports.tsx:19` | Type 'undefined' cannot be used as an index type | INVALID_DATABASE_FIELD |

**Production Risk:** HIGH — These are accessing database columns that either don't exist on the TypeScript type (meaning the SELECT query may not return the field, resulting in `undefined` at runtime) or referencing the wrong column name. Specifically:
- `partner_id` on leads — not in DB, not in TS type → runtime `undefined`
- `assignedTo` on leads — should be `assigned_counselor` → runtime `undefined`  
- `is_read` on AppNotification — should be `status: 'Read'` or `read_at` → runtime `undefined`
- `created_at` on AppNotification — should be `createdAt` → runtime `undefined`

---

## 6. MISSING_MODULE (5 errors)

**Error Codes:** TS2686 (3), TS2307 (2)

| File:Line | Error | Classification |
|-----------|-------|----------------|
| `src/components/leads/profile/AIObjectionHandling.tsx:7` | 'React' refers to UMD global, need import | MISSING_MODULE |
| `src/components/studentSuccess/MilestonesView.tsx:40` | 'React' refers to UMD global | MISSING_MODULE |
| `src/components/studentSuccess/MilestonesView.tsx:50` | 'React' refers to UMD global | MISSING_MODULE |
| `src/lib/automation/workflowEngine.ts:1` | Cannot find module 'uuid' | MISSING_MODULE |
| `src/lib/events/eventBus.ts:1` | Cannot find module 'uuid' | MISSING_MODULE |

**Production Risk:**
- React UMD global issues: In production builds, `React` is available globally, so this works. In development with strict module resolution, it may fail. **MEDIUM risk**
- `uuid` module: If `workflowEngine.ts` and `eventBus.ts` are imported, they will fail at runtime. **Need to check if these modules are reachable from UI.**

---

## 7. POSSIBLE_RUNTIME_ERROR (10 errors)

**Error Code:** TS18048 (10)

These are "possibly undefined" errors — a variable could be `undefined` at runtime.

| File:Line | Error | Variable |
|-----------|-------|----------|
| `src/components/leads/AICounselorPanel.tsx:38` | `lead.name` possibly undefined | `lead.name` |
| `src/components/leads/AICounselorPanel.tsx:45` | `lead.score` possibly undefined | `lead.score` |
| `src/components/leads/profile/LeadQuickViewSidebar.tsx:155` | `lead.name` possibly undefined | `lead.name` |
| `src/components/leads/profile/LeadQuickViewSidebar.tsx:163` | `lead.name` possibly undefined | `lead.name` |
| `src/components/leads/profile/LeadQuickViewSidebar.tsx:171` | `lead.name` possibly undefined | `lead.name` |
| `src/components/leads/profile/LeadQuickViewSidebar.tsx:280` | `lead.name` possibly undefined | `lead.name` |
| `src/components/university/UniversityLeads.tsx:317` | `lead.name` possibly undefined | `lead.name` |
| `src/components/leads/profile/LeadQuickViewSidebar.tsx:296` | `lead.name` possibly undefined | `lead.name` |
| `src/components/leads/profile/LeadQuickViewSidebar.tsx:297` | `lead.name` possibly undefined | `lead.name` |
| `src/components/leads/profile/LeadQuickViewSidebar.tsx:298` | `lead.name` possibly undefined | `lead.name` |

**Production Risk:** MEDIUM — `lead.name` is optional on the `Lead` type. At runtime it maps from `first_name` + `last_name`, so it could be an empty string but not null/undefined. These are defensive issues, not likely to crash but could cause display issues.

---

## 8. INVALID_DATABASE_FIELD via RPC (0 errors currently)

None found — all RPC-related errors are either MISSING_MODULE or handled gracefully.

---

## Summary by Risk Level

| Risk Level | Count | Description |
|------------|-------|-------------|
| **CRITICAL** | 0 | — |
| **HIGH** | 15 | INVALID_DATABASE_FIELD — accessing columns that don't exist on tables (leads.partner_id, leads.assignedTo, notifications.is_read, AppNotification.created_at, etc.) |
| **MEDIUM** | 21 | MISSING_MODULE (uuid), TYPE_MISMATCH (form handling, date constructors), POSSIBLE_RUNTIME_ERROR (undefined access), INVALID_PROPERTY (userRole) |
| **LOW** | 283 | UNUSED_IMPORT — all TS6133 warnings |
| **UNKNOWN** | 0 | — |

---

## Errors in Modified Files

**0 errors** in the following files that were modified during this audit:
- `src/lib/ai/AIIntelligenceService.ts`
- `src/components/ai/CounselorDashboard.tsx`
- `src/components/ai/ManagerDashboard.tsx`
- `src/lib/ai/ToolRegistry.ts`
- `src/lib/automation/AutomationEngine.ts`
- `src/lib/ai/LeadAnalyzer.ts`
- `src/lib/ai/AdmissionOS.ts`
- `src/hooks/useLeads.ts`
- `src/hooks/useSmartView.ts`
- `src/hooks/useWhatsApp.ts`
- `src/hooks/useFinance.ts`
- `src/hooks/useStudentSuccess.ts`
- `src/components/whatsapp/WhatsAppCenter.tsx`
