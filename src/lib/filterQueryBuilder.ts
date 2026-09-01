import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { supabase } from '../lib/supabase';

type FilterQuery = PostgrestFilterBuilder<any, any, any, any, any, any, any>;
import type {
  FilterCondition,
  FilterGroup,
  FilterState,
  FilterOperator,
  FilterField,
  FilterFieldType,
  QuickFilter,
} from '../types/filter';

// Cache for dynamic intent status mapping fetched from dispositions table
let intentStatusCache: {
  hot: string[];
  warm: string[];
  cold: string[];
} | null = null;
let intentStatusCacheTime: number = 0;
const INTENT_CACHE_TTL = 60000; // 60 seconds

/**
 * Fetches target_status values from the dispositions table to determine
 * the canonical HOT/WARM/COLD status mapping. This ensures that when a
 * Super Admin adds/renames/activates/deactivates dispositions with specific
 * target_status values, the intent filter reflects those changes dynamically.
 */
export async function fetchIntentStatusMapping(): Promise<{ hot: string[]; warm: string[]; cold: string[] }> {
  const now = Date.now();
  if (intentStatusCache && (now - intentStatusCacheTime) < INTENT_CACHE_TTL) {
    return intentStatusCache;
  }

  const { data, error } = await supabase
    .from('dispositions')
    .select('target_status, is_active')
    .eq('is_active', true)
    .not('target_status', 'is', null);

  if (error) {
    console.warn('Failed to fetch intent status mapping, using fallback:', error);
    return getDefaultIntentStatusMapping();
  }

  const hot: string[] = [];
  const warm: string[] = [];
  const cold: string[] = [];

  const seen = new Set<string>();
  data.forEach((d: { target_status: string }) => {
    const status = d.target_status;
    if (seen.has(status)) return;
    seen.add(status);

     const lower = status.toLowerCase();
    if (lower === 'hot' || lower === 'qualified' || lower === 'admitted' || lower.includes('application')) {
      hot.push(status);
    } else if (lower === 'warm' || lower === 'interested' || lower === 'connected' || lower === 'docs pending' || lower.includes('documentation')) {
      warm.push(status);
    } else if (lower === 'cold' || lower === 'not connected' || lower === 'rejected') {
      cold.push(status);
    }
  });

  intentStatusCache = { hot, warm, cold };
  intentStatusCacheTime = now;
  return intentStatusCache;
}

function getDefaultIntentStatusMapping(): { hot: string[]; warm: string[]; cold: string[] } {
  return {
    hot: ['Hot', 'Qualified', 'Admitted'],
    warm: ['Warm', 'Interested', 'Connected', 'Docs Pending'],
    cold: ['Cold', 'Not Connected', 'Rejected']
  };
}

// Synchronous helper for use in contexts where async isn't possible
// This uses the cache or falls back to defaults
export function getIntentStatusMappingSync(): { hot: string[]; warm: string[]; cold: string[] } {
  if (intentStatusCache) return intentStatusCache;
  return getDefaultIntentStatusMapping();
}

export const FILTER_FIELDS: FilterField[] = [
  {
    id: 'lead_id',
    label: 'Lead ID',
    category: 'lead_info',
    type: 'uuid',
    dbColumn: 'id',
    operators: ['=', '!='],
  },
  {
    id: 'name',
    label: 'Lead Name',
    category: 'lead_info',
    type: 'string',
    dbColumn: 'first_name',
    operators: ['=', '!=', 'contains', 'not_contains', 'starts_with', 'ends_with', 'in', 'not_in'],
  },
  {
    id: 'phone',
    label: 'Phone',
    category: 'lead_info',
    type: 'string',
    dbColumn: 'phone',
    operators: ['=', '!=', 'contains', 'not_contains', 'starts_with', 'ends_with', 'in', 'not_in'],
  },
  {
    id: 'email',
    label: 'Email',
    category: 'lead_info',
    type: 'string',
    dbColumn: 'email',
    operators: ['=', '!=', 'contains', 'not_contains', 'starts_with', 'ends_with', 'in', 'not_in'],
  },
  {
    id: 'city',
    label: 'City',
    category: 'lead_info',
    type: 'string',
    dbColumn: 'city',
    operators: ['=', '!=', 'contains', 'not_contains', 'starts_with', 'ends_with', 'in', 'not_in'],
  },
  {
    id: 'state',
    label: 'State',
    category: 'lead_info',
    type: 'string',
    dbColumn: 'state',
    operators: ['=', '!=', 'contains', 'not_contains', 'starts_with', 'ends_with', 'in', 'not_in'],
  },
  {
    id: 'country',
    label: 'Country',
    category: 'lead_info',
    type: 'string',
    dbColumn: 'country',
    operators: ['=', '!=', 'contains', 'not_contains', 'starts_with', 'ends_with', 'in', 'not_in'],
  },
  {
    id: 'lead_source',
    label: 'Lead Source',
    category: 'lead_info',
    type: 'string',
    dbColumn: 'lead_source',
    operators: ['=', '!=', 'in', 'not_in'],
  },
  {
    id: 'campaign',
    label: 'Campaign',
    category: 'lead_info',
    type: 'string',
    dbColumn: 'campaign',
    operators: ['=', '!=', 'contains', 'not_contains', 'in', 'not_in'],
  },
  {
    id: 'tags',
    label: 'Tags',
    category: 'lead_info',
    type: 'array',
    dbColumn: 'tags',
    operators: ['contains', 'not_contains'],
  },
  {
    id: 'created_at',
    label: 'Lead Created',
    category: 'date',
    type: 'date',
    dbColumn: 'created_at',
    operators: ['=', '!=', 'before', 'after', 'between', 'relative_date', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'],
  },
  {
    id: 'updated_at',
    label: 'Modified',
    category: 'date',
    type: 'date',
    dbColumn: 'updated_at',
    operators: ['=', '!=', 'before', 'after', 'between', 'relative_date', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'],
  },
  {
    id: 'last_call_date',
    label: 'Last Call',
    category: 'date',
    type: 'date',
    dbColumn: 'last_call_date',
    operators: ['=', '!=', 'before', 'after', 'between', 'relative_date', 'is_null', 'is_not_null', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'],
  },
  {
    id: 'first_call_date',
    label: 'First Call',
    category: 'date',
    type: 'date',
    dbColumn: 'lead_first_call_date',
    operators: ['is_null', 'is_not_null', 'before', 'after', 'between', 'relative_date', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'],
  },
  {
    id: 'final_follow_up_date',
    label: 'Final Follow-Up',
    category: 'date',
    type: 'date',
    dbColumn: 'final_follow_up_date',
    operators: ['=', '!=', 'before', 'after', 'between', 'relative_date', 'is_null', 'is_not_null', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'],
  },
  {
    id: 'next_action_date',
    label: 'Next Action Date',
    category: 'date',
    type: 'date',
    dbColumn: 'next_action_date',
    operators: ['=', '!=', 'before', 'after', 'between', 'relative_date', 'is_null', 'is_not_null', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'],
  },
  {
    id: 'assignment_date',
    label: 'Assignment Date',
    category: 'date',
    type: 'date',
    dbColumn: 'lead_assignment_date',
    operators: ['is_null', 'is_not_null', 'before', 'after', 'between', 'relative_date', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'],
  },
  {
    id: 'lead_status',
    label: 'Lead Status',
    category: 'status',
    type: 'string',
    dbColumn: 'lead_status',
    operators: ['=', '!=', 'in', 'not_in'],
  },
  {
    id: 'lead_stage',
    label: 'Lead Stage',
    category: 'status',
    type: 'string',
    dbColumn: 'lead_status',
    operators: ['=', '!=', 'in', 'not_in'],
  },
  {
    id: 'lead_score',
    label: 'Lead Score',
    category: 'analytics',
    type: 'number',
    dbColumn: 'lead_score',
    operators: ['=', '!=', '>', '<', '>=', '<=', 'between'],
  },
  {
    id: 'priority',
    label: 'Priority',
    category: 'lead_info',
    type: 'string',
    dbColumn: 'priority',
    operators: ['=', '!=', 'in', 'not_in'],
  },
  {
    id: 'intent',
    label: 'Intent',
    category: 'status',
    type: 'string',
    dbColumn: 'lead_status',
    operators: ['=', 'in', 'not_in'],
  },
  {
    id: 'call_attempts',
    label: 'Call Attempts',
    category: 'call_activity',
    type: 'number',
    dbColumn: 'call_attempts',
    operators: ['=', '!=', '>', '<', '>=', '<=', 'between'],
  },
  {
    id: 'interactions_count',
    label: 'Interactions',
    category: 'call_activity',
    type: 'number',
    dbColumn: 'interactions_count',
    operators: ['=', '!=', '>', '<', '>=', '<=', 'between'],
  },
  {
    id: 'latest_disposition_id',
    label: 'Disposition',
    category: 'disposition',
    type: 'uuid',
    dbColumn: 'latest_disposition_id',
    operators: ['=', '!=', 'in', 'not_in', 'is_null'],
  },
  {
    id: 'historical_disposition',
    label: 'Previously Had Disposition',
    category: 'disposition',
    type: 'uuid',
    dbColumn: 'historical_disposition',
    operators: ['=', '!=', 'in', 'not_in'],
  },
  {
    id: 'disposition_category',
    label: 'Disposition Category',
    category: 'disposition',
    type: 'uuid',
    dbColumn: 'lead_disposition_category',
    operators: ['=', '!=', 'in', 'not_in', 'is_null'],
  },
  {
    id: 'assigned_counselor',
    label: 'Counselor',
    category: 'assignment',
    type: 'uuid',
    dbColumn: 'assigned_counselor',
    operators: ['=', '!=', 'in', 'not_in', 'is_null'],
  },
  {
    id: 'notes_count',
    label: 'Notes Count',
    category: 'analytics',
    type: 'number',
    dbColumn: 'notes_count',
    operators: ['=', '!=', '>', '<', '>=', '<=', 'between'],
  },
  {
    id: 'tasks_count',
    label: 'Tasks Count',
    category: 'analytics',
    type: 'number',
    dbColumn: 'tasks_count',
    operators: ['=', '!=', '>', '<', '>=', '<=', 'between'],
  },
  {
    id: 'has_pending_task',
    label: 'Has Pending Task',
    category: 'analytics',
    type: 'boolean',
    dbColumn: 'lead_has_pending_task',
    operators: ['='],
  },
  {
    id: 'task_due_today',
    label: 'Task Due Today',
    category: 'analytics',
    type: 'boolean',
    dbColumn: 'lead_task_due_today',
    operators: ['='],
  },
  {
    id: 'task_overdue',
    label: 'Task Overdue',
    category: 'analytics',
    type: 'boolean',
    dbColumn: 'lead_task_overdue',
    operators: ['='],
  },
  {
    id: 'task_assigned_to_me',
    label: 'Task Assigned to Me',
    category: 'analytics',
    type: 'boolean',
    dbColumn: 'lead_task_assigned_to_me',
    operators: ['='],
  },
  {
    id: 'has_call_activity',
    label: 'Has Call Activity',
    category: 'activity',
    type: 'boolean',
    dbColumn: 'lead_has_call_activity',
    operators: ['='],
  },
  {
    id: 'has_whatsapp_activity',
    label: 'Has WhatsApp Activity',
    category: 'activity',
    type: 'boolean',
    dbColumn: 'lead_has_whatsapp_activity',
    operators: ['='],
  },
  {
    id: 'has_email_activity',
    label: 'Has Email Activity',
    category: 'activity',
    type: 'boolean',
    dbColumn: 'lead_has_email_activity',
    operators: ['='],
  },
  {
    id: 'has_task_activity',
    label: 'Has Task Activity',
    category: 'activity',
    type: 'boolean',
    dbColumn: 'lead_has_task_activity',
    operators: ['='],
  },
  {
    id: 'has_no_activity',
    label: 'Has No Activity',
    category: 'activity',
    type: 'boolean',
    dbColumn: 'lead_has_no_activity',
    operators: ['='],
  },
  {
    id: 'last_activity_date',
    label: 'Last Activity Date',
    category: 'date',
    type: 'date',
    dbColumn: 'lead_last_activity_date',
    operators: ['is_null', 'is_not_null', 'before', 'after', 'between', 'relative_date', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'],
  },
  {
    id: 'university',
    label: 'University',
    category: 'academic',
    type: 'string',
    dbColumn: 'lead_university_name',
    operators: ['=', '!=', 'contains', 'in', 'not_in'],
  },
  {
    id: 'course',
    label: 'Course',
    category: 'academic',
    type: 'string',
    dbColumn: 'lead_course_name',
    operators: ['=', '!=', 'contains', 'in', 'not_in'],
  },
  {
    id: 'temperature',
    label: 'Temperature',
    category: 'analytics',
    type: 'string',
    dbColumn: 'temperature',
    operators: ['=', '!=', 'in', 'not_in'],
  },
  {
    id: 'age',
    label: 'Age',
    category: 'lead_info',
    type: 'number',
    dbColumn: 'age',
    operators: ['=', '!=', '>', '<', '>=', '<=', 'between'],
  },
  {
    id: 'urgency',
    label: 'Urgency',
    category: 'lead_info',
    type: 'string',
    dbColumn: 'urgency',
    operators: ['=', '!=', 'in', 'not_in'],
  },
  {
    id: 'conversion_probability',
    label: 'Conversion Probability',
    category: 'analytics',
    type: 'number',
    dbColumn: 'conversion_probability',
    operators: ['=', '!=', '>', '<', '>=', '<=', 'between'],
  },
];

export const FILTER_FIELDS_BY_CATEGORY: Record<string, FilterField[]> = {};
FILTER_FIELDS.forEach(f => {
  if (!FILTER_FIELDS_BY_CATEGORY[f.category]) FILTER_FIELDS_BY_CATEGORY[f.category] = [];
  FILTER_FIELDS_BY_CATEGORY[f.category].push(f);
});

export const FILTER_FIELD_MAP: Record<string, FilterField> = {};
FILTER_FIELDS.forEach(f => { FILTER_FIELD_MAP[f.id] = f; });

const RELATIVE_DATE_MAP: Record<string, number> = {
  'last_24_hours': 1,
  'last_3_days': 3,
  'last_7_days': 7,
  'last_15_days': 15,
  'last_30_days': 30,
  'last_90_days': 90,
  'last_180_days': 180,
  'last_365_days': 365,
};

export function getRelativeDateValue(key: string): string | null {
  const days = RELATIVE_DATE_MAP[key];
  if (days === undefined) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function getRelativeDateKeyFromValue(value: string): string | null {
  const now = new Date();
  const valueDate = new Date(value);
  const diffHours = Math.floor((now.getTime() - valueDate.getTime()) / (1000 * 60 * 60));
  if (diffHours <= 24) return 'last_24_hours';
  if (diffHours <= 72) return 'last_3_days';
  if (diffHours <= 168) return 'last_7_days';
  return null;
}

function buildPostgrestFilterString(field: string, type: FilterFieldType, operator: FilterOperator, value: any, value2?: any): string {
  const col = field.replace(/\s+/g, '');

  if (type === 'date') {
    // Process single date value
    const isSingleDate = typeof value === 'string' && !!value.match(/^\d{4}-\d{2}-\d{2}$/);
    if (isSingleDate && ['=', '!=', 'before', 'after', '<=', '>='].includes(operator)) {
      const start = `${value}T00:00:00.000Z`;
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + 1);
      const end = d.toISOString();

      switch (operator) {
        case '=': return `and(${col}.gte.${start},${col}.lt.${end})`;
        case '!=': return `or(${col}.lt.${start},${col}.gte.${end},${col}.is.null)`;
        case 'before': return `${col}.lt.${start}`;
        case 'after': return `${col}.gte.${end}`;
        case '<=': return `${col}.lt.${end}`;
        case '>=': return `${col}.gte.${start}`;
      }
    }
    
    // Process date range
    if (operator === 'between' && value && value2) {
      const isStartValid = typeof value === 'string' && !!value.match(/^\d{4}-\d{2}-\d{2}$/);
      const isEndValid = typeof value2 === 'string' && !!value2.match(/^\d{4}-\d{2}-\d{2}$/);
      if (isStartValid && isEndValid) {
        const start = `${value}T00:00:00.000Z`;
        const dEnd = new Date(`${value2}T00:00:00.000Z`);
        dEnd.setUTCDate(dEnd.getUTCDate() + 1);
        const end = dEnd.toISOString();
        return `and(${col}.gte.${start},${col}.lt.${end})`;
      }
    }
  }

  switch (operator) {
    case '=':
      if (Array.isArray(value)) return `${col}.in.(${value.join(',')})`;
      return `${col}.eq.${value}`;
    case '!=':
      if (Array.isArray(value)) {
        const inList = value.join(',');
        return `or(${col}.not.in.(${inList}),${col}.is.null)`;
      }
      return `or(${col}.neq.${value},${col}.is.null)`;
    case '>':
      return `${col}.gt.${value}`;
    case '<':
      return `${col}.lt.${value}`;
    case '>=':
      return `${col}.gte.${value}`;
    case '<=':
      return `${col}.lte.${value}`;
    case 'contains':
      return `${col}.ilike.*${value}*`;
    case 'not_contains':
      return `or(${col}.not.ilike.*${value}*,${col}.is.null)`;
    case 'starts_with':
      return `${col}.ilike.${value}*`;
    case 'ends_with':
      return `${col}.ilike.*${value}`;
    case 'in':
      return `${col}.in.(${Array.isArray(value) ? value.join(',') : value})`;
    case 'not_in':
      const notInList = Array.isArray(value) ? value.join(',') : value;
      return `or(${col}.not.in.(${notInList}),${col}.is.null)`;
    case 'between':
      return value && value2 ? `and(${col}.gte.${value},${col}.lte.${value2})` : '';
    case 'before':
      return `${col}.lt.${value}`;
    case 'after':
      return `${col}.gt.${value}`;
    case 'is_null':
      return `${col}.is.null`;
    case 'is_not_null':
      return `${col}.not.is.null`;
    case 'relative_date':
      return `${col}.gte.${value}`;
    case 'today': {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return `and(${col}.gte.${start.toISOString()},${col}.lt.${end.toISOString()})`;
    }
    case 'yesterday': {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return `and(${col}.gte.${start.toISOString()},${col}.lt.${end.toISOString()})`;
    }
    case 'this_week': {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return `${col}.gte.${start.toISOString()}`;
    }
    case 'last_week': {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getDate() - now.getDay());
      end.setHours(0, 0, 0, 0);
      return `and(${col}.gte.${start.toISOString()},${col}.lt.${end.toISOString()})`;
    }
    case 'this_month': {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return `${col}.gte.${start.toISOString()}`;
    }
    case 'last_month': {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      return `and(${col}.gte.${start.toISOString()},${col}.lt.${end.toISOString()})`;
    }
    default:
      return '';
  }
}

function buildIntentFilterString(targetValues: string[]): string {
  const { hot, warm } = getIntentStatusMappingSync();

  if (targetValues.includes('COLD')) {
    const includeHot = targetValues.includes('HOT');
    const includeWarm = targetValues.includes('WARM');
    
    const rootOrParts: string[] = [];
    const coldAndParts: string[] = [];
    
    if (hot.length > 0) {
      coldAndParts.push(`lead_status.not.in.(${hot.join(',')})`);
      coldAndParts.push(`lead_status.not.ilike.*application*`);
    }
    if (warm.length > 0) {
      coldAndParts.push(`lead_status.not.in.(${warm.join(',')})`);
    }
    if (coldAndParts.length > 0) {
      rootOrParts.push(`and(${coldAndParts.join(',')})`);
    }

    if (includeHot) {
      rootOrParts.push(`or(urgency.eq.Immediate,lead_status.in.(${hot.join(',')}),urgency.is.null)`);
    }
    if (includeWarm) {
      rootOrParts.push(`or(urgency.eq.High,lead_status.in.(${warm.join(',')}),urgency.is.null)`);
    }

    if (rootOrParts.length === 1) return rootOrParts[0];
    if (rootOrParts.length > 1) return `or(${rootOrParts.join(',')})`;
    return '';
  }

  const orParts: string[] = [];
  const statusParts: string[] = [];

  if (targetValues.includes('HOT')) {
    orParts.push('urgency.eq.Immediate');
    statusParts.push(...hot);
  }
  if (targetValues.includes('WARM')) {
    orParts.push('urgency.eq.High');
    statusParts.push(...warm);
  }

  if (statusParts.length > 0) {
    const uniqueStatuses = Array.from(new Set(statusParts));
    const statusList = uniqueStatuses.join(',');
    orParts.push(`lead_status.in.(${statusList})`);
    if (targetValues.includes('HOT') || targetValues.includes('WARM')) {
      orParts.push('urgency.is.null');
    }
  }

  if (orParts.length > 0) {
    return `or(${orParts.join(',')})`;
  }
  return '';
}

function buildConditionString(cond: FilterCondition): string {
  const field = FILTER_FIELD_MAP[cond.fieldId];
  if (!field || !field.dbColumn) return '';
  const col = field.dbColumn;
  const operator = cond.operator;
  const value = cond.value;
  const value2 = cond.value2;

  if (field.id === 'intent' && (operator === '=' || operator === '!=' || operator === 'in' || operator === 'not_in')) {
    const intentValues = Array.isArray(value) ? value : [value];
    let targetValues: string[];
    if (operator === '=' || operator === 'in') {
      targetValues = intentValues;
    } else {
      const allValues = ['HOT', 'WARM', 'COLD'];
      targetValues = allValues.filter(v => !intentValues.includes(v));
    }
    if (targetValues.length === 0) return 'id.eq.00000000-0000-0000-0000-000000000000';
    return buildIntentFilterString(targetValues);
  }

  if (field.id === 'historical_disposition') {
    const vals = Array.isArray(value) ? value : [value];
    const valsString = vals.join(',');
    if (operator === '=' || operator === 'in') {
      return `lead_historical_disposition_ids.ov.{${valsString}}`;
    } else {
      return `lead_historical_disposition_ids.not.ov.{${valsString}}`;
    }
  }

  return buildPostgrestFilterString(col, field.type, operator, value, value2);
}

function buildGroupString(group: FilterGroup): string {
  const parts: string[] = [];

  group.conditions?.forEach(cond => {
    const str = buildConditionString(cond);
    if (str) parts.push(str);
  });

  group.groups?.forEach(sg => {
    const str = buildGroupString(sg);
    if (str) parts.push(str);
  });

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];

  const joined = parts.join(',');
  return group.logic === 'OR' ? `or(${joined})` : `and(${joined})`;
}

export function applyFilters(
  query: FilterQuery,
  filterState: FilterState | undefined
): FilterQuery {
  if (!filterState || !filterState.rootGroup) {
    return query;
  }

  const rootGroup = filterState.rootGroup;
  const rootLogic = rootGroup.logic;

  // Collect all top-level filter strings from conditions and sub-groups
  const parts: string[] = [];

  rootGroup.conditions?.forEach(cond => {
    const str = buildConditionString(cond);
    if (str) parts.push(str);
  });

  rootGroup.groups?.forEach(sg => {
    const str = buildGroupString(sg);
    if (str) parts.push(str);
  });

  if (parts.length === 0) return query;

  if (rootLogic === 'AND') {
    // For root AND: apply each condition as a SEPARATE chained .filter() call.
    // PostgREST implicitly ANDs all conditions on a query builder chain.
    // Each part may itself be a compound expression (e.g. or(A,B) from a sub-group),
    // which we pass via .or() to preserve its inner semantics.
    for (const part of parts) {
      if (part.startsWith('or(')) {
        // Sub-group that is OR: use .or() to preserve its inner OR logic
        query = query.or(part.substring(3, part.length - 1));
      } else if (part.startsWith('and(')) {
        // Nested AND sub-group: also applies as .or() with inner and(...) content
        // PostgREST and(...) inside or() is valid — each item here is itself AND
        query = query.or(part.substring(4, part.length - 1));
      } else {
        // Single condition — apply directly via .or() with single predicate
        query = query.or(part);
      }
    }
    return query;
  } else {
    // Root OR: combine all parts into a single .or() call
    const joined = parts.join(',');
    return query.or(joined);
  }
}

export const QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'fresh_leads',
    label: 'Fresh Leads',
    description: 'Leads created in the last 24 hours',
    category: 'lead_info',
    roleAccess: ['Super Admin', 'Admin', 'Manager', 'Team Leader', 'Counselor'],
    conditions: [
      { id: 'qf1', fieldId: 'created_at', operator: 'relative_date', value: getRelativeDateValue('last_24_hours') || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: 'never_called',
    label: 'Never Called',
    description: 'Leads with zero call attempts',
    category: 'call_activity',
    roleAccess: ['Super Admin', 'Admin', 'Manager', 'Team Leader', 'Counselor'],
    conditions: [
      { id: 'qf2', fieldId: 'call_attempts', operator: '=', value: 0 },
    ],
  },
  {
    id: 'attempts_3_plus',
    label: '3+ Attempts',
    description: 'Leads with 3 or more call attempts',
    category: 'call_activity',
    roleAccess: ['Super Admin', 'Admin', 'Manager', 'Team Leader', 'Counselor'],
    conditions: [
      { id: 'qf3', fieldId: 'call_attempts', operator: '>=', value: 3 },
    ],
  },
  {
    id: 'never_connected',
    label: '3+ Attempts - Never Connected',
    description: 'Called 3+ times but never picked up',
    category: 'call_activity',
    roleAccess: ['Super Admin', 'Admin', 'Manager', 'Team Leader', 'Counselor'],
    conditions: [
      { id: 'qf4a', fieldId: 'call_attempts', operator: '>=', value: 3 },
      { id: 'qf4b', fieldId: 'interactions_count', operator: '=', value: 0 },
    ],
  },
  {
    id: 'hot_leads',
    label: 'Hot Leads',
    description: 'Leads currently classified as Hot intent',
    category: 'status',
    roleAccess: ['Super Admin', 'Admin', 'Manager', 'Team Leader', 'Counselor'],
    conditions: [
      { id: 'qf5', fieldId: 'intent', operator: 'in', value: ['Hot'] },
    ],
  },
  {
    id: 'warm_leads',
    label: 'Warm Leads',
    description: 'Leads currently classified as Warm intent',
    category: 'status',
    roleAccess: ['Super Admin', 'Admin', 'Manager', 'Team Leader', 'Counselor'],
    conditions: [
      { id: 'qf6', fieldId: 'intent', operator: 'in', value: ['Warm'] },
    ],
  },
  {
    id: 'follow_up_due',
    label: 'Follow-Up Due',
    description: 'Follow-up date is today or past due',
    category: 'date',
    roleAccess: ['Super Admin', 'Admin', 'Manager', 'Team Leader', 'Counselor'],
    conditions: [
      { id: 'qf7', fieldId: 'final_follow_up_date', operator: 'is_not_null', value: true },
      { id: 'qf8', fieldId: 'final_follow_up_date', operator: 'before', value: new Date().toISOString() },
    ],
  },
  {
    id: 'no_call_3_days',
    label: 'No Call 3 Days',
    description: 'Last call was more than 3 days ago',
    category: 'call_activity',
    roleAccess: ['Super Admin', 'Admin', 'Manager', 'Team Leader', 'Counselor'],
    conditions: [
      { id: 'qf9a', fieldId: 'last_call_date', operator: 'is_not_null', value: true },
      { id: 'qf9b', fieldId: 'last_call_date', operator: 'relative_date', value: getRelativeDateValue('last_3_days') || new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: 'no_call_7_days',
    label: 'No Call 7 Days',
    description: 'Last call was more than 7 days ago',
    category: 'call_activity',
    roleAccess: ['Super Admin', 'Admin', 'Manager', 'Team Leader', 'Counselor'],
    conditions: [
      { id: 'qf10a', fieldId: 'last_call_date', operator: 'is_not_null', value: true },
      { id: 'qf10b', fieldId: 'last_call_date', operator: 'relative_date', value: getRelativeDateValue('last_7_days') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: 'unassigned',
    label: 'Unassigned',
    description: 'Leads with no counselor assigned',
    category: 'assignment',
    roleAccess: ['Super Admin', 'Admin', 'Manager', 'Team Leader'],
    conditions: [
      { id: 'qf11', fieldId: 'assigned_counselor', operator: 'is_null', value: true },
    ],
  },
  {
    id: 'high_priority_untouched',
    label: 'High Priority Untouched',
    description: 'High priority leads never called',
    category: 'analytics',
    roleAccess: ['Super Admin', 'Admin', 'Manager', 'Team Leader', 'Counselor'],
    conditions: [
      { id: 'qf12a', fieldId: 'priority', operator: '=', value: 'High' },
      { id: 'qf12b', fieldId: 'call_attempts', operator: '=', value: 0 },
    ],
  },
  {
    id: 'no_calls_yet',
    label: 'Never Called',
    description: 'Leads with zero call attempts',
    category: 'call_activity',
    roleAccess: ['Super Admin', 'Admin', 'Manager', 'Team Leader', 'Counselor'],
    conditions: [
      { id: 'qf13', fieldId: 'call_attempts', operator: '=', value: 0 },
    ],
  },
];

export function getIntentFromLeadStatus(leadStatus: string): 'HOT' | 'WARM' | 'COLD' {
  const { hot, warm } = getIntentStatusMappingSync();
  const status = leadStatus?.toLowerCase() || '';
  
  const hotSet = new Set(hot.map(s => s.toLowerCase()));
  const warmSet = new Set(warm.map(s => s.toLowerCase()));
  
  if (hotSet.has(status) || status.includes('application')) return 'HOT';
  if (warmSet.has(status) || status.includes('documentation')) return 'WARM';
  return 'COLD';
}
