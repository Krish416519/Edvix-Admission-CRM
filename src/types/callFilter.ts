import { Call } from './telephony';

export type CallSearchField = 'all' | 'phone' | 'lead' | 'counselor';

export interface CallFilterState {
  // 1. Search Query & Scope
  search: string;
  searchField: CallSearchField; // 'all' | 'phone' | 'lead' | 'counselor'

  // 2. User & Designation
  counselorId: string; // 'all' | 'me' | userId
  designationId: string; // 'all' | designationId

  // 3. Direction & Status
  direction: 'all' | 'inbound' | 'outbound';
  statuses: string[]; // empty = all

  // 4. Outcomes & Sentiment
  outcomes: string[]; // empty = all
  sentiment: 'all' | 'positive' | 'neutral' | 'negative';

  // 5. Duration
  durationPreset: 'all' | 'under_1m' | '1_to_5m' | '5_to_15m' | 'over_15m';

  // 6. Dates
  datePreset: 'all' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'custom';
  customStartDate?: string;
  customEndDate?: string;

  // 7. Intelligence & Media Flags
  hasRecording?: boolean;
  hasAiSummary?: boolean;
  hasObjections?: boolean;
  hasFollowUp?: boolean;
}

export const INITIAL_CALL_FILTER_STATE: CallFilterState = {
  search: '',
  searchField: 'all',
  counselorId: 'all',
  designationId: 'all',
  direction: 'all',
  statuses: [],
  outcomes: [],
  sentiment: 'all',
  durationPreset: 'all',
  datePreset: 'all',
  customStartDate: '',
  customEndDate: '',
  hasRecording: undefined,
  hasAiSummary: undefined,
  hasObjections: undefined,
  hasFollowUp: undefined,
};

export function countActiveCallFilters(filters: CallFilterState): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (filters.counselorId !== 'all') count++;
  if (filters.designationId !== 'all') count++;
  if (filters.direction !== 'all') count++;
  if (filters.statuses.length > 0) count++;
  if (filters.outcomes.length > 0) count++;
  if (filters.sentiment !== 'all') count++;
  if (filters.durationPreset !== 'all') count++;
  if (filters.datePreset !== 'all') count++;
  if (filters.hasRecording) count++;
  if (filters.hasAiSummary) count++;
  if (filters.hasObjections) count++;
  if (filters.hasFollowUp) count++;
  return count;
}

export interface CounselorUser {
  id: string;
  name: string;
  email?: string;
  roleName?: string;
  designationId?: string;
  designationName?: string;
}

export interface DesignationOption {
  id: string;
  name: string;
  level?: number;
}
