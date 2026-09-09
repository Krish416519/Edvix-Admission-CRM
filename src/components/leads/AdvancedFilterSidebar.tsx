import React, { useEffect, useState, useMemo } from 'react';
import {
  X, Filter, RotateCcw, Calendar, Check, AlertCircle,
  Phone, User, CheckCircle2, ArrowUpDown, ChevronRight,
  Flame, Zap, Clock, Bookmark, Sparkles, Plus, Trash2,
  HelpCircle, ChevronDown, CheckCheck, GraduationCap,
  MapPin, Activity, Sliders, MessageSquare, Mail,
  Building2, BookOpen, Layers, PhoneCall, BellRing, Target,
  Brain, ShieldAlert, TrendingUp, DollarSign, Award, Users,
  CheckSquare
} from 'lucide-react';
import { FilterCondition, FilterState, FilterOperator } from '../../types/filter';
import { FILTER_FIELDS, FILTER_FIELD_MAP } from '../../lib/filterQueryBuilder';
import { cn } from '../../lib/utils';
import { useDispositions } from '../../hooks/useDispositions';
import { DispositionCategory, Disposition } from '../../types/disposition';
import { useAuth } from '../../contexts/AuthContext';
import { SaveViewModal } from './SaveViewModal';
import { DEFAULT_PIPELINE_STAGES, STATUS_COLORS } from '../../constants/pipelineStages';
import { supabase } from '../../lib/supabase';

export interface AdvancedFilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filterState: FilterState;
  onFilterChange: (state: FilterState) => void;
  onApply: () => void;
  onClear?: () => void;
  counselors?: { id: string; name: string; email?: string; role_name?: string }[];
  leadsCount?: number;
}

export interface LeadFilterDrawerState {
  // 0. Enterprise Match Rules
  logic: 'AND' | 'OR';

  // 1. Pipeline & Status
  statuses: string[]; // multi-select stages (empty = All)
  intent: 'All' | 'HOT' | 'WARM' | 'COLD';
  priorities: string[]; // multi-select priorities (empty = All)
  counselor: string; // 'All' | 'me' | 'unassigned' | counselorId

  // 2. Enterprise AI & Predictive Intelligence
  minAiScore?: number; // 0-100
  dropOffRisk: 'All' | 'High' | 'Medium' | 'Low';
  minConversionProbability?: number; // 0.0 - 1.0
  urgency: 'All' | 'Immediate' | 'High' | 'Medium' | 'Low';

  // 3. Activity & Engagement Channels
  callAttempts: 'all' | '0' | '1-2' | '3_plus';
  taskFilter: 'all' | 'has_pending' | 'due_today' | 'overdue';
  hasNoActivity?: boolean;
  hasWhatsApp?: boolean;
  hasEmail?: boolean;
  lastCallPreset: 'all' | 'never' | 'today' | 'not_3_days' | 'not_7_days' | 'not_14_days';

  // 4. Dates & SLA Schedules
  datePreset: 'all' | 'today' | 'yesterday' | 'this_week' | 'last_7_days' | 'this_month' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  followUpPreset: 'all' | 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'unassigned';

  // 5. Academic & Geographic Dimensions
  universityId: string; // 'All' | universityId
  courseId: string; // 'All' | courseId
  state: string; // 'All' | state
  city: string; // string
  sources: string[]; // multi-select sources (empty = All)
  partnerId: string; // 'All' | 'direct' | partnerUserId
  budgetBand: string; // 'All' | budget string
  dispositionCategory: string; // 'All' | categoryId
  dispositionId: string; // 'All' | dispositionId

  // 6. Power & Rules
  minScore?: number;
  sortBy?: string;
  customConditions: FilterCondition[];
}

export const INITIAL_LEAD_FILTERS: LeadFilterDrawerState = {
  logic: 'AND',
  statuses: [],
  intent: 'All',
  priorities: [],
  counselor: 'All',
  minAiScore: undefined,
  dropOffRisk: 'All',
  minConversionProbability: undefined,
  urgency: 'All',
  datePreset: 'all',
  customStartDate: '',
  customEndDate: '',
  followUpPreset: 'all',
  lastCallPreset: 'all',
  callAttempts: 'all',
  taskFilter: 'all',
  hasNoActivity: false,
  hasWhatsApp: false,
  hasEmail: false,
  universityId: 'All',
  courseId: 'All',
  state: 'All',
  city: '',
  sources: [],
  partnerId: 'All',
  budgetBand: 'All',
  dispositionCategory: 'All',
  dispositionId: 'All',
  minScore: undefined,
  sortBy: 'created_desc',
  customConditions: [],
};

const COMMON_SOURCES = [
  'Website',
  'Meta Ads',
  'Google Ads',
  'Walk-in',
  'Referral',
  'Social Media',
  'Agency',
  'Direct Inquiry',
  'Other'
];

const COMMON_STATES = [
  'All', 'Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Uttar Pradesh',
  'Gujarat', 'Rajasthan', 'West Bengal', 'Telangana', 'Kerala', 'Madhya Pradesh',
  'Haryana', 'Punjab', 'Bihar', 'Andhra Pradesh', 'Other'
];

const BUDGET_BANDS = [
  'All',
  'Under ₹1 Lakh',
  '₹1 Lakh - ₹3 Lakhs',
  '₹3 Lakhs - ₹5 Lakhs',
  'Above ₹5 Lakhs'
];

type DrawerTab = 'pipeline' | 'ai' | 'activity' | 'dates' | 'academic' | 'rules';

/**
 * Bi-directional parser: Converts raw FilterState into human-friendly LeadFilterDrawerState
 */
function parseFilterStateToDrawerState(
  state: FilterState | undefined,
  currentUserId?: string
): LeadFilterDrawerState {
  const parsed: LeadFilterDrawerState = {
    ...INITIAL_LEAD_FILTERS,
    logic: state?.rootGroup?.logic || 'AND',
    statuses: [],
    priorities: [],
    sources: [],
    customConditions: []
  };

  if (!state?.rootGroup?.conditions || state.rootGroup.conditions.length === 0) {
    return parsed;
  }

  const conditions = state.rootGroup.conditions;
  const unparsed: FilterCondition[] = [];

  for (const cond of conditions) {
    switch (cond.fieldId) {
      case 'lead_status':
      case 'lead_stage':
        if (cond.operator === 'in' && Array.isArray(cond.value)) {
          parsed.statuses = cond.value;
        } else if (cond.operator === '=' && typeof cond.value === 'string') {
          parsed.statuses = [cond.value];
        } else {
          unparsed.push(cond);
        }
        break;

      case 'intent':
        if (cond.operator === '=' || cond.operator === 'in') {
          const val = Array.isArray(cond.value) ? cond.value[0] : cond.value;
          const upper = String(val).toUpperCase();
          if (['HOT', 'WARM', 'COLD'].includes(upper)) {
            parsed.intent = upper as any;
          } else {
            unparsed.push(cond);
          }
        } else {
          unparsed.push(cond);
        }
        break;

      case 'priority':
        if (cond.operator === 'in' && Array.isArray(cond.value)) {
          parsed.priorities = cond.value;
        } else if (cond.operator === '=' && typeof cond.value === 'string') {
          parsed.priorities = [cond.value];
        } else {
          unparsed.push(cond);
        }
        break;

      case 'assigned_counselor':
        if (cond.operator === 'is_null') {
          parsed.counselor = 'unassigned';
        } else if (cond.operator === '=') {
          if (currentUserId && cond.value === currentUserId) {
            parsed.counselor = 'me';
          } else {
            parsed.counselor = String(cond.value);
          }
        } else {
          unparsed.push(cond);
        }
        break;

      case 'lead_source':
        if (cond.operator === 'in' && Array.isArray(cond.value)) {
          parsed.sources = cond.value;
        } else if (cond.operator === '=' && typeof cond.value === 'string') {
          parsed.sources = [cond.value];
        } else {
          unparsed.push(cond);
        }
        break;

      case 'disposition_category':
        if (cond.operator === '=') {
          parsed.dispositionCategory = String(cond.value);
        } else {
          unparsed.push(cond);
        }
        break;

      case 'latest_disposition_id':
        if (cond.operator === '=') {
          parsed.dispositionId = String(cond.value);
        } else {
          unparsed.push(cond);
        }
        break;

      case 'university_id':
        if (cond.operator === '=') {
          parsed.universityId = String(cond.value);
        } else {
          unparsed.push(cond);
        }
        break;

      case 'course_id':
        if (cond.operator === '=') {
          parsed.courseId = String(cond.value);
        } else {
          unparsed.push(cond);
        }
        break;

      case 'state':
        if (cond.operator === '=') {
          parsed.state = String(cond.value);
        } else {
          unparsed.push(cond);
        }
        break;

      case 'city':
        if (cond.operator === '=' || cond.operator === 'contains') {
          parsed.city = String(cond.value);
        } else {
          unparsed.push(cond);
        }
        break;

      case 'budget':
        if (cond.operator === '=' || cond.operator === 'contains') {
          parsed.budgetBand = String(cond.value);
        } else {
          unparsed.push(cond);
        }
        break;

      case 'partner_id':
        if (cond.operator === 'is_null') {
          parsed.partnerId = 'direct';
        } else if (cond.operator === '=') {
          parsed.partnerId = String(cond.value);
        } else {
          unparsed.push(cond);
        }
        break;

      case 'ai_score':
        if (cond.operator === '>=') {
          parsed.minAiScore = Number(cond.value);
        } else {
          unparsed.push(cond);
        }
        break;

      case 'drop_off_risk':
        if (cond.operator === '=' && ['High', 'Medium', 'Low'].includes(String(cond.value))) {
          parsed.dropOffRisk = cond.value as any;
        } else {
          unparsed.push(cond);
        }
        break;

      case 'conversion_probability':
        if (cond.operator === '>=') {
          parsed.minConversionProbability = Number(cond.value);
        } else {
          unparsed.push(cond);
        }
        break;

      case 'urgency':
        if (cond.operator === '=' && ['Immediate', 'High', 'Medium', 'Low'].includes(String(cond.value))) {
          parsed.urgency = cond.value as any;
        } else {
          unparsed.push(cond);
        }
        break;

      case 'created_at':
        if (['today', 'yesterday', 'this_week', 'this_month'].includes(cond.operator)) {
          parsed.datePreset = cond.operator as any;
        } else if (cond.operator === 'relative_date' && cond.value === 'last_7_days') {
          parsed.datePreset = 'last_7_days';
        } else if (cond.operator === 'between' && Array.isArray(cond.value)) {
          parsed.datePreset = 'custom';
          parsed.customStartDate = cond.value[0] || '';
          parsed.customEndDate = cond.value[1] || '';
        } else {
          unparsed.push(cond);
        }
        break;

      case 'final_follow_up_date':
        if (cond.operator === 'is_null') {
          parsed.followUpPreset = 'unassigned';
        } else if (cond.operator === 'before') {
          parsed.followUpPreset = 'overdue';
        } else if (cond.operator === 'today') {
          parsed.followUpPreset = 'today';
        } else if (cond.operator === 'this_week') {
          parsed.followUpPreset = 'this_week';
        } else {
          unparsed.push(cond);
        }
        break;

      case 'last_call_date':
        if (cond.operator === 'is_null') {
          parsed.lastCallPreset = 'never';
        } else if (cond.operator === 'today') {
          parsed.lastCallPreset = 'today';
        } else if (cond.operator === 'relative_date' && cond.value === 'last_3_days') {
          parsed.lastCallPreset = 'not_3_days';
        } else if (cond.operator === 'relative_date' && cond.value === 'last_7_days') {
          parsed.lastCallPreset = 'not_7_days';
        } else {
          unparsed.push(cond);
        }
        break;

      case 'call_attempts':
        if (cond.operator === '=' && (cond.value === 0 || cond.value === '0')) {
          parsed.callAttempts = '0';
        } else if (cond.operator === '>=' && (cond.value === 3 || cond.value === '3')) {
          parsed.callAttempts = '3_plus';
        } else if (cond.operator === 'between') {
          parsed.callAttempts = '1-2';
        } else {
          unparsed.push(cond);
        }
        break;

      case 'has_pending_task':
        if (cond.value === true) parsed.taskFilter = 'has_pending';
        else unparsed.push(cond);
        break;

      case 'task_due_today':
        if (cond.value === true) parsed.taskFilter = 'due_today';
        else unparsed.push(cond);
        break;

      case 'task_overdue':
        if (cond.value === true) parsed.taskFilter = 'overdue';
        else unparsed.push(cond);
        break;

      case 'has_no_activity':
        if (cond.value === true) parsed.hasNoActivity = true;
        else unparsed.push(cond);
        break;

      case 'has_whatsapp_activity':
        if (cond.value === true) parsed.hasWhatsApp = true;
        else unparsed.push(cond);
        break;

      case 'has_email_activity':
        if (cond.value === true) parsed.hasEmail = true;
        else unparsed.push(cond);
        break;

      case 'lead_score':
        if (cond.operator === '>=') {
          parsed.minScore = Number(cond.value);
        } else {
          unparsed.push(cond);
        }
        break;

      default:
        unparsed.push(cond);
        break;
    }
  }

  parsed.customConditions = unparsed;
  return parsed;
}

/**
 * Bi-directional builder: Converts LeadFilterDrawerState back into canonical FilterState
 */
function drawerStateToFilterState(
  draft: LeadFilterDrawerState,
  currentUserId?: string
): FilterState {
  const conditions: FilterCondition[] = [];
  const now = Date.now();

  // 1. Pipeline Stages (Multi-Select Support)
  if (draft.statuses.length > 0) {
    if (draft.statuses.length === 1) {
      conditions.push({
        id: `cond_status_${now}`,
        fieldId: 'lead_status',
        operator: '=',
        value: draft.statuses[0],
      });
    } else {
      conditions.push({
        id: `cond_status_${now}`,
        fieldId: 'lead_status',
        operator: 'in',
        value: draft.statuses,
      });
    }
  }

  // 2. Intent
  if (draft.intent !== 'All') {
    conditions.push({
      id: `cond_intent_${now}`,
      fieldId: 'intent',
      operator: '=',
      value: draft.intent,
    });
  }

  // 3. Priorities (Multi-Select Support)
  if (draft.priorities.length > 0) {
    if (draft.priorities.length === 1) {
      conditions.push({
        id: `cond_priority_${now}`,
        fieldId: 'priority',
        operator: '=',
        value: draft.priorities[0],
      });
    } else {
      conditions.push({
        id: `cond_priority_${now}`,
        fieldId: 'priority',
        operator: 'in',
        value: draft.priorities,
      });
    }
  }

  // 4. Counselor
  if (draft.counselor !== 'All') {
    if (draft.counselor === 'unassigned') {
      conditions.push({
        id: `cond_counselor_${now}`,
        fieldId: 'assigned_counselor',
        operator: 'is_null',
        value: true,
      });
    } else if (draft.counselor === 'me') {
      conditions.push({
        id: `cond_counselor_${now}`,
        fieldId: 'assigned_counselor',
        operator: '=',
        value: currentUserId || '',
      });
    } else {
      conditions.push({
        id: `cond_counselor_${now}`,
        fieldId: 'assigned_counselor',
        operator: '=',
        value: draft.counselor,
      });
    }
  }

  // 5. Sources (Multi-Select Support)
  if (draft.sources.length > 0) {
    if (draft.sources.length === 1) {
      conditions.push({
        id: `cond_source_${now}`,
        fieldId: 'lead_source',
        operator: '=',
        value: draft.sources[0],
      });
    } else {
      conditions.push({
        id: `cond_source_${now}`,
        fieldId: 'lead_source',
        operator: 'in',
        value: draft.sources,
      });
    }
  }

  // 6. Disposition Category & Child Disposition
  if (draft.dispositionCategory !== 'All') {
    conditions.push({
      id: `cond_disp_cat_${now}`,
      fieldId: 'disposition_category',
      operator: '=',
      value: draft.dispositionCategory,
    });
  }
  if (draft.dispositionId !== 'All') {
    conditions.push({
      id: `cond_disp_id_${now}`,
      fieldId: 'latest_disposition_id',
      operator: '=',
      value: draft.dispositionId,
    });
  }

  // 7. Academic: University & Course
  if (draft.universityId !== 'All') {
    conditions.push({
      id: `cond_uni_${now}`,
      fieldId: 'university_id',
      operator: '=',
      value: draft.universityId,
    });
  }
  if (draft.courseId !== 'All') {
    conditions.push({
      id: `cond_course_${now}`,
      fieldId: 'course_id',
      operator: '=',
      value: draft.courseId,
    });
  }

  // 8. Geography: State & City
  if (draft.state !== 'All') {
    conditions.push({
      id: `cond_state_${now}`,
      fieldId: 'state',
      operator: '=',
      value: draft.state,
    });
  }
  if (draft.city.trim() !== '') {
    conditions.push({
      id: `cond_city_${now}`,
      fieldId: 'city',
      operator: 'contains',
      value: draft.city.trim(),
    });
  }

  // 9. Enterprise Partner / Channel
  if (draft.partnerId !== 'All') {
    if (draft.partnerId === 'direct') {
      conditions.push({
        id: `cond_partner_${now}`,
        fieldId: 'partner_id',
        operator: 'is_null',
        value: true,
      });
    } else {
      conditions.push({
        id: `cond_partner_${now}`,
        fieldId: 'partner_id',
        operator: '=',
        value: draft.partnerId,
      });
    }
  }

  // 10. Budget Band
  if (draft.budgetBand !== 'All') {
    conditions.push({
      id: `cond_budget_${now}`,
      fieldId: 'budget',
      operator: 'contains',
      value: draft.budgetBand,
    });
  }

  // 11. Enterprise AI & Predictive Intelligence
  if (draft.minAiScore !== undefined && draft.minAiScore > 0) {
    conditions.push({
      id: `cond_ai_score_${now}`,
      fieldId: 'ai_score',
      operator: '>=',
      value: draft.minAiScore,
    });
  }
  if (draft.dropOffRisk !== 'All') {
    conditions.push({
      id: `cond_drop_risk_${now}`,
      fieldId: 'drop_off_risk',
      operator: '=',
      value: draft.dropOffRisk,
    });
  }
  if (draft.minConversionProbability !== undefined && draft.minConversionProbability > 0) {
    conditions.push({
      id: `cond_conv_prob_${now}`,
      fieldId: 'conversion_probability',
      operator: '>=',
      value: draft.minConversionProbability,
    });
  }
  if (draft.urgency !== 'All') {
    conditions.push({
      id: `cond_urgency_${now}`,
      fieldId: 'urgency',
      operator: '=',
      value: draft.urgency,
    });
  }

  // 12. Created Date Range / Presets
  if (draft.datePreset !== 'all') {
    if (['today', 'yesterday', 'this_week', 'this_month'].includes(draft.datePreset)) {
      conditions.push({
        id: `cond_date_${now}`,
        fieldId: 'created_at',
        operator: draft.datePreset as FilterOperator,
        value: draft.datePreset,
      });
    } else if (draft.datePreset === 'last_7_days') {
      conditions.push({
        id: `cond_date_${now}`,
        fieldId: 'created_at',
        operator: 'relative_date',
        value: 'last_7_days',
      });
    } else if (draft.datePreset === 'custom' && (draft.customStartDate || draft.customEndDate)) {
      conditions.push({
        id: `cond_date_${now}`,
        fieldId: 'created_at',
        operator: 'between',
        value: [draft.customStartDate || '', draft.customEndDate || ''],
      });
    }
  }

  // 13. Follow-Up Deadlines (Admission SLA Schedule)
  if (draft.followUpPreset !== 'all') {
    if (draft.followUpPreset === 'overdue') {
      conditions.push({
        id: `cond_fu_${now}`,
        fieldId: 'final_follow_up_date',
        operator: 'before',
        value: new Date().toISOString(),
      });
    } else if (draft.followUpPreset === 'today') {
      conditions.push({
        id: `cond_fu_${now}`,
        fieldId: 'final_follow_up_date',
        operator: 'today',
        value: 'today',
      });
    } else if (draft.followUpPreset === 'this_week') {
      conditions.push({
        id: `cond_fu_${now}`,
        fieldId: 'final_follow_up_date',
        operator: 'this_week',
        value: 'this_week',
      });
    } else if (draft.followUpPreset === 'unassigned') {
      conditions.push({
        id: `cond_fu_${now}`,
        fieldId: 'final_follow_up_date',
        operator: 'is_null',
        value: true,
      });
    }
  }

  // 14. Last Call Recency
  if (draft.lastCallPreset !== 'all') {
    if (draft.lastCallPreset === 'never') {
      conditions.push({
        id: `cond_lc_${now}`,
        fieldId: 'last_call_date',
        operator: 'is_null',
        value: true,
      });
    } else if (draft.lastCallPreset === 'today') {
      conditions.push({
        id: `cond_lc_${now}`,
        fieldId: 'last_call_date',
        operator: 'today',
        value: 'today',
      });
    } else if (draft.lastCallPreset === 'not_3_days') {
      conditions.push({
        id: `cond_lc_${now}`,
        fieldId: 'last_call_date',
        operator: 'relative_date',
        value: 'last_3_days',
      });
    } else if (draft.lastCallPreset === 'not_7_days') {
      conditions.push({
        id: `cond_lc_${now}`,
        fieldId: 'last_call_date',
        operator: 'relative_date',
        value: 'last_7_days',
      });
    }
  }

  // 15. Call Attempts
  if (draft.callAttempts === '0') {
    conditions.push({
      id: `cond_calls_${now}`,
      fieldId: 'call_attempts',
      operator: '=',
      value: 0,
    });
  } else if (draft.callAttempts === '1-2') {
    conditions.push({
      id: `cond_calls_${now}`,
      fieldId: 'call_attempts',
      operator: 'between',
      value: [1, 2],
    });
  } else if (draft.callAttempts === '3_plus') {
    conditions.push({
      id: `cond_calls_${now}`,
      fieldId: 'call_attempts',
      operator: '>=',
      value: 3,
    });
  }

  // 16. Task Activity
  if (draft.taskFilter === 'has_pending') {
    conditions.push({
      id: `cond_task_${now}`,
      fieldId: 'has_pending_task',
      operator: '=',
      value: true,
    });
  } else if (draft.taskFilter === 'due_today') {
    conditions.push({
      id: `cond_task_${now}`,
      fieldId: 'task_due_today',
      operator: '=',
      value: true,
    });
  } else if (draft.taskFilter === 'overdue') {
    conditions.push({
      id: `cond_task_${now}`,
      fieldId: 'task_overdue',
      operator: '=',
      value: true,
    });
  }

  // 17. Engagement Channels
  if (draft.hasNoActivity) {
    conditions.push({
      id: `cond_no_act_${now}`,
      fieldId: 'has_no_activity',
      operator: '=',
      value: true,
    });
  }
  if (draft.hasWhatsApp) {
    conditions.push({
      id: `cond_wa_${now}`,
      fieldId: 'has_whatsapp_activity',
      operator: '=',
      value: true,
    });
  }
  if (draft.hasEmail) {
    conditions.push({
      id: `cond_em_${now}`,
      fieldId: 'has_email_activity',
      operator: '=',
      value: true,
    });
  }

  // 18. Min Score
  if (draft.minScore !== undefined && draft.minScore > 0) {
    conditions.push({
      id: `cond_score_${now}`,
      fieldId: 'lead_score',
      operator: '>=',
      value: draft.minScore,
    });
  }

  // 19. Custom Conditions
  if (draft.customConditions && draft.customConditions.length > 0) {
    conditions.push(...draft.customConditions);
  }

  return {
    rootGroup: {
      id: 'root',
      logic: draft.logic,
      conditions,
    },
  };
}

export function AdvancedFilterSidebar({
  isOpen,
  onClose,
  filterState,
  onFilterChange,
  onApply,
  onClear,
  counselors = [],
  leadsCount,
}: AdvancedFilterSidebarProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DrawerTab>('pipeline');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<string[]>(DEFAULT_PIPELINE_STAGES);
  const [universities, setUniversities] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string; university_id?: string }[]>([]);
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);

  const crmContext = user?.organizations?.find(o => o.id === user.activeOrganizationId)?.crm_context ?? undefined;
  const { categories, dispositions } = useDispositions(crmContext);

  // Internal draft state for the drawer
  const [draft, setDraft] = useState<LeadFilterDrawerState>(() =>
    parseFilterStateToDrawerState(filterState, user?.id)
  );

  // Sync draft whenever drawer opens or filterState changes externally
  useEffect(() => {
    if (isOpen) {
      setDraft(parseFilterStateToDrawerState(filterState, user?.id));
    }
  }, [isOpen, filterState, user?.id]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Load master data (universities, courses, partners, custom stages)
  useEffect(() => {
    if (!isOpen) return;
    async function loadMasterData() {
      try {
        const [stagesRes, unisRes, coursesRes, partnersRes] = await Promise.all([
          supabase.from('system_settings').select('value').eq('key', 'pipeline_stages').maybeSingle(),
          supabase.from('universities').select('id, name').order('name').limit(100),
          supabase.from('courses').select('id, name, university_id').order('name').limit(150),
          supabase.from('users').select('id, name').eq('is_active', true).order('name').limit(100),
        ]);

        if (stagesRes.data && Array.isArray(stagesRes.data.value) && stagesRes.data.value.length > 0) {
          setPipelineStages(stagesRes.data.value);
        }
        if (unisRes.data) setUniversities(unisRes.data);
        if (coursesRes.data) setCourses(coursesRes.data);
        if (partnersRes.data) setPartners(partnersRes.data);
      } catch (err) {
        console.warn('Could not fetch enterprise master data for filters:', err);
      }
    }
    loadMasterData();
  }, [isOpen]);

  // Filter child dispositions based on selected category
  const filteredDispositions = useMemo(() => {
    if (draft.dispositionCategory === 'All') return dispositions;
    return dispositions.filter(d => d.category_id === draft.dispositionCategory);
  }, [dispositions, draft.dispositionCategory]);

  // Filter courses based on selected university
  const filteredCourses = useMemo(() => {
    if (draft.universityId === 'All') return courses;
    return courses.filter(c => c.university_id === draft.universityId);
  }, [courses, draft.universityId]);

  if (!isOpen) return null;

  const priorities: { id: string; label: string; dotColor: string }[] = [
    { id: 'Urgent', label: 'Urgent', dotColor: 'bg-red-500' },
    { id: 'High', label: 'High', dotColor: 'bg-orange-500' },
    { id: 'Medium', label: 'Medium', dotColor: 'bg-amber-500' },
    { id: 'Low', label: 'Low', dotColor: 'bg-green-500' },
  ];

  const intentOptions: { id: LeadFilterDrawerState['intent']; label: string }[] = [
    { id: 'All', label: 'All Intent' },
    { id: 'HOT', label: '🔥 HOT' },
    { id: 'WARM', label: '⚡ WARM' },
    { id: 'COLD', label: '❄️ COLD' },
  ];

  const datePresets: { id: LeadFilterDrawerState['datePreset']; label: string }[] = [
    { id: 'all', label: 'All Dates' },
    { id: 'today', label: 'Created Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'custom', label: 'Custom Range' },
  ];

  const followUpPresets: { id: LeadFilterDrawerState['followUpPreset']; label: string }[] = [
    { id: 'all', label: 'All Follow-ups' },
    { id: 'overdue', label: '🚨 Overdue (Past Due)' },
    { id: 'today', label: '📅 Due Today' },
    { id: 'this_week', label: '🗓️ Due This Week' },
    { id: 'unassigned', label: '⚠️ No Follow-up Set' },
  ];

  const lastCallPresets: { id: LeadFilterDrawerState['lastCallPreset']; label: string }[] = [
    { id: 'all', label: 'All Times' },
    { id: 'never', label: '📞 Never Called' },
    { id: 'today', label: '📞 Called Today' },
    { id: 'not_3_days', label: '⏳ Not in 3+ Days' },
    { id: 'not_7_days', label: '⚠️ Not in 7+ Days' },
  ];

  // Count active dimensions per tab for badges
  const pipelineCount = [
    draft.statuses.length > 0,
    draft.intent !== 'All',
    draft.priorities.length > 0,
    draft.counselor !== 'All',
    draft.dispositionCategory !== 'All',
    draft.dispositionId !== 'All'
  ].filter(Boolean).length;

  const aiCount = [
    draft.minAiScore !== undefined && draft.minAiScore > 0,
    draft.dropOffRisk !== 'All',
    draft.minConversionProbability !== undefined && draft.minConversionProbability > 0,
    draft.urgency !== 'All'
  ].filter(Boolean).length;

  const activityCount = [
    draft.callAttempts !== 'all',
    draft.taskFilter !== 'all',
    draft.hasNoActivity === true,
    draft.hasWhatsApp === true,
    draft.hasEmail === true,
    draft.lastCallPreset !== 'all'
  ].filter(Boolean).length;

  const datesCount = [
    draft.datePreset !== 'all',
    draft.followUpPreset !== 'all'
  ].filter(Boolean).length;

  const academicCount = [
    draft.universityId !== 'All',
    draft.courseId !== 'All',
    draft.state !== 'All',
    Boolean(draft.city?.trim()),
    draft.sources.length > 0,
    draft.partnerId !== 'All',
    draft.budgetBand !== 'All'
  ].filter(Boolean).length;

  const rulesCount = [
    draft.minScore !== undefined && draft.minScore > 0,
    (draft.customConditions?.length ?? 0) > 0,
    draft.logic !== 'AND'
  ].filter(Boolean).length;

  const activeCount = pipelineCount + aiCount + activityCount + datesCount + academicCount + rulesCount;

  const handleApply = () => {
    const compiled = drawerStateToFilterState(draft, user?.id);
    onFilterChange(compiled);
    onApply();
    onClose();
  };

  const handleReset = () => {
    setDraft(INITIAL_LEAD_FILTERS);
    onFilterChange({ rootGroup: { id: 'root', logic: 'AND', conditions: [] } });
    if (onClear) onClear();
  };

  // Helper toggles for multi-select arrays
  const toggleStatus = (stage: string) => {
    setDraft(prev => {
      const exists = prev.statuses.includes(stage);
      return {
        ...prev,
        statuses: exists ? prev.statuses.filter(s => s !== stage) : [...prev.statuses, stage]
      };
    });
  };

  const togglePriority = (p: string) => {
    setDraft(prev => {
      const exists = prev.priorities.includes(p);
      return {
        ...prev,
        priorities: exists ? prev.priorities.filter(x => x !== p) : [...prev.priorities, p]
      };
    });
  };

  const toggleSource = (source: string) => {
    setDraft(prev => {
      const exists = prev.sources.includes(source);
      return {
        ...prev,
        sources: exists ? prev.sources.filter(s => s !== source) : [...prev.sources, source]
      };
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className="relative z-10 w-full sm:max-w-xl bg-card border-l border-border shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-label="Enterprise Advanced Lead Filters"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Filter className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 flex-wrap">
                <span>Enterprise Lead Filters</span>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                    {activeCount} active
                  </span>
                )}
                {leadsCount !== undefined && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ({leadsCount} leads)
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground truncate">Strategic cohorts, predictive AI scoring, SLA deadlines & channels</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                title="Reset all filters"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              title="Close filter drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Enterprise Match Logic Selector & Executive Cohorts */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-border/80 bg-muted/10 shrink-0 space-y-2.5">
          {/* Top Row: Aggregation Mode Toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Strategic Executive Cohorts
            </span>
            <div className="flex items-center gap-1 bg-card border border-border p-0.5 rounded-lg shadow-2xs">
              <span className="text-[10px] font-bold text-muted-foreground px-1.5 uppercase">Match:</span>
              <button
                type="button"
                onClick={() => setDraft(prev => ({ ...prev, logic: 'AND' }))}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-bold transition-all",
                  draft.logic === 'AND'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Narrow down: lead must match ALL filters"
              >
                ALL (AND)
              </button>
              <button
                type="button"
                onClick={() => setDraft(prev => ({ ...prev, logic: 'OR' }))}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-bold transition-all",
                  draft.logic === 'OR'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Broaden search: lead matches ANY filter"
              >
                ANY (OR)
              </button>
            </div>
          </div>

          {/* 1-Click Executive Cohort Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {/* 1. Golden Cohort: High Intent, Low Touch */}
            <button
              type="button"
              onClick={() => setDraft(prev => ({
                ...prev,
                intent: 'HOT',
                callAttempts: prev.callAttempts === '0' ? 'all' : '0'
              }))}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1",
                draft.intent === 'HOT' && draft.callAttempts === '0'
                  ? "bg-amber-500/20 border-amber-500/60 text-amber-700 dark:text-amber-300 font-bold shadow-xs"
                  : "bg-background border-border text-foreground hover:bg-muted"
              )}
              title="High intent leads with zero calls yet"
            >
              🎯 Golden Cohort (Untouched Hot)
            </button>

            {/* 2. Critical Churn: High Drop-Off Risk */}
            <button
              type="button"
              onClick={() => setDraft(prev => ({
                ...prev,
                dropOffRisk: prev.dropOffRisk === 'High' ? 'All' : 'High'
              }))}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1",
                draft.dropOffRisk === 'High'
                  ? "bg-red-500/20 border-red-500/60 text-red-700 dark:text-red-300 font-bold shadow-xs"
                  : "bg-background border-border text-foreground hover:bg-muted"
              )}
              title="Leads at high risk of dropping out"
            >
              ⚠️ High Drop-Off Risk
            </button>

            {/* 3. SLA Breach: Overdue Follow-ups */}
            <button
              type="button"
              onClick={() => setDraft(prev => ({
                ...prev,
                followUpPreset: prev.followUpPreset === 'overdue' ? 'all' : 'overdue',
              }))}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1",
                draft.followUpPreset === 'overdue'
                  ? "bg-rose-500/20 border-rose-500/60 text-rose-700 dark:text-rose-300 font-bold shadow-xs"
                  : "bg-background border-border text-foreground hover:bg-muted"
              )}
            >
              🚨 Overdue Follow-ups
            </button>

            {/* 4. Active Pipeline: Mid-Funnel */}
            <button
              type="button"
              onClick={() => setDraft(prev => ({
                ...prev,
                statuses: prev.statuses.includes('Qualified') && prev.statuses.includes('Application')
                  ? []
                  : ['Qualified', 'Application', 'Docs Pending']
              }))}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1",
                draft.statuses.includes('Qualified') && draft.statuses.includes('Application')
                  ? "bg-teal-500/20 border-teal-500/60 text-teal-700 dark:text-teal-300 font-bold shadow-xs"
                  : "bg-background border-border text-foreground hover:bg-muted"
              )}
            >
              📊 Active Applicants
            </button>

            {/* 5. My Leads */}
            <button
              type="button"
              onClick={() => setDraft(prev => ({
                ...prev,
                counselor: prev.counselor === 'me' ? 'All' : 'me',
              }))}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1",
                draft.counselor === 'me'
                  ? "bg-primary/20 border-primary/60 text-primary font-bold shadow-xs"
                  : "bg-background border-border text-foreground hover:bg-muted"
              )}
            >
              👤 My Leads
            </button>

            {/* 6. High Predictive Conversion */}
            <button
              type="button"
              onClick={() => setDraft(prev => ({
                ...prev,
                minConversionProbability: prev.minConversionProbability === 0.7 ? undefined : 0.7
              }))}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1",
                draft.minConversionProbability === 0.7
                  ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs"
                  : "bg-background border-border text-foreground hover:bg-muted"
              )}
            >
              📈 High Conv (&gt;70%)
            </button>

            {/* 7. Untouched */}
            <button
              type="button"
              onClick={() => setDraft(prev => ({
                ...prev,
                hasNoActivity: !prev.hasNoActivity
              }))}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1",
                draft.hasNoActivity
                  ? "bg-purple-500/20 border-purple-500/60 text-purple-700 dark:text-purple-300 font-bold shadow-xs"
                  : "bg-background border-border text-foreground hover:bg-muted"
              )}
            >
              💤 Untouched Leads
            </button>
          </div>
        </div>

        {/* Categorized Tabs Header */}
        <div className="px-4 sm:px-6 pt-2 pb-0 border-b border-border bg-card flex items-center gap-1 overflow-x-auto hide-scrollbar shrink-0">
          {[
            { id: 'pipeline', label: 'Pipeline & Funnel', icon: Target, count: pipelineCount },
            { id: 'ai', label: 'Predictive AI', icon: Brain, count: aiCount },
            { id: 'activity', label: 'Activity & Calls', icon: PhoneCall, count: activityCount },
            { id: 'dates', label: 'SLA & Dates', icon: Calendar, count: datesCount },
            { id: 'academic', label: 'Academic & Partner', icon: GraduationCap, count: academicCount },
            { id: 'rules', label: 'Rules & Logic', icon: Sliders, count: rulesCount },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DrawerTab)}
                className={cn(
                  "px-3 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap touch-manipulation",
                  isActive
                    ? "border-primary text-primary font-bold bg-primary/5 rounded-t-lg"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-t-lg"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-primary/20 text-primary">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">

          {/* TAB 1: PIPELINE & FUNNEL */}
          {activeTab === 'pipeline' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Pipeline Stage Pills (Multi-Select) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Pipeline Stages (Multi-Select)
                    </label>
                    <span className="text-[11px] text-muted-foreground">Select one or multiple stages to filter</span>
                  </div>
                  {draft.statuses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, statuses: [] }))}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Clear Stages ({draft.statuses.length})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, statuses: [] }))}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                      draft.statuses.length === 0
                        ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    )}
                  >
                    All Stages
                  </button>
                  {pipelineStages.map(stage => {
                    const isSelected = draft.statuses.includes(stage);
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => toggleStatus(stage)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center truncate flex items-center justify-center gap-1.5",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                            : "bg-background border-border text-foreground hover:bg-muted"
                        )}
                        title={stage}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{stage}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Intent */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" /> Lead Intent
                  </label>
                  {draft.intent !== 'All' && (
                    <button
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, intent: 'All' }))}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Reset Intent
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {intentOptions.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, intent: item.id }))}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                        draft.intent === item.id
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority (Multi-Select) */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Priority Level (Multi-Select)
                    </label>
                  </div>
                  {draft.priorities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, priorities: [] }))}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Clear Priorities
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, priorities: [] }))}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                      draft.priorities.length === 0
                        ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    )}
                  >
                    All
                  </button>
                  {priorities.map(p => {
                    const isSelected = draft.priorities.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePriority(p.id)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                            : "bg-background border-border text-foreground hover:bg-muted"
                        )}
                      >
                        <span className={cn("w-2 h-2 rounded-full", p.dotColor)} />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Counselor */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Assigned Counselor
                </label>
                <select
                  value={draft.counselor}
                  onChange={(e) => setDraft(prev => ({ ...prev, counselor: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  <option value="All">All Counselors / Team Members</option>
                  <option value="me">👤 Assigned to Me</option>
                  <option value="unassigned">⚠️ Unassigned Leads</option>
                  {counselors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.role_name ? `(${c.role_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dispositions */}
              <div className="pt-4 border-t border-border/60 space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Disposition & Call Outcome
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block mb-1">Category</span>
                    <select
                      value={draft.dispositionCategory}
                      onChange={(e) => {
                        const catId = e.target.value;
                        setDraft(prev => ({
                          ...prev,
                          dispositionCategory: catId,
                          dispositionId: 'All'
                        }));
                      }}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    >
                      <option value="All">All Categories</option>
                      {categories.map((cat: DispositionCategory) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block mb-1">Specific Disposition</span>
                    <select
                      value={draft.dispositionId}
                      onChange={(e) => setDraft(prev => ({ ...prev, dispositionId: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    >
                      <option value="All">All Dispositions</option>
                      {filteredDispositions.map((disp: Disposition) => (
                        <option key={disp.id} value={disp.id}>{disp.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENTERPRISE PREDICTIVE AI */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Drop-Off Risk Assessment */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> Retention & Drop-Off Risk
                  </label>
                  {draft.dropOffRisk !== 'All' && (
                    <button
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, dropOffRisk: 'All' }))}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Reset Risk
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'All', label: 'All Risks' },
                    { id: 'High', label: 'High Risk ⚠️', color: 'border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10' },
                    { id: 'Medium', label: 'Medium ⚡', color: 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10' },
                    { id: 'Low', label: 'Low Risk ✅', color: 'border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, dropOffRisk: opt.id as any }))}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                        draft.dropOffRisk === opt.id
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversion Probability Threshold */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> AI Conversion Probability
                  </label>
                  {draft.minConversionProbability !== undefined && (
                    <button
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, minConversionProbability: undefined }))}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'All', value: undefined },
                    { label: '🔥 80%+', value: 0.8 },
                    { label: '📈 60%+', value: 0.6 },
                    { label: '⚡ 40%+', value: 0.4 },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, minConversionProbability: opt.value }))}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                        draft.minConversionProbability === opt.value
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Predictive Score */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-violet-500" /> AI Predictive Score (0-100)
                  </label>
                  {draft.minAiScore !== undefined && (
                    <button
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, minAiScore: undefined }))}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Reset Score
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'All Scores', value: undefined },
                    { label: '🏆 85+ Elite', value: 85 },
                    { label: '⭐ 70+ High', value: 70 },
                    { label: '✨ 50+ Med', value: 50 },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, minAiScore: opt.value }))}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                        draft.minAiScore === opt.value
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead Urgency */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Lead Decision Urgency
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'All', label: 'All Urgency' },
                    { id: 'Immediate', label: '⚡ Immediate' },
                    { id: 'High', label: 'High' },
                    { id: 'Medium', label: 'Medium' },
                    { id: 'Low', label: 'Low' },
                  ].map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, urgency: u.id as any }))}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                        draft.urgency === u.id
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      )}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY & CALLS */}
          {activeTab === 'activity' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Call Attempts Pills */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5" /> Call Attempts
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'all', label: 'Any Calls' },
                    { id: '0', label: '0 Calls (Never Called)' },
                    { id: '1-2', label: '1 - 2 Calls' },
                    { id: '3_plus', label: '3+ Calls' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, callAttempts: opt.id as any }))}
                      className={cn(
                        "px-2.5 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                        draft.callAttempts === opt.id
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Last Call Recency */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Last Contact / Call Recency
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {lastCallPresets.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, lastCallPreset: preset.id }))}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                        draft.lastCallPreset === preset.id
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task Status on Lead */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5" /> Task Status on Lead
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'all', label: 'Any Task State' },
                    { id: 'has_pending', label: 'Pending Task' },
                    { id: 'due_today', label: 'Due Today' },
                    { id: 'overdue', label: 'Overdue Task' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, taskFilter: opt.id as any }))}
                      className={cn(
                        "px-2.5 py-2 rounded-lg text-xs font-medium border transition-all text-center truncate",
                        draft.taskFilter === opt.id
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-Channel Engagement Toggles */}
              <div className="pt-4 border-t border-border/60 space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Engagement & Outreach Channels
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, hasNoActivity: !prev.hasNoActivity }))}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all flex flex-col gap-1",
                      draft.hasNoActivity
                        ? "bg-purple-500/10 border-purple-500/50 text-purple-700 dark:text-purple-300"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      💤 Untouched Leads
                    </span>
                    <span className="text-[11px] text-muted-foreground">Zero calls, zero notes or tasks logged</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, hasWhatsApp: !prev.hasWhatsApp }))}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all flex flex-col gap-1",
                      draft.hasWhatsApp
                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> Has WhatsApp
                    </span>
                    <span className="text-[11px] text-muted-foreground">Contains WhatsApp message history</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, hasEmail: !prev.hasEmail }))}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all flex flex-col gap-1",
                      draft.hasEmail
                        ? "bg-blue-500/10 border-blue-500/50 text-blue-700 dark:text-blue-300"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-500" /> Has Email
                    </span>
                    <span className="text-[11px] text-muted-foreground">Contains Email outreach history</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SLA & DATES */}
          {activeTab === 'dates' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Follow-Up Deadlines (Crucial for Admission CRMs) */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Follow-Up Due Date (SLA Schedule)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {followUpPresets.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, followUpPreset: preset.id }))}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                        draft.followUpPreset === preset.id
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Created Date Presets & Custom Range */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Lead Creation Date
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {datePresets.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, datePreset: preset.id }))}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                        draft.datePreset === preset.id
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {draft.datePreset === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 pt-2 p-3 bg-muted/20 border border-border rounded-lg animate-in fade-in duration-200">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">From Date</label>
                      <input
                        type="date"
                        value={draft.customStartDate || ''}
                        onChange={(e) => setDraft(prev => ({ ...prev, customStartDate: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">To Date</label>
                      <input
                        type="date"
                        value={draft.customEndDate || ''}
                        onChange={(e) => setDraft(prev => ({ ...prev, customEndDate: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: ACADEMIC & PARTNERS */}
          {activeTab === 'academic' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Target University / Partner */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Target University / Institute
                </label>
                <select
                  value={draft.universityId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraft(prev => ({
                      ...prev,
                      universityId: val,
                      courseId: 'All'
                    }));
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  <option value="All">All Universities & Partners</option>
                  {universities.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Target Course / Program */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" /> Target Course / Program
                </label>
                <select
                  value={draft.courseId}
                  onChange={(e) => setDraft(prev => ({ ...prev, courseId: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  <option value="All">All Courses & Programs</option>
                  {filteredCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Channel Partner / B2B Agency */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" /> Channel Partner / Sourcing Agency
                </label>
                <select
                  value={draft.partnerId}
                  onChange={(e) => setDraft(prev => ({ ...prev, partnerId: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  <option value="All">All Sourcing Channels (Direct & Partners)</option>
                  <option value="direct">Direct Only (No Partner / Agency)</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Budget Band */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Budget / Fee Band
                </label>
                <select
                  value={draft.budgetBand}
                  onChange={(e) => setDraft(prev => ({ ...prev, budgetBand: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  {BUDGET_BANDS.map(b => (
                    <option key={b} value={b}>{b === 'All' ? 'All Budget Ranges' : b}</option>
                  ))}
                </select>
              </div>

              {/* State & City */}
              <div className="pt-4 border-t border-border/60 space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Student Location
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block mb-1">State</span>
                    <select
                      value={draft.state}
                      onChange={(e) => setDraft(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    >
                      {COMMON_STATES.map(st => (
                        <option key={st} value={st}>{st === 'All' ? 'All States' : st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block mb-1">City</span>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai, Bangalore..."
                      value={draft.city}
                      onChange={(e) => setDraft(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Sources (Multi-Select) */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Lead Sources (Multi-Select)
                  </label>
                  {draft.sources.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, sources: [] }))}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Clear Sources ({draft.sources.length})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, sources: [] }))}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                      draft.sources.length === 0
                        ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    )}
                  >
                    All Sources
                  </button>
                  {COMMON_SOURCES.map(source => {
                    const isSelected = draft.sources.includes(source);
                    return (
                      <button
                        key={source}
                        type="button"
                        onClick={() => toggleSource(source)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center truncate flex items-center justify-center gap-1.5",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                            : "bg-background border-border text-foreground hover:bg-muted"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{source}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: RULES & LOGIC */}
          {activeTab === 'rules' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Aggregation Rules */}
              <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-2">
                <span className="text-xs font-bold text-foreground block">Condition Aggregation Logic</span>
                <p className="text-[11px] text-muted-foreground">
                  Choose whether leads must meet <strong>ALL</strong> active filters (strict intersection) or <strong>ANY</strong> filter (broad union).
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, logic: 'AND' }))}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold border transition-all",
                      draft.logic === 'AND'
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    )}
                  >
                    Match ALL Filters (AND)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, logic: 'OR' }))}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold border transition-all",
                      draft.logic === 'OR'
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    )}
                  >
                    Match ANY Filter (OR)
                  </button>
                </div>
              </div>

              {/* Minimum Lead Score */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Minimum Lead Score
                  </label>
                  {draft.minScore !== undefined && (
                    <button
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, minScore: undefined }))}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Reset Score
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'All Scores', value: undefined },
                    { label: '🔥 Hot (80+)', value: 80 },
                    { label: '📈 High-Conv (85+)', value: 85 },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, minScore: opt.value }))}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                        draft.minScore === opt.value
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Order */}
              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5" /> Table Sorting
                </label>
                <select
                  value={draft.sortBy || 'created_desc'}
                  onChange={(e) => setDraft(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  <option value="created_desc">Created Date: Newest First</option>
                  <option value="created_asc">Created Date: Oldest First</option>
                  <option value="score_desc">Lead Score: Highest First</option>
                  <option value="priority_desc">Priority: Urgent &gt; High &gt; Medium &gt; Low</option>
                  <option value="last_call_desc">Last Call: Most Recent First</option>
                </select>
              </div>

              {/* Power-User Custom SQL Conditions */}
              <div className="pt-4 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" /> Granular Custom Predicates ({draft.customConditions.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newCond: FilterCondition = {
                        id: `custom_${Date.now()}`,
                        fieldId: 'notes_count',
                        operator: '>=',
                        value: 1,
                      };
                      setDraft(prev => ({
                        ...prev,
                        customConditions: [...prev.customConditions, newCond]
                      }));
                    }}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Custom Rule
                  </button>
                </div>

                {draft.customConditions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-lg border border-border">
                    No custom predicates added. Power users can add granular conditions for special edge cases.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {draft.customConditions.map((cond) => {
                      const field = FILTER_FIELD_MAP[cond.fieldId] || FILTER_FIELDS[0];
                      return (
                        <div key={cond.id} className="p-3 bg-background border border-border rounded-lg space-y-2 relative group">
                          <button
                            type="button"
                            onClick={() => setDraft(prev => ({
                              ...prev,
                              customConditions: prev.customConditions.filter(c => c.id !== cond.id)
                            }))}
                            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive p-1 rounded"
                            title="Remove condition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="grid grid-cols-3 gap-2 pr-6">
                            <select
                              value={cond.fieldId}
                              onChange={(e) => {
                                const newField = e.target.value;
                                setDraft(prev => ({
                                  ...prev,
                                  customConditions: prev.customConditions.map(c => c.id === cond.id ? { ...c, fieldId: newField } : c)
                                }));
                              }}
                              className="px-2 py-1.5 bg-card border border-border rounded text-xs"
                            >
                              {FILTER_FIELDS.map(f => (
                                <option key={f.id} value={f.id}>{f.label}</option>
                              ))}
                            </select>

                            <select
                              value={cond.operator}
                              onChange={(e) => {
                                const newOp = e.target.value as FilterOperator;
                                setDraft(prev => ({
                                  ...prev,
                                  customConditions: prev.customConditions.map(c => c.id === cond.id ? { ...c, operator: newOp } : c)
                                }));
                              }}
                              className="px-2 py-1.5 bg-card border border-border rounded text-xs"
                            >
                              {(field.operators || ['=', '!=']).map(op => (
                                <option key={op} value={op}>{op}</option>
                              ))}
                            </select>

                            <input
                              type="text"
                              value={cond.value || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDraft(prev => ({
                                  ...prev,
                                  customConditions: prev.customConditions.map(c => c.id === cond.id ? { ...c, value: val } : c)
                                }));
                              }}
                              placeholder="Value..."
                              className="px-2 py-1.5 bg-card border border-border rounded text-xs"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-border bg-card/95 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between sm:justify-start gap-2 order-2 sm:order-1">
            <button
              type="button"
              onClick={handleReset}
              disabled={activeCount === 0}
              className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive disabled:opacity-40 transition-colors touch-manipulation"
            >
              Clear all
            </button>

            <button
              type="button"
              onClick={() => setIsSaveModalOpen(true)}
              disabled={activeCount === 0}
              className="px-3 py-2 text-xs font-medium bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-secondary-foreground rounded-lg transition-colors flex items-center gap-1.5 border border-border touch-manipulation"
              title="Save current configuration as a view"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save View</span>
            </button>
          </div>

          <div className="flex items-center gap-2 order-1 sm:order-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 text-xs font-medium bg-muted hover:bg-muted/80 text-foreground rounded-xl sm:rounded-lg transition-colors touch-manipulation"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="flex-1 sm:flex-initial px-5 py-2.5 sm:py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl sm:rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-1.5 touch-manipulation"
            >
              <Check className="w-4 h-4" />
              <span>Apply Filters {activeCount > 0 ? `(${activeCount})` : ''}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save View Modal Integration */}
      <SaveViewModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        filterState={drawerStateToFilterState(draft, user?.id)}
      />
    </div>
  );
}

export const LeadFilterDrawer = AdvancedFilterSidebar;
export default AdvancedFilterSidebar;
