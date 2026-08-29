# Email Module Audit Report

## Overview

**File audited:** `src/lib/email/EmailService.ts`  
**Tables referenced:** `email_messages` (does NOT exist), `email_delivery_logs` (exists)  
**Components using EmailService:** Unknown (module-level class, not exported to UI)  
**Status:** DEAD MODULE — No UI component imports or uses EmailService

---

## 1. Does the `email_messages` table exist?

**NO.** The `email_messages` table does NOT exist in the database.

**Actual email-related tables that DO exist:**

| Table | Purpose |
|-------|---------|
| `email_accounts` | Email account configurations (providers, credentials) |
| `email_campaigns` | Campaign templates and scheduling |
| `email_attachments` | Email attachment storage |
| `email_delivery_logs` | Log of email delivery attempts and statuses |

**The `email_messages` table was likely removed or never created.** The codebase still references it in multiple locations.

---

## 2. EmailService.ts — Full Inventory

### Constructor / Configuration
| Line | Operation | Details |
|------|-----------|---------|
| 42 | `this.config` | Reads from `organization_settings` table: `email_provider`, `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `from_email`, `from_name` |
| 46 | `this.demoMode` | Boolean — true when no provider configured |
| 53-56 | `this.provider` | Instantiates `SmtpProvider` for SMTP, falls through to demo mode |

### Methods
| Line | Method | Operation | Table Used | Status |
|------|--------|-----------|------------|--------|
| 57-74 | `sendEmail` | Insert email record | `email_messages` | ❌ DEAD — table doesn't exist |
| 100-145 | `processQueue` | Update messages, process delivery | `email_messages` | ❌ DEAD — table doesn't exist |
| 148-169 | `getEmailStatus` | Get status | `email_messages` | ❌ DEAD — table doesn't exist |
| 173-190 | `markAsSent` | Update status | `email_messages` | ❌ DEAD — table doesn't exist |
| 193-200 | `getDrafts` | Get drafts | `email_messages` | ❌ DEAD — table doesn't exist |
| 203-210 | `getSent` | Get sent emails | `email_messages` | ❌ DEAD — table doesn't exist |
| 214-230 | `getTemplates` | Get templates | `email_templates` (doesn't exist) + `email_campaigns` | ❌ DEAD |
| 233-245 | `createTemplate` | Create template | `email_templates` (doesn't exist) | ❌ DEAD |

### Columns Referenced on `email_messages` (all invalid):
- `id`, `to_address`, `from_address`, `subject`, `html_content`, `text_content`, `status`, `scheduled_at`, `sent_at`, `error_message`, `delivery_log`
- Actual table has NO corresponding columns (table doesn't exist at all)

### Columns Referenced on `email_templates` (also doesn't exist):
- `id`, `name`, `subject_template`, `html_template`, `text_template`, `is_active`

### Insert operations (lines 57-74, `sendEmail`):
```typescript
await supabase.from('email_messages').insert({
  to_address: to,
  from_address: from,
  status: 'queued',
  sent_at: null,
})
```
This will FAIL at runtime with a table-not-found error.

### Update operations (lines 100-145, `processQueue`):
```typescript
await supabase.from('email_messages')
  .update({ status: 'sent', sent_at: new Date().toISOString() })
  .eq('status', 'processing')
```
This will also FAIL.

### Demo mode (lines 130-140):
When `this.demoMode = true`, the service:
- Sets email status to 'sent' immediately (line 131)
- After 5 seconds, sets to 'opened' (simulated)

### `email_delivery_logs` — the real email tracking table:
| Column | Purpose |
|--------|---------|
| `provider_message_id` | Provider's message ID |
| `provider` | Sending provider name |
| `status` | Delivery status |
| `error_message` | Error if failed |
| `provider_timestamp` | When provider reported |
| `created_at` | When logged in our system |

EmailService.ts does NOT use `email_delivery_logs` at all.

---

## 3. Which Components Call EmailService?

**Zero components import or use EmailService.**

```bash
grep -rn "EmailService" src/
```
Only results:
- `src/lib/email/EmailService.ts` — definition
- `src/lib/email/EmailService.ts` — self-references

No component, hook, or context in the entire `src/` directory imports `EmailService` or calls any of its methods. The EmailService class is:

1. Never instantiated in any component
2. Never imported by any UI file
3. Never referenced by any routing
4. Never used in any context provider

**Conclusion: EmailService.ts is a completely dead module.** It was likely a future feature planned but never integrated into the UI. The email-related UI components (`EmailCenter.tsx`, `EmailComposer.tsx`, `LeadEmailTab.tsx`, `CommunicationCenter.tsx`) have ALL been removed from the codebase, and `src/hooks/useEmail.ts` has also been removed.

---

## 4. Email-Related UI Components

The following email UI components were previously listed in the task info but have been REMOVED:

| File | Status |
|------|--------|
| `src/components/email/EmailCenter.tsx` | DELETED |
| `src/components/email/EmailComposer.tsx` | DELETED |
| `src/components/email/LeadEmailTab.tsx` | DELETED |
| `src/hooks/useEmail.ts` | DELETED |

**Evidence:** These files return "File not found" when accessed. The email feature was removed from the UI entirely.

---

## 5. Email Provider Integration

### Existing Provider Structure
```
src/lib/email/
  EmailService.ts      — Main service (DEAD — uses non-existent table)
  providers/
    SmtpProvider.ts    — SMTP provider implementation
    MockEmailProvider.ts — Mock provider (if exists, need to verify)
```

### SMTP Provider (`SmtpProvider.ts`)
| Line | Method | Details |
|------|--------|---------|
| 14 | `sendEmail` | Calls `nodemailer` or similar |
| 20+ | — | Implementation details unclear |

### Organization Settings for Email
The `organization_settings` table has columns: `email_provider`, `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `from_email`, `from_name`

These CAN be used to configure email, but EmailService.py never successfully uses them because it writes to the non-existent `email_messages` table.

---

## 6. Is There an Existing email_messages Alternative?

**YES:** The `email_delivery_logs` table exists and tracks delivery. However:

- It only tracks delivery status (not message content, drafts, or templates)
- It has no `email_accounts` relationship for multi-account support
- EmailService.ts never references it

**No direct migration path exists** from `email_messages` concept to `email_delivery_logs` without creating a proper email message table.

---

## 7. Is the Email Module Dead/Unused/Partial?

| Question | Answer | Evidence |
|----------|--------|----------|
| Is the `email_messages` table used? | No | Table doesn't exist in DB |
| Is EmailService imported anywhere? | No | Zero imports in src/ |
| Is there email UI? | No | All email components deleted |
| Can the module be safely removed? | YES | Completely dead code |
| Should a replacement be created? | NO | No UI requires it |
| Are email delivery logs used? | Potentially | `email_delivery_logs` table exists but may not be written to |

---

## 8. Production Impact

| Impact | Severity | Details |
|--------|----------|---------|
| Runtime errors from EmailService | NONE (dead code) | Module is never imported |
| Email functionality unavailable | LOW | No UI for sending emails exists |
| Email tracking | LOW-MEDIUM | `email_delivery_logs` exists but may not be populated by any code |
| Mock email provider | NONE (dead code) | Only used within dead EmailService module |

---

## 9. Data Flow Analysis

The intended email flow was:

```
EmailService.sendEmail()
  → INSERT INTO email_messages (to_address, from_address, status: 'queued')
  → processQueue()
    → SELECT * FROM email_messages WHERE status = 'queued'
    → Send via provider (SMTP, SendGrid, etc.)
    → UPDATE email_messages SET status = 'sent'
    → INSERT INTO email_delivery_logs (provider, status, provider_message_id)
```

Since `email_messages` doesn't exist, the entire flow breaks at the first INSERT.

---

## 10. Recommendation

**Action:** DELETE `src/lib/email/EmailService.ts` and `src/lib/email/providers/SmtpProvider.ts`

**Reason:** The module is completely dead code — no UI imports it, no service uses it, and it references a non-existent database table. The email feature was fully removed from the UI (all components deleted), but the service layer was left behind.

**Alternative:** If email functionality needs to be restored in the future:

1. Create a proper `email_messages` table (NOT the same as `email_delivery_logs`)
2. Implement EmailService to use valid Supabase columns
3. Build UI components and wire them into the router
4. Set up actual email provider integration (SendGrid, SMTP, etc.)

**Do NOT:**
- Create a fake `email_messages` table just to make EmailService.ts compile
- Create placeholder RPCs
- Add mock email sending to hide the missing table

The module should either be fully removed or properly re-implemented — there is no safe middle ground.
