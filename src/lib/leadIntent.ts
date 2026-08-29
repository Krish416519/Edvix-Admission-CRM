import { Lead } from '../types/schema';

export type IntentLevel = 'HOT' | 'WARM' | 'COLD';

/**
 * Canonical intent computation used across the CRM.
 *
 * Intent is derived from TWO sources:
 * 1. `lead.urgency` — manually set counselor urgency (Immediate, High, Medium, Low)
 * 2. `lead.lead_status` — pipeline stage set by disposition target_status
 *
 * Disposition target_status values and their intent mapping:
 * - "Hot" → HOT       (Counselled, Interested, Follow-up Offer, Fee Issue, etc.)
 * - "Warm" → WARM     (Follow Up, Wants More Information, Payout Concern, etc.)
 * - "Cold" → COLD     (Call Back Requested)
 * - "Qualified" → HOT (Meeting Done, Qualified Partner)
 * - "Application" → HOT (Registration Done, Onboarding Started)
 * - "Docs Pending" → WARM (Document Collected, Documents Pending)
 * - "Admitted" → HOT (Semester Fee Paid, Partner Activated)
 * - "Not Connected" → COLD (Switched Off, Not Reachable, etc.)
 * - "Rejected" → COLD (Not Interested, Invalid Number, Lost, Wrong Number)
 *
 * Urgency overrides provide finer control:
 * - "Immediate" → HOT (regardless of status)
 * - "High" → WARM (unless status already qualifies as HOT)
 */
export function computeIntent(lead: Lead): IntentLevel {
  const urgency = lead.urgency?.toLowerCase();
  const status = (lead.leadStatus || lead.status || '').toLowerCase();

  // HOT: immediate urgency or high-intent pipeline stages
  if (
    urgency === 'immediate' ||
    status === 'hot' ||
    status === 'qualified' ||
    status === 'admitted' ||
    status.includes('application')
  ) {
    return 'HOT';
  }

  // WARM: high urgency or medium-intent pipeline stages
  if (
    urgency === 'high' ||
    status === 'warm' ||
    status === 'interested' ||
    status === 'connected' ||
    status === 'docs pending'
  ) {
    return 'WARM';
  }

  // Everything else is COLD
  return 'COLD';
}

/**
 * Maps a lead's temperature/heat level to a display label and color.
 * Uses the canonical computeIntent function.
 */
export function getIntentDisplay(lead: Lead): {
  label: string;
  colorClass: string;
} {
  const intent = computeIntent(lead);
  switch (intent) {
    case 'HOT':
      return { label: 'Hot', colorClass: 'bg-orange-100 text-orange-700 border-orange-300/40 dark:bg-orange-500/10 dark:text-orange-400' };
    case 'WARM':
      return { label: 'Warm', colorClass: 'bg-amber-100 text-amber-700 border-amber-300/40 dark:bg-amber-500/10 dark:text-amber-400' };
    default:
      return { label: 'Cold', colorClass: 'bg-blue-100 text-blue-700 border-blue-300/40 dark:bg-blue-500/10 dark:text-blue-400' };
  }
}
