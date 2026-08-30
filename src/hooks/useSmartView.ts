import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Lead } from '../types/schema';
import { useAuth } from '../contexts/AuthContext';
import { SMART_VIEWS, SmartViewId, SmartViewConfig, getSmartView } from '../constants/smartViews';
import { DEFAULT_PIPELINE_STAGES } from '../constants/pipelineStages';
import { startOfDay, subDays, addDays } from 'date-fns';
import { getCategoryByName, getDispositionIdsByCategory } from './useDispositions';
import { DispositionCategory, Disposition } from '../types/disposition';

export interface StageCount {
  stage: string;
  count: number;
}

interface SmartViewConfigRecord {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  visible_in_ui: boolean;
  order_index: number;
  icon: string;
  filterType: string;
}

const DEFAULT_VIEWS: SmartViewConfigRecord[] = SMART_VIEWS.map((sv, idx) => ({
  id: sv.id,
  name: sv.name,
  description: sv.description,
  enabled: true,
  visible_in_ui: true,
  order_index: idx,
  icon: sv.icon,
  filterType: sv.filterType,
}));

export interface UseSmartViewOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: { field: string; direction: 'asc' | 'desc' } | null;
}

export interface UseSmartViewOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: { field: string; direction: 'asc' | 'desc' } | null;
}

export function useSmartView(viewId: SmartViewId | string | undefined, options?: UseSmartViewOptions) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalCount, setCount] = useState(0);
  const [stageCounts, setStageCounts] = useState<StageCount[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const [savedViews, setSavedViews] = useState<SmartViewConfigRecord[]>([]);
  const [categories, setCategories] = useState<DispositionCategory[]>([]);
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [configLoaded, setConfigLoaded] = useState(false);

  const loadDispositionConfig = useCallback(async () => {
    try {
      const [catsRes, dispRes] = await Promise.all([
        supabase.from('disposition_categories').select('*').eq('is_active', true).order('order_index', { ascending: true }),
        supabase.from('dispositions').select('*').eq('is_active', true).order('order_index', { ascending: true })
      ]);
      if (!catsRes.error) setCategories(catsRes.data || []);
      if (!dispRes.error) setDispositions(dispRes.data || []);
      setConfigLoaded(true);
    } catch (err: any) {
      console.error('Failed to load disposition config', err);
      setConfigLoaded(true);
    }
  }, []);

  const notConnectedCatId = useMemo(() => {
    const cat = getCategoryByName(categories, 'NOT CONNECTED');
    return cat?.id || null;
  }, [categories]);

  const interestedCatId = useMemo(() => {
    const cat = getCategoryByName(categories, 'INTEREST / INTENT');
    return cat?.id || null;
  }, [categories]);

  const notConnectedDispositionIds = useMemo(() => {
    if (!notConnectedCatId) return [];
    return getDispositionIdsByCategory(notConnectedCatId, dispositions);
  }, [notConnectedCatId, dispositions]);

  const interestedDispositionIds = useMemo(() => {
    if (!interestedCatId) return [];
    return getDispositionIdsByCategory(interestedCatId, dispositions);
  }, [interestedCatId, dispositions]);

  const connectedDispositionIds = useMemo(() => {
    return dispositions.filter(d => d.category_id !== notConnectedCatId && d.category_id !== null).map(d => d.id);
  }, [notConnectedCatId, dispositions]);

  useEffect(() => {
    const loadConfig = async () => {
      await loadDispositionConfig();
      const { data, error: configError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'smart_views_config')
        .maybeSingle();

      if (!configError && data?.value && Array.isArray(data.value)) {
        setSavedViews(data.value);
      } else {
        setSavedViews(DEFAULT_VIEWS);
      }
    };
    loadConfig();
  }, []);

  const viewConfig = useMemo(() => {
    return savedViews.find(v => v.id === viewId);
  }, [viewId, savedViews]);

  // Skip fetching if this view is disabled in admin config
  const isViewEnabled = !viewConfig || viewConfig.enabled;

  const view = useMemo(() => getSmartView(viewId), [viewId]);

  const isSuperAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';

   const fetchLeads = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (!configLoaded) {
      return;
    }
    if (!isViewEnabled) {
      setLeads([]);
      setCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startOfToday = startOfDay(now);
      const startOf3DaysAgo = subDays(startOfToday, 2);
      const endOfToday = startOfDay(addDays(now, 1));

      const buildBaseQuery = (columns = `
        *,
        counselor:users!leads_counselor_id_fkey(name),
        university:universities(name),
        course:courses(name),
        disposition:dispositions!leads_latest_disposition_id_fkey(name, target_status)
      `) => {
        let query = supabase
          .from('leads')
          .select(columns, { count: 'exact' })
          .is('deleted_at', null);

        // RBAC - non-admins only see their own assigned leads
        if (!isSuperAdmin) {
          query = query.eq('assigned_counselor', user.id);
        }

        return query;
      };

      const applySearch = (query: any) => {
        if (options?.search) {
          query = query.or(`first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%,phone.ilike.%${options.search}%,lead_number.ilike.%${options.search}%`);
        }
        return query;
      };

      const applySort = (query: any) => {
        if (options?.sort) {
          let field = options.sort.field;
          if (field === 'name') field = 'first_name';
          if (field === 'status') field = 'lead_status';
          if (field === 'score') field = 'lead_score';
          if (field === 'createdAt') field = 'created_at';
          if (field === 'callAttempts') field = 'call_attempts';
          if (field === 'interactionsCount') field = 'interactions_count';
          if (field === 'lastCallDate') field = 'last_call_date';
          if (field === 'finalFollowUpDate') field = 'final_follow_up_date';
          if (field === 'transitionToFallOut') field = 'transition_to_fallout_at';
          if (field === 'transitionToCounselled') field = 'transition_to_counselled_at';
          if (field === 'transitionToOBInitiated') field = 'transition_to_ob_initiated_at';
          if (field === 'transitionToOffer') field = 'transition_to_offer_at';
          // transition_to_admitted_at and transition_to_verification_pending_at don't exist in DB schema
          if (field === 'transitionToConverted') field = 'transition_to_converted_at';
          if (field === 'transitionToScreening') field = 'transition_to_screening_at';
          // Derived/removed fields - fallback to created_at for sorting
          if (['assignmentDate', 'firstAssignmentDate', 'firstCallDate', 'contactedTimestamp', 'conversionDate', 'managerPrioritized', 'moreThan5MContactedTime', 'moreThan10MContactedTime', 'moreThan15MContactedTime', 'transitionToAdmitted', 'transitionToVerificationPending'].includes(field)) {
            field = 'created_at';
          }
          query = query.order(field, { ascending: options.sort.direction === 'asc' });
        } else {
          query = query.order('created_at', { ascending: false });
        }
        return query;
      };

      const applyPagination = (query: any) => {
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 25;
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;
        return query.range(start, end);
      };

      const mapLeads = async (data: any[]): Promise<Lead[]> => {
        if (data.length === 0) return [];

        // Fetch derived data for assignment dates, call dates, and contact timestamps
        const leadIds = data.map(d => d.id);
        let assignmentsMap = new Map<string, any[]>();
        let callsMap = new Map<string, any[]>();
        let dispositionHistoryMap = new Map<string, any[]>();
        let documentsMap = new Map<string, any[]>();

        // Fetch lead assignments for assignment dates
        const { data: assignmentData } = await supabase
          .from('lead_assignments')
          .select('lead_id, assignee_id, assigned_at, assigned_by, is_active')
          .in('lead_id', leadIds)
          .order('assigned_at', { ascending: true });

        if (assignmentData) {
          assignmentData.forEach((a: any) => {
            const arr = assignmentsMap.get(a.lead_id) || [];
            arr.push(a);
            assignmentsMap.set(a.lead_id, arr);
          });
        }

        // Fetch call data for first call dates and duration thresholds
        const { data: callData } = await supabase
          .from('calls')
          .select('lead_id, duration_seconds, created_at, status')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: true });

        if (callData) {
          callData.forEach((c: any) => {
            const arr = callsMap.get(c.lead_id) || [];
            arr.push(c);
            callsMap.set(c.lead_id, arr);
          });
        }

        // Fetch disposition history for contacted timestamps and transition events
        const { data: dispositionHistoryData } = await supabase
          .from('lead_disposition_history')
          .select('lead_id, new_status, previous_status, created_at')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: true });

        if (dispositionHistoryData) {
          dispositionHistoryData.forEach((d: any) => {
            const arr = dispositionHistoryMap.get(d.lead_id) || [];
            arr.push(d);
            dispositionHistoryMap.set(d.lead_id, arr);
          });
        }

        // Fetch document verification data
        const { data: documentsData } = await supabase
          .from('documents')
          .select('lead_id, verification_status, verification_date, created_at')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: true });

        if (documentsData) {
          documentsData.forEach((doc: any) => {
            const arr = documentsMap.get(doc.lead_id) || [];
            arr.push(doc);
            documentsMap.set(doc.lead_id, arr);
          });
        }

        return data.map((d: any) => {
          const assignments = assignmentsMap.get(d.id) || [];
          const calls = callsMap.get(d.id) || [];
          const dispositionHistory = dispositionHistoryMap.get(d.id) || [];
          const documents = documentsMap.get(d.id) || [];

          // Derive Assignment Date (latest active assignment)
          const latestAssignment = assignments.filter((a: any) => a.is_active).sort((x: any, y: any) => new Date(y.assigned_at).getTime() - new Date(x.assigned_at).getTime())[0];
          const assignmentDate = latestAssignment?.assigned_at || null;

          // Derive First Assignment Date (earliest assignment ever)
          const firstAssignment = assignments.sort((x: any, y: any) => new Date(x.assigned_at).getTime() - new Date(y.assigned_at).getTime())[0];
          const firstAssignmentDate = firstAssignment?.assigned_at || null;

          // Derive First Call Date
          const firstCall = calls.sort((x: any, y: any) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime())[0];
          const firstCallDate = firstCall?.created_at || null;

          // Derive Contacted Timestamp
          const contactedHistory = dispositionHistory.find((h: any) => h.new_status !== 'New' && h.new_status !== 'Inquiry');
          const contactedTimestamp = contactedHistory?.created_at || null;

          // Derive time-based contact flags from cumulative call durations
          const totalCallDuration = calls.reduce((sum: number, c: any) => {
            if (c.status !== 'failed' && c.status !== 'missed') {
              return sum + (c.duration_seconds || 0);
            }
            return sum;
          }, 0);
          const moreThan5M = totalCallDuration >= 300;
          const moreThan10M = totalCallDuration >= 600;
          const moreThan15M = totalCallDuration >= 900;

          // Derive Transition to Admitted
          const admittedTransition = dispositionHistory.find((h: any) => h.new_status === 'Admitted');
          const transitionToAdmitted = admittedTransition?.created_at || d.transition_to_admitted_at || null;

          // Derive Transition to Verification Pending
          const verificationTransition = dispositionHistory.find((h: any) => 
            h.new_status?.toLowerCase().includes('verification') || 
            h.new_status?.toLowerCase().includes('docs')
          );
          
          // Also check documents table for verification pending status
          const docVerificationPending = documents.find((doc: any) => 
            doc.verification_status?.toLowerCase().includes('pending') ||
            doc.verification_status?.toLowerCase().includes('under review')
          );
          
          const transitionToVerificationPending = 
            verificationTransition?.created_at || 
            docVerificationPending?.verification_date ||
            d.transition_to_verification_pending_at || 
            null;

          return {
            id: d.id,
            leadNumber: d.lead_number,
            firstName: d.first_name,
            lastName: d.last_name || '',
            name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
            email: d.email,
            phone: d.phone,
            alternatePhone: d.alternate_phone,
            state: d.state,
            city: d.city,
            country: d.country,
            budget: d.budget,
            leadSource: d.lead_source,
            source: d.lead_source,
            leadStatus: d.lead_status,
            status: d.lead_status,
            priority: d.priority,
            leadScore: d.lead_score,
            score: d.lead_score,
            preferredLanguage: d.preferred_language,
            counselingMode: d.counseling_mode,
            notesCount: d.notes_count || 0,
            tasksCount: d.tasks_count || 0,
            admissionStatus: d.admission_status,
            assignedCounselor: d.assigned_counselor,
            counselorId: d.assigned_counselor,
            universityId: d.university_id,
            courseId: d.course_id,
            latestDispositionId: d.latest_disposition_id,
            latestSubDispositionId: d.latest_sub_disposition_id,
            latestDispositionName: d.disposition?.name,
            latestDispositionTargetStatus: d.disposition?.target_status,
            nextActionDate: d.next_action_date,
            createdAt: d.created_at,
            counselorName: d.counselor?.name,
            universityName: d.university?.name,
            courseName: d.course?.name,
            temperature: d.temperature,
            tags: d.tags || [],
            conversionProbability: d.conversion_probability,

            // Activity Summary Fields (computed via triggers)
            callAttempts: d.call_attempts || 0,
            interactionsCount: d.interactions_count || 0,
            lastCallDate: d.last_call_date,
            finalFollowUpDate: d.final_follow_up_date,
            
            // Derived fields
            assignmentDate: assignmentDate,
            firstAssignmentDate: firstAssignmentDate,
            firstCallDate: firstCallDate,
            contactedTimestamp: contactedTimestamp,
            moreThan5MContactedTime: moreThan5M,
            moreThan10MContactedTime: moreThan10M,
            moreThan15MContactedTime: moreThan15M,
            conversionDate: d.transition_to_converted_at || null,
            managerPrioritized: d.priority === 'High',
            transitionToFallOut: d.transition_to_fallout_at,
            transitionToCounselled: d.transition_to_counselled_at,
            transitionToOBInitiated: d.transition_to_ob_initiated_at,
            transitionToAdmitted: transitionToAdmitted,
            transitionToOffer: d.transition_to_offer_at,
            transitionToVerificationPending: transitionToVerificationPending,
            transitionToConverted: d.transition_to_converted_at,
            transitionToScreening: d.transition_to_screening_at,
            updatedAt: d.updated_at,
            deletedAt: d.deleted_at,
          };
        });
      };

      let allData: any[] = [];
      let count = 0;
      let skipDefaultSet = false;

      if (!view) {
        const query = await buildBaseQuery().order('created_at', { ascending: false });
        const { data, count: cnt, error } = await applyPagination(query);
        if (error) throw error;
        allData = data || [];
        count = cnt || 0;
      } else {
        switch (view.id) {
          case 'last_3_days': {
            const { data, count: cnt, error } = await applyPagination(
              applySort(
                applySearch(
                  buildBaseQuery()
                    .gte('created_at', startOf3DaysAgo.toISOString())
                    .lt('created_at', endOfToday.toISOString())
                )
              )
            );
            if (error) throw error;
            allData = data || [];
            count = cnt || 0;
            break;
          }

          case 'fresh_lead': {
            // New/Inquiry status AND no contact attempt has been made (latest_disposition_id IS NULL)
            const { data, count: cnt, error } = await applyPagination(
              applySort(
                applySearch(
                  buildBaseQuery()
                    .in('lead_status', ['Inquiry', 'New'])
                    .is('latest_disposition_id', null)
                )
              )
            );
            if (error) throw error;
            allData = data || [];
            count = cnt || 0;
            break;
          }

          case 'connected': {
            if (!configLoaded || connectedDispositionIds.length === 0) {
              allData = [];
              count = 0;
              break;
            }
            const { data, count: cnt, error } = await applyPagination(
              applySort(
                applySearch(
                  buildBaseQuery()
                    .in('latest_disposition_id', connectedDispositionIds)
                )
              )
            );
            if (error) throw error;
            allData = data || [];
            count = cnt || 0;
            break;
          }

          case 'not_connected': {
            if (!configLoaded || notConnectedDispositionIds.length === 0) {
              allData = [];
              count = 0;
              break;
            }
            const { data, count: cnt, error } = await applyPagination(
              applySort(
                applySearch(
                  buildBaseQuery()
                    .in('latest_disposition_id', notConnectedDispositionIds)
                )
              )
            );
            if (error) throw error;
            allData = data || [];
            count = cnt || 0;
            break;
          }

          case 'interested': {
            if (!configLoaded || interestedDispositionIds.length === 0) {
              allData = [];
              count = 0;
              break;
            }
            const { data, count: cnt, error } = await applyPagination(
              applySort(
                applySearch(
                  buildBaseQuery()
                    .in('latest_disposition_id', interestedDispositionIds)
                )
              )
            );
            if (error) throw error;
            allData = data || [];
            count = cnt || 0;
            break;
          }

          case 'attempted': {
            // At least one contact attempt (latest_disposition_id is not null)
            const { data, count: cnt, error } = await applyPagination(
              applySort(
                applySearch(
                  buildBaseQuery().not('latest_disposition_id', 'is', null)
                )
              )
            );
            if (error) throw error;
            allData = data || [];
            count = cnt || 0;
            break;
          }

          case 'not_attempted': {
            // No contact attempt made (latest_disposition_id IS NULL)
            const { data, count: cnt, error } = await applyPagination(
              applySort(
                applySearch(
                  buildBaseQuery().is('latest_disposition_id', null)
                )
              )
            );
            if (error) throw error;
            allData = data || [];
            count = cnt || 0;
            break;
          }

          case 'qualified': {
            const { data, count: cnt, error } = await applyPagination(
              applySort(
                applySearch(
                  buildBaseQuery().eq('lead_status', 'Qualified')
                )
              )
            );
            if (error) throw error;
            allData = data || [];
            count = cnt || 0;
            break;
          }

          case 'application_started': {
            const { data, count: cnt, error } = await applyPagination(
              applySort(
                applySearch(
                  buildBaseQuery().eq('lead_status', 'Application')
                )
              )
            );
            if (error) throw error;
            allData = data || [];
            count = cnt || 0;
            break;
          }

          case 'documents_pending': {
            const { data, count: cnt, error } = await applyPagination(
              applySort(
                applySearch(
                  buildBaseQuery().eq('lead_status', 'Docs Pending')
                )
              )
            );
            if (error) throw error;
            allData = data || [];
            count = cnt || 0;
            break;
          }

          case 'admission_done': {
            const { data, count: cnt, error } = await applyPagination(
              applySort(
                applySearch(
                  buildBaseQuery().eq('lead_status', 'Admitted')
                )
              )
            );
            if (error) throw error;
            allData = data || [];
            count = cnt || 0;
            break;
          }

          case 'lost': {
            const { data, count: cnt, error } = await applyPagination(
              applySort(
                applySearch(
                  buildBaseQuery().in('lead_status', ['Rejected', 'Lost'])
                )
              )
            );
            if (error) throw error;
            allData = data || [];
            count = cnt || 0;
            break;
          }

        case 'all_leads_overview': {
            // Fetch total count and stage distribution via RPC
            const { data: stageData, error: stageError } = await supabase.rpc(
              'get_lead_stage_distribution',
              { p_user_id: user!.id }
            );
            if (stageError) throw stageError;

            // Build stage counts using canonical pipeline stages
            const countsMap = new Map<string, number>();
            let total = 0;
            (stageData || []).forEach((row: any) => {
              countsMap.set(row.stage_name, Number(row.stage_count));
              total = Number(row.total_leads);
            });

            const fullStageCounts: StageCount[] = DEFAULT_PIPELINE_STAGES.map(stage => ({
              stage,
              count: countsMap.get(stage) || 0,
            }));

            setStageCounts(fullStageCounts);
            setCount(total);
            setLeads([]);
            skipDefaultSet = true;
            break;
          }

          default:
            break;
        }
      }

      if (!skipDefaultSet) {
        const mappedData = await mapLeads(allData);
        setLeads(mappedData);
        setCount(count);
      }
    } catch (err: any) {
      console.error('Error fetching smart view leads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
   }, [viewId, view, viewConfig, isViewEnabled, user, isSuperAdmin, configLoaded, connectedDispositionIds, notConnectedDispositionIds, interestedDispositionIds, options?.page, options?.pageSize, options?.search, JSON.stringify(options?.sort)]);

  useEffect(() => {
    fetchLeads();

    const channelId = `smart_view_${viewId}_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispositions' }, () => {
        fetchLeads();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => {
        fetchLeads();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_activities' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeads]);

  const refresh = useCallback(() => {
    fetchLeads();
  }, [fetchLeads]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      const s = l.leadStatus || 'New';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [leads]);

  return { leads, totalCount, isLoading, error, refresh, statusCounts, stageCounts, view };
}

export { SMART_VIEWS, getSmartView };
export type { SmartViewConfig, SmartViewId };
