# BI RPC Audit Report

## Overview

7 `get_bi_*` RPC functions are called by frontend components but do NOT exist in the database.

| RPC | Caller | UI Module | Exists? |
|-----|--------|-----------|---------|
| `get_bi_revenue_forecast` | `RevenueAnalytics.tsx:22` | Revenue Analytics (BI module) | ❌ NO |
| `get_bi_at_risk_revenue` | `RevenueAnalytics.tsx:23` | Revenue Analytics (BI module) | ❌ NO |
| `get_bi_counselor_performance` | `AIIntelligenceService.ts:360`, `PerformanceAnalytics.tsx:22` | BI Performance Analytics | ❌ NO |
| `get_bi_source_performance` | `AIIntelligenceService.ts:346`, `AIIntelligenceService.ts:360`, `PerformanceAnalytics.tsx:26` | BI Performance Analytics | ❌ NO |
| `get_bi_funnel_leakage` | `FunnelAnalytics.tsx:21` | BI Funnel Analytics | ❌ NO |
| `get_bi_executive_summary` | `ExecutiveDashboard.tsx:24` | BI Executive Dashboard | ❌ NO |
| `get_bi_anomaly_detection` | `ExecutiveDashboard.tsx:35` | BI Executive Dashboard | ❌ NO |

---

## Detailed Analysis

### 1. get_bi_revenue_forecast

**Caller:** `src/components/bi/RevenueAnalytics.tsx:22`  
```typescript
supabase.rpc('get_bi_revenue_forecast', { p_days: 30 })
```

**UI Module:** Revenue Analytics page (`/app/bi/revenue` or via AI Dashboard link)  
**Production Impact:** HIGH — Revenue forecasting is business-critical for financial planning  
**Underlying Tables Available:** `payments` (view), `payment_installments`, `invoice_items`, `admissions`, `organizations`, `roles`  
**Required Inputs:** `p_days integer` (forecast horizon in days)  
**Expected Output:** Revenue forecast by date/department with confidence intervals  
**Exists:** ❌ NO  
**Working:** NO — will throw PGRST202 (function doesn't exist)  
**Safe To Implement:** ✅ YES — All required data exists in `payments`, `payment_installments`, and `invoice_items`  
**Recommended Action:** Create RPC with revenue trend analysis. Can compute from historical payment dates and amounts.

### 2. get_bi_at_risk_revenue

**Caller:** `src/components/bi/RevenueAnalytics.tsx:23`  
```typescript
supabase.rpc('get_bi_at_risk_revenue')
```

**UI Module:** Revenue Analytics page  
**Production Impact:** HIGH — At-risk revenue identification is critical for collections  
**Underlying Tables Available:** `payments` (view), `payment_installments`, `invoice_items`, `leads`, `admissions`  
**Required Inputs:** None  
**Expected Output:** List of at-risk payments with amounts, due dates, and risk factors  
**Exists:** ❌ NO  
**Working:** NO  
**Safe To Implement:** ✅ YES — Can identify overdue installments from `payment_installments.due_date` and `payment_installments.status`  
**Recommended Action:** Create RPC to find overdue/unpaid installments where `due_date < now()` and status != 'Paid'.

### 3. get_bi_counselor_performance

**Caller:** `src/lib/ai/AIIntelligenceService.ts:360`, `src/components/bi/PerformanceAnalytics.tsx:22`  
```typescript
supabase.rpc('get_bi_counselor_performance')
```

**UI Module:** BI Performance Analytics page  
**Production Impact:** HIGH — Counselor productivity metrics are management-critical  
**Underlying Tables Available:** `leads`, `calls`, `lead_activities`, `tasks`, `lead_disposition_history`, `lead_assignments`, `users`  
**Required Inputs:** None (may accept optional `p_user_id` or `p_date_range`)  
**Expected Output:** Per-counselor metrics: calls, conversions, lead scores, disposition rates  
**Exists:** ❌ NO  
**Working:** NO  
**Safe To Implement:** ✅ YES — All required data exists. Can compute from `calls.counselor_id`, `leads.assigned_counselor`, `tasks.assigned_user`, and `lead_disposition_history.created_by`.  
**Recommended Action:** Create RPC aggregating per-counselor metrics from calls, activities, and dispositions.

### 4. get_bi_source_performance

**Caller:** `src/lib/ai/AIIntelligenceService.ts:346`, `src/components/bi/PerformanceAnalytics.tsx:26`  
```typescript
supabase.rpc('get_bi_source_performance')
```

**UI Module:** BI Performance Analytics page, AI Intelligence Service  
**Production Impact:** MEDIUM — Lead source performance helps optimize marketing spend  
**Underlying Tables Available:** `leads` (has `lead_source` column), `lead_sources`, `payments`  
**Required Inputs:** None (may accept optional date range)  
**Expected Output:** Per-source metrics: volume, conversion rate, revenue, cost  
**Exists:** ❌ NO  
**Working:** NO  
**Safe To Implement:** ✅ YES — `leads.lead_source` and `payments` both have sufficient data.  
**Recommended Action:** Create RPC aggregating per-lead-source performance metrics.

### 5. get_bi_funnel_leakage

**Caller:** `src/components/bi/FunnelAnalytics.tsx:21`  
```typescript
supabase.rpc('get_bi_funnel_leakage', {
  p_start_date: ...,
  p_end_date: ...,
})
```

**UI Module:** BI Funnel Analytics page  
**Production Impact:** MEDIUM — Funnel analysis helps identify conversion bottlenecks  
**Underlying Tables Available:** `leads` (has `lead_status`, `conversion_probability`), `lead_disposition_history`, `admissions`  
**Required Inputs:** `p_start_date`, `p_end_date` (date range)  
**Expected Output:** Funnel stages with drop-off rates between stages  
**Exists:** ❌ NO  
**Working:** NO  
**Safe To Implement:** ✅ YES — Can compute lead flow through `lead_status` transitions using `lead_disposition_history` and `admissions` conversion data.  
**Recommended Action:** Create RPC computing funnel conversion at each stage.

### 6. get_bi_executive_summary

**Caller:** `src/components/bi/ExecutiveDashboard.tsx:24`  
```typescript
supabase.rpc('get_bi_executive_summary', {
  p_start_date: ...,
  p_end_date: ...,
})
```

**UI Module:** BI Executive Dashboard page  
**Production Impact:** HIGH — Executive summary is the top-level view for leadership  
**Underlying Tables Available:** `leads`, `admissions`, `payments`, `calls`, `lead_activities`, `tasks`, `organizations`  
**Required Inputs:** `p_start_date`, `p_end_date` (date range)  
**Expected Output:** Executive KPIs: total leads, revenue, conversion rate, active counselors, risk alerts  
**Exists:** ❌ NO  
**Working:** NO  
**Safe To Implement:** ✅ YES — All data sources exist. Can aggregate from 7+ tables.  
**Recommended Action:** Create RPC returning executive summary with KPIs.

### 7. get_bi_anomaly_detection

**Caller:** `src/components/bi/ExecutiveDashboard.tsx:35`  
```typescript
supabase.rpc('get_bi_anomaly_detection')
```

**UI Module:** BI Executive Dashboard page (anomaly section)  
**Production Impact:** MEDIUM — Anomaly detection helps catch data issues and performance problems  
**Underlying Tables Available:** `ai_anomalies` table exists with columns: `id`, `anomaly_type`, `severity`, `title`, `description`, `entity_type`, `entity_id`, `entity_name`, `details`, `resolved_by`, `resolved_at`, `created_at`, `updated_at`, `is_resolved`  
**Required Inputs:** None  
**Expected Output:** List of unresolved anomalies with severity and descriptions  
**Exists:** ❌ NO  
**Working:** NO  
**Safe To Implement:** ✅ YES — The `ai_anomalies` table already exists with all required columns. The RPC can be a simple SELECT.  
**Recommended Action:** Create RPC selecting from `ai_anomalies` where `resolved_at IS NULL`.

---

## Summary Table

| RPC | Exists? | Production Critical? | Safe To Implement | Recommended Action |
|-----|---------|---------------------|-------------------|---------------------|
| `get_bi_revenue_forecast` | ❌ | YES | ✅ YES | Create from `payments` data |
| `get_bi_at_risk_revenue` | ❌ | YES | ✅ YES | Create from `payment_installments` |
| `get_bi_counselor_performance` | ❌ | YES | ✅ YES | Create from `calls`, `leads`, `tasks` |
| `get_bi_source_performance` | ❌ | MEDIUM | ✅ YES | Create from `leads.lead_source` |
| `get_bi_funnel_leakage` | ❌ | MEDIUM | ✅ YES | Create from `lead_disposition_history` |
| `get_bi_executive_summary` | ❌ | YES | ✅ YES | Create from 7+ tables |
| `get_bi_anomaly_detection` | ❌ | MEDIUM | ✅ YES | Simple SELECT from `ai_anomalies` |

## Note on BI Dashboard Data Flow

The BI module dashboards (`ExecutiveDashboard.tsx`, `RevenueAnalytics.tsx`, `PerformanceAnalytics.tsx`, `FunnelAnalytics.tsx`) DO attempt to call these RPCs. When the RPC fails, they:

1. **ExecutiveDashboard.tsx**: Falls back to hardcoded mock data showing revenue of ₹24.5M, conversion rate, and 3 alerts
2. **RevenueAnalytics.tsx**: Shows error message "Failed to load data" — no mock fallback
3. **PerformanceAnalytics.tsx**: Falls back to empty arrays — no data displayed
4. **FunnelAnalytics.tsx**: Falls back to empty arrays — no data displayed

This means 100% of live BI functionality is currently broken, with ExecutiveDashboard showing misleading fabricated data.

## Recommended Implementation Priority

1. **`get_bi_anomaly_detection`** (LOWEST complexity — simple SELECT from existing table)
2. **`get_bi_source_performance`** (Medium — aggregate from leads + payments)
3. **`get_bi_counselor_performance`** (Medium — aggregate from calls + tasks + dispositions)
4. **`get_bi_at_risk_revenue`** (Medium — simple overdue payment query)
5. **`get_bi_funnel_leakage`** (Medium — stage transition analysis)
6. **`get_bi_revenue_forecast`** (High — requires trend analysis)
7. **`get_bi_executive_summary`** (Highest complexity — aggregates from 7+ tables)
