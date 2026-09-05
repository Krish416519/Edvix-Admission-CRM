import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Search, Filter, Upload, Plus, ChevronDown,
  ArrowUpDown, Users, Trash2, Edit2, UserPlus, FileSpreadsheet, Clock,
  X, CheckCircle, AlertCircle, FileUp, Copy, ArchiveRestore, Merge, Check, Columns, GripVertical
} from 'lucide-react';
import { useLeads } from '../../hooks/useLeads';
import { useDispositions } from '../../hooks/useDispositions';
import { AdvancedFilterSidebar } from './AdvancedFilterSidebar';
import type { FilterState } from '../../types/filter';
import { Lead, LeadStatus, LeadPriority } from '../../types/schema';
import { cn, formatDate } from '../../lib/utils';
import { computeIntent } from '../../lib/leadIntent';
import { DEFAULT_PIPELINE_STAGES } from '../../constants/pipelineStages';
import { SavedViewsDropdown } from './SavedViewsDropdown';
import { SavedView } from '../../hooks/useSavedViews';

import { EmptyState } from '../ui/EmptyState';
import { LeadFormModal } from './LeadFormModal';
import { MergeLeadsModal } from './MergeLeadsModal';
import { MobileLeadCard } from './mobile/MobileLeadCard';
import { LeadFiltersSheet } from './mobile/LeadFiltersSheet';
import { LeadSortSheet } from './mobile/LeadSortSheet';
import { useLeadAssignment } from '../../hooks/useLeadAssignment';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { useConfirm } from '../ConfirmDialog';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';



// ── CSV Import Types ─────────────────────────────────────────────────────────
interface CsvRow { [key: string]: string; }
interface ImportPreview {
  rows: CsvRow[];
  headers: string[];
  mapping: Record<string, string>; // dbField -> csvColumn
}

// Known CSV column aliases → DB field
const FIELD_ALIASES: Record<string, string> = {
  // first_name
  'first name': 'first_name', 'firstname': 'first_name', 'first_name': 'first_name', 'name': 'first_name',
  // last_name
  'last name': 'last_name', 'lastname': 'last_name', 'last_name': 'last_name', 'surname': 'last_name',
  // phone
  'phone': 'phone', 'mobile': 'phone', 'contact': 'phone', 'phone number': 'phone', 'mobile number': 'phone',
  // alternate_phone
  'alternate phone': 'alternate_phone', 'alt phone': 'alternate_phone', 'alternate_phone': 'alternate_phone',
  // email
  'email': 'email', 'email address': 'email', 'e-mail': 'email',
  // budget
  'budget': 'budget', 'fee': 'budget', 'amount': 'budget',
  // lead_source
  'source': 'lead_source', 'lead source': 'lead_source', 'lead_source': 'lead_source', 'channel': 'lead_source',
  // lead_status
  'status': 'lead_status', 'lead status': 'lead_status', 'lead_status': 'lead_status',
  // priority
  'priority': 'priority',
  // notes
  'notes': 'notes', 'remarks': 'notes', 'comment': 'notes', 'comments': 'notes',
  // university
  'university': 'university_id', 'college': 'university_id', 'institute': 'university_id',
  // course
  'course': 'course_id', 'program': 'course_id', 'degree': 'course_id',
};

const DB_FIELDS = [
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name',  label: 'Last Name',  required: false },
  { key: 'phone',      label: 'Phone',       required: true },
  { key: 'email',      label: 'Email',       required: false },
  { key: 'alternate_phone', label: 'Alt Phone', required: false },
  { key: 'budget',     label: 'Budget',      required: false },
  { key: 'lead_source',label: 'Source',      required: false },
  { key: 'lead_status',label: 'Status',      required: false },
  { key: 'priority',   label: 'Priority',    required: false },
  { key: 'notes',      label: 'Notes',       required: false },
  { key: 'university_id', label: 'University', required: false },
  { key: 'course_id',    label: 'Course',    required: false },
];

function autoMap(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const h of headers) {
    const normalized = h.trim().toLowerCase();
    const dbField = FIELD_ALIASES[normalized];
    if (dbField && !Object.values(mapping).includes(h)) {
      mapping[dbField] = h;
    }
  }
  return mapping;
}

interface LeadsListProps {
  onLeadSelect?: (lead: Lead) => void;
  showSmartStages?: boolean;
  externalLeads?: Lead[];
  externalTotalCount?: number;
  externalLoading?: boolean;
}

export function LeadsList({ showSmartStages, externalLeads, externalTotalCount, externalLoading }: LeadsListProps) {
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'All'>(
    initialFilter === 'docs_pending' ? 'Docs Pending' : initialFilter === 'hot' ? 'Hot' : 'All'
  );
  const [minScoreFilter, setMinScoreFilter] = useState<number | undefined>(
    initialFilter === 'hot' ? 80 : initialFilter === 'high_conversion' ? 85 : undefined
  );

  // Clear query params after initial read so they don't persist on reload after user changes filters
  useEffect(() => {
    if (initialFilter) {
      searchParams.delete('filter');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [stagesOrder, setStagesOrder] = useState<string[]>(DEFAULT_PIPELINE_STAGES);

  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', 'pipeline_stages').maybeSingle().then(({ data }) => {
      if (data && data.value && Array.isArray(data.value)) {
        setStagesOrder(data.value);
      }
    });
  }, []);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    const newStages = Array.from(stagesOrder);
    const [reorderedItem] = newStages.splice(result.source.index, 1);
    newStages.splice(result.destination.index, 0, reorderedItem);
    
    setStagesOrder(newStages);
    
    // Check role from AuthContext (we destructure `user` below, but for now we'll do it safely)
    const storedUser = localStorage.getItem('crm_user');
    const role = storedUser ? JSON.parse(storedUser).role : '';
    const isCounselorRole = role?.toLowerCase().includes('counsel');
    
    if (!isCounselorRole) {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'pipeline_stages', value: newStages });
        
      if (error) {
        toast.error('Failed to save stage order globally');
      } else {
        toast.success('Stage order updated successfully');
      }
    }
  };
  
  // Advanced Filters
  const [showDeleted, setShowDeleted] = useState(false);
  const [counselorFilter, setCounselorFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [dispositionFilter, setDispositionFilter] = useState('All');
  const [isAdvancedFilterSidebarOpen, setIsAdvancedFilterSidebarOpen] = useState(false);
  const [advancedFilterState, setAdvancedFilterState] = useState<FilterState | undefined>(undefined);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  
  // Sorting
  const [sortField, setSortField] = useState<keyof Lead>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Bulk Assign state
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkAssignUserIds, setBulkAssignUserIds] = useState<string[]>([]);
  const [bulkAssignSearch, setBulkAssignSearch] = useState('');

  // Bulk Update state
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState<'status' | 'priority' | 'source' | ''>('');
  const [bulkUpdateValue, setBulkUpdateValue] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  
  // Derive CRM context strictly from the user's active organization.
  // If it cannot be confirmed, pass undefined — never assume Academic or B2B.
  const crmContext = user?.organizations?.find(o => o.id === user.activeOrganizationId)?.crm_context ?? undefined;
  const { categories: dispositionCategories } = useDispositions(crmContext);

  // Mobile State
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    leadDetails: true,
    callAttempts: true,
    interactions: true,
    courseUni: true,
    score: true,
    status: true,
    priority: true,
    counselor: true,
    createdOn: true,
    modifiedOn: true,
    assignmentDate: false,
    lastCallDate: true,
    firstCallDate: false,
    finalFollowUpDate: true,
    contactedTimestamp: false,
    transitionToFallOut: false,
    transitionToCounselled: false,
    moreThan5MContactedTime: false,
    moreThan10MContactedTime: false,
    moreThan15MContactedTime: false,
    conversionDate: false,
    managerPrioritized: false,
    firstAssignmentDate: false,
    transitionToAdmitted: false,
    transitionToOBInitiated: false,
    transitionToOffer: false,
    transitionToVerificationPending: false,
    transitionToConverted: false,
    transitionToScreening: false
  });

  const COLUMN_LABELS: Record<string, string> = {
    leadDetails: 'Lead Details',
    callAttempts: 'Call Attempts',
    interactions: 'Interactions',
    courseUni: 'Course & Uni',
    score: 'Score',
    status: 'Status',
    priority: 'Priority',
    counselor: 'Counselor',
    createdOn: 'Created On',
    modifiedOn: 'Modified On',
    assignmentDate: 'Assignment Date',
    lastCallDate: 'Last Call Date',
    firstCallDate: 'First Call Date',
    finalFollowUpDate: 'Final Follow Up Date',
    contactedTimestamp: 'Contacted Timestamp',
    transitionToFallOut: 'Transition to FallOut',
    transitionToCounselled: 'Transition to Counselled',
    moreThan5MContactedTime: 'More Than 5M Contacted Time',
    moreThan10MContactedTime: 'More Than 10M Contacted Time',
    moreThan15MContactedTime: 'More Than 15M Contacted Time',
    conversionDate: 'Conversion Date',
    managerPrioritized: 'Manager Prioritized',
    firstAssignmentDate: 'First Assignment Date',
    transitionToAdmitted: 'Transition to Admitted',
    transitionToOBInitiated: 'Transition to OB Initiated',
    transitionToOffer: 'Transition to Offer',
    transitionToVerificationPending: 'Transition to Verification Pending',
    transitionToConverted: 'Transition to Converted',
    transitionToScreening: 'Transition to Screening'
  };
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  // ── CSV Import State ──────────────────────────────────────────────────────
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: CsvRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rows.length === 0) {
          toast.error('The file is empty or has no data rows.');
          return;
        }

        const headers = Object.keys(rows[0]);
        const mapping = autoMap(headers);

        setImportPreview({ rows, headers, mapping });
        setImportResults(null);
      } catch (err) {
        toast.error('Failed to read file. Please use a valid CSV or Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const internalLeads = useLeads({
    page: currentPage,
    pageSize: pageSize,
    search: searchTerm,
    filters: {
      status: externalLeads ? 'All' : statusFilter,
      source: sourceFilter,
      counselorId: counselorFilter,
      dispositionCategory: dispositionFilter,
      showDeleted: showDeleted,
      minScore: minScoreFilter
    },
     sort: { field: sortField as string, direction: sortDirection },
     advancedFilters: advancedFilterState,
   });

  // When external leads are provided (Smart View mode), use them instead of internal fetching
  const leads = externalLeads !== undefined ? externalLeads : internalLeads.leads;
  const totalCount = externalLeads !== undefined ? externalTotalCount || 0 : internalLeads.totalCount;
  const isLoading = externalLeads !== undefined ? externalLoading || false : internalLeads.isLoading;

  // When in Smart View mode, compute status counts from the filtered external leads
  const statusCounts = useMemo(() => {
    if (externalLeads !== undefined) {
      const counts: Record<string, number> = {};
      leads.forEach(lead => {
        const s = lead.leadStatus || lead.status || 'New';
        counts[s] = (counts[s] || 0) + 1;
      });
      return counts;
    }
    return internalLeads.statusCounts;
  }, [externalLeads, leads, internalLeads.statusCounts]);

  const totalUnfilteredCount = externalLeads !== undefined
    ? leads.length
    : internalLeads.totalUnfilteredCount;
  const { addLead, updateLead, deleteLead, bulkDeleteLeads, restoreLead, duplicateLead, mergeLeads, bulkUpdateLeads, refresh } = internalLeads;

  const { allUsers, assignLead, isAssigning, bulkAssignLeads, roundRobinAssignLeads } = useLeadAssignment();
  const { hasPermission } = useAuth();
  
  const isCounselor = user?.role?.toLowerCase().includes('counsel');
  
  const canDelete = hasPermission('Delete Leads', 'Lead Management');
  const canAssign = hasPermission('Edit Leads', 'Lead Management');
  const canUpdate = hasPermission('Edit Leads', 'Lead Management');

  const handleBulkAssign = async () => {
    if (bulkAssignUserIds.length === 0) {
      toast.error('Please select at least one user to assign leads to');
      return;
    }
    const ids = Array.from(selectedIds) as string[];
    let res;
    if (bulkAssignUserIds.length === 1) {
      res = await bulkAssignLeads(ids, bulkAssignUserIds[0]);
    } else {
      res = await roundRobinAssignLeads(ids, bulkAssignUserIds);
    }
    
    if (res.success) {
      setSelectedIds(new Set());
      setShowBulkAssign(false);
      setBulkAssignUserIds([]);
      refresh();
    }
  };

  const handleBulkUpdateSubmit = async () => {
    if (!bulkUpdateField || !bulkUpdateValue) {
      toast.error('Please select a field and a value');
      return;
    }
    
    setIsBulkUpdating(true);
    const ids = Array.from(selectedIds) as string[];
    const updates: Partial<Lead> = {};
    
    if (bulkUpdateField === 'status') updates.status = bulkUpdateValue as LeadStatus;
    if (bulkUpdateField === 'priority') updates.priority = bulkUpdateValue as LeadPriority;
    if (bulkUpdateField === 'source') updates.source = bulkUpdateValue;

    const res = await bulkUpdateLeads(ids, updates);
    setIsBulkUpdating(false);
    
    if (res.success) {
      toast.success(`Successfully updated ${ids.length} leads`);
      setSelectedIds(new Set());
      setShowBulkUpdate(false);
      setBulkUpdateField('');
      setBulkUpdateValue('');
    } else {
      toast.error('Failed to update leads');
    }
  };

  const handleImportSubmit = async () => {
    if (!importPreview) return;
    setIsImporting(true);

    const { rows, mapping } = importPreview;
    const BATCH_SIZE = 50;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Fetch Universities and Courses to resolve names to UUIDs
    const { data: universities } = await supabase.from('universities').select('id, name');
    const { data: courses } = await supabase.from('courses').select('id, name');

    const uniMap: Record<string, string> = {};
    if (universities) {
      universities.forEach(u => uniMap[u.name.toLowerCase().trim()] = u.id);
    }
    const courseMap: Record<string, string> = {};
    if (courses) {
      courses.forEach(c => courseMap[c.name.toLowerCase().trim()] = c.id);
    }

    // Build insert payloads
    const payloads = rows.map((row, idx) => {
      const p: Record<string, string> = {};
      for (const [dbField, csvCol] of Object.entries(mapping)) {
        const col = csvCol as string;
        if (col && row[col] !== undefined) {
          let val = String(row[col]).trim();
          
          // Resolve UUIDs for university and course
          if (dbField === 'university_id' && val) {
            // Check if it's already a UUID (rough regex)
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
               val = uniMap[val.toLowerCase()] || '';
            }
          }
          if (dbField === 'course_id' && val) {
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
               val = courseMap[val.toLowerCase()] || '';
            }
          }

          if (val) {
            p[dbField] = val;
          }
        }
      }
      // Defaults
      if (!p.lead_status) p.lead_status = 'Inquiry';
      if (!p.priority)    p.priority    = 'Medium';
      if (!p.lead_source) p.lead_source = 'CSV Import';
      if (!p.first_name)  p.first_name  = `Row ${idx + 2}`; // fallback
      return p;
    });

    // 1. Deduplicate internally within the CSV (keep the first occurrence of each phone)
    const uniquePayloads = [];
    const seenPhones = new Set();
    for (const p of payloads) {
      if (p.phone) {
        if (seenPhones.has(p.phone)) continue; // skip duplicate in CSV
        seenPhones.add(p.phone);
      }
      uniquePayloads.push(p);
    }

    // 2. Fetch existing phones from DB to prevent DB-level unique constraint violations
    const phoneList = uniquePayloads.map(p => p.phone).filter(Boolean);
    let existingPhones = new Set();
    
    if (phoneList.length > 0) {
      // We can fetch in chunks if needed, but since it's an import, doing it in batches is safer
      // We'll just fetch all matching phones in one go
      const { data: existingData } = await supabase
        .from('leads')
        .select('phone')
        .in('phone', phoneList)
        .is('deleted_at', null);
        
      if (existingData) {
        existingData.forEach(d => existingPhones.add(d.phone));
      }
    }

    // 3. Filter out payloads that already exist in DB
    const finalPayloads = uniquePayloads.filter(p => !p.phone || !existingPhones.has(p.phone));

    // Insert in batches
    for (let i = 0; i < finalPayloads.length; i += BATCH_SIZE) {
      const batch = finalPayloads.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('leads').insert(batch);
      if (error) {
        failed += batch.length;
        errors.push(`Rows ${i + 2}–${i + batch.length + 1}: ${error.message}`);
      } else {
        success += batch.length;
      }
    }

    setIsImporting(false);
    setImportResults({ success, failed, errors });

    if (success > 0) {
      toast.success(`✅ Imported ${success} leads successfully${failed > 0 ? `, ${failed} failed` : ''}`);
      refresh();
    } else {
      toast.error('Import failed. Check the error details.');
    }
  };

  const handleSort = (field: keyof Lead) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const paginatedLeads = leads;
  const totalPages = Math.ceil(totalCount / pageSize);

  const statusColors: Record<LeadStatus, string> = {
    'Inquiry': 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
    'Not Connected': 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
    'Cold': 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
    'Warm': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
    'Hot': 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    'Qualified': 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
    'Application': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
    'Docs Pending': 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    'Admitted': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    'Rejected': 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    'New': 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
    'Connected': 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    'Documents Pending': 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    'Application Started': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
    'Admission Done': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    'Lost': 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  };

  const priorityColors: Record<LeadPriority, string> = {
    'High': 'text-red-600 dark:text-red-500',
    'Medium': 'text-amber-600 dark:text-amber-500',
    'Low': 'text-green-600 dark:text-green-500'
  };

  const getSLAStatus = (lead: Lead) => {
    if (lead.status === 'Rejected' || lead.status === 'Admitted') return null;
    
    // @ts-ignore
    const lastTouch = new Date(lead.lastContactedAt || lead.createdAt || Date.now());
    const hoursSinceTouch = (Date.now() - lastTouch.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceTouch >= 24) return { label: '24h+ Escalation', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400', icon: AlertCircle };
    if (hoursSinceTouch >= 4) return { label: '4h+ Escalation', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400', icon: Clock };
    if (hoursSinceTouch >= 2) return { label: '2h+ Warning', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400', icon: Clock };
    
    return null;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(paginatedLeads.map(l => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (await confirm({
      title: 'Delete Leads',
      message: `Are you sure you want to delete ${selectedIds.size} leads?`,
      confirmLabel: 'Delete',
      variant: 'danger'
    })) {
      const ids = Array.from(selectedIds) as string[];
      await bulkDeleteLeads(ids);
      setSelectedIds(new Set());
      toast.success('Leads deleted successfully');
    }
  };

  const handleExport = () => {
    // Currently exporting visible leads on page, server export would fetch all
    const dataToExport = paginatedLeads.map(l => ({
      ID: l.id,
      LeadNumber: l.leadNumber,
      Name: l.name,
      Phone: l.phone,
      Email: l.email,
      State: l.state,
      City: l.city,
      Course: l.course,
      University: l.university,
      Status: l.status,
      Priority: l.priority,
      Score: l.score,
      Source: l.source,
      Counselor: l.counselor,
      CallAttempts: l.callAttempts ?? (l as any).call_attempts ?? 0,
      Interactions: l.interactionsCount ?? (l as any).interactions_count ?? 0,
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "Leads_Export.xlsx");
    toast.success('Leads exported successfully');
  };

  const handleAddOrEdit = async (data: Partial<Lead>) => {
    if (selectedLead) {
      const res = await updateLead(selectedLead.id, data);
      if (res.success) {
        toast.success('Lead updated successfully');
      } else {
        toast.error(res.error || 'Failed to update lead');
      }
    } else {
      const res = await addLead(data);
      if (res.success) {
        toast.success('Lead created successfully');
      } else {
        toast.error(res.error || 'Failed to create lead');
      }
    }
  };

  const totalLeads = totalCount;
  // Use leadStatus which is the canonical field
  const newLeadsCount = paginatedLeads.filter(l => (l.leadStatus || l.status) === 'Inquiry').length;
  const admissionsCount = paginatedLeads.filter(l => (l.leadStatus || l.status) === 'Admitted').length;
  const qualifiedCount = paginatedLeads.filter(l => (l.leadStatus || l.status) === 'Qualified').length;
  const lostCount = paginatedLeads.filter(l => (l.leadStatus || l.status) === 'Rejected').length;
  const hotLeadsCount = paginatedLeads.filter(l => computeIntent(l) === 'HOT').length;
  const conversionRate = paginatedLeads.length ? Math.round((admissionsCount / paginatedLeads.length) * 100) : 0;

  return (
    <div className="flex flex-col animate-in fade-in duration-500 pb-10">
      
      {/* Smart Stages Tabs */}
      {showSmartStages && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide pt-1 px-1 touch-pan-x">
          <button
            onClick={() => {
              setStatusFilter('All');
              setSearchTerm('');
              setCurrentPage(1);
            }}
            className={cn(
              "shrink-0 px-3 py-1.5 md:px-5 md:py-2.5 text-sm md:text-base rounded-xl font-semibold transition-all whitespace-nowrap shadow-sm border",
              statusFilter === 'All' && !searchTerm
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            )}
          >
            All Stages
            <span className={cn(
              "ml-2 px-1.5 py-0.5 rounded-full text-[10px] md:text-xs",
              statusFilter === 'All' && !searchTerm
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted-foreground/10 text-muted-foreground"
            )}>
              {totalUnfilteredCount}
            </span>
          </button>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="stages" direction="horizontal">
              {(provided) => (
                <div 
                  ref={provided.innerRef} 
                  {...provided.droppableProps}
                  className="flex gap-2 h-full"
                >
                  {stagesOrder.map((stage, index) => {
                    const count = statusCounts[stage] || 0;
                    return (
                      <Draggable key={stage} draggableId={stage} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="shrink-0 h-full"
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.9 : 1,
                              transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.02)` : provided.draggableProps.style?.transform,
                            }}
                          >
                            <div
                              className={cn(
                                "group relative px-3 py-1.5 md:px-5 md:py-2.5 text-sm md:text-base rounded-xl font-semibold transition-all shadow-sm border w-full h-full text-left flex items-center justify-between gap-2 overflow-hidden",
                                statusFilter === stage
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card text-foreground border-border hover:bg-muted",
                                snapshot.isDragging && "shadow-xl ring-2 ring-primary/20"
                              )}
                            >
                              {/* Drag Handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="hidden md:flex items-center justify-center p-1 -ml-2 text-muted-foreground/70 hover:text-foreground cursor-grab active:cursor-grabbing transition-opacity"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>
                              
                              <button
                                onClick={() => {
                                  setStatusFilter(stage);
                                  setSearchTerm('');
                                  setCurrentPage(1);
                                }}
                                className="flex-1 text-left whitespace-nowrap focus:outline-none"
                              >
                                {stage}
                              </button>
                              
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-full text-[10px] md:text-xs",
                                statusFilter === stage
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-muted-foreground/10 text-muted-foreground"
                              )}>
                                {count}
                              </span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between mb-4 mt-2 px-1">
        <div>
          <h1 className="text-2xl font-black text-foreground leading-tight">All Leads</h1>
          <p className="text-xs text-muted-foreground font-medium">{totalLeads} Total Leads</p>
        </div>
        {!isCounselor && (
          <button 
            onClick={() => { setSelectedLead(undefined); setIsFormOpen(true); }}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg font-bold transition-all text-sm shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Lead
          </button>
        )}
      </div>

      {/* Mobile Search & Filter Bar */}
      <div className="md:hidden flex flex-col gap-2 mb-4 px-1">
        {minScoreFilter === 80 && (
          <div className="flex items-center justify-between px-3 py-2 bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 rounded-xl text-sm font-semibold border border-orange-200 dark:border-orange-500/30">
            <span>🔥 Hot Leads Only</span>
            <button onClick={() => setMinScoreFilter(undefined)} className="p-1 hover:bg-orange-200 dark:hover:bg-orange-500/30 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </div>
        )}
        {minScoreFilter === 85 && (
          <div className="flex items-center justify-between px-3 py-2 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 rounded-xl text-sm font-semibold border border-green-200 dark:border-green-500/30">
            <span>📈 High-Conversion Only</span>
            <button onClick={() => setMinScoreFilter(undefined)} className="p-1 hover:bg-green-200 dark:hover:bg-green-500/30 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        <button 
          onClick={() => setIsFiltersSheetOpen(true)}
          className="w-11 h-11 flex items-center justify-center bg-card border border-border rounded-xl text-foreground hover:bg-muted transition-colors active:scale-95 relative shrink-0"
        >
          <Filter className="w-5 h-5" />
          {(statusFilter !== 'All' || showDeleted || minScoreFilter !== undefined) && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary ring-2 ring-card" />
          )}
        </button>
        <button 
          onClick={() => setIsSortSheetOpen(true)}
          className="w-11 h-11 flex items-center justify-center bg-card border border-border rounded-xl text-foreground hover:bg-muted transition-colors active:scale-95 shrink-0"
        >
          <ArrowUpDown className="w-5 h-5" />
        </button>
        </div>
      </div>

      {/* Desktop Header & Actions */}
      {!isCounselor && (
        <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">All Leads</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and track your admission pipeline efficiently.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden file input */}
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button 
              onClick={() => csvInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors shadow-sm text-foreground"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors shadow-sm text-foreground"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Export
            </button>
            <button 
              onClick={() => setIsMergeModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-sm font-semibold hover:bg-orange-100 transition-colors shadow-sm"
            >
              <Merge className="w-4 h-4" />
              Merge
            </button>
            <button 
              onClick={() => { setSelectedLead(undefined); setIsFormOpen(true); }}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-1.5 rounded-lg font-semibold transition-all text-sm shadow-sm active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Add Lead
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {!isCounselor && (
        <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Leads</p>
              <h3 className="text-2xl font-bold mt-1">{totalLeads}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">New Leads</p>
              <h3 className="text-2xl font-bold mt-1">{newLeadsCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Admissions</p>
              <h3 className="text-2xl font-bold mt-1">{admissionsCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Conversion Rate</p>
              <h3 className="text-2xl font-bold mt-1">{conversionRate}%</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Mobile KPI horizontal scroll */}
      {!isCounselor && (
        <div className="md:hidden flex gap-3 px-1 mb-3 overflow-x-auto hide-scrollbar pb-1">
          {[
            { label: 'Total', value: totalLeads, color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' },
             { label: 'Inquiry', value: newLeadsCount, color: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10' },
             { label: 'Qualified', value: qualifiedCount, color: 'text-teal-600 bg-teal-50 dark:bg-teal-500/10' },
             { label: '🔥 Hot', value: hotLeadsCount, color: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10' },
             { label: 'Rejected', value: lostCount, color: 'text-red-600 bg-red-50 dark:bg-red-500/10' },
          ].map(kpi => (
            <div key={kpi.label} className={cn('shrink-0 px-3.5 py-2 rounded-xl flex flex-col items-center', kpi.color)}>
              <span className="text-[11px] font-semibold whitespace-nowrap">{kpi.label}</span>
              <span className="text-lg font-black">{kpi.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border-transparent md:border-border rounded-none md:rounded-2xl shadow-none md:shadow-sm flex flex-col -mx-4 sm:mx-0">
        
        {/* Toolbar */}
        <div className="hidden md:flex p-4 border-b border-border flex-col md:flex-row gap-4 justify-between items-center bg-muted/20">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search leads by name, email, phone..." 
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
              />
            </div>
            {minScoreFilter === 80 && (
              <span className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 rounded-lg text-sm font-semibold border border-orange-200 dark:border-orange-500/30 shrink-0">
                🔥 Hot Leads Only
                <button onClick={() => setMinScoreFilter(undefined)} className="hover:text-orange-900 dark:hover:text-orange-200 ml-1"><X className="w-3 h-3" /></button>
              </span>
            )}
            {minScoreFilter === 85 && (
              <span className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 rounded-lg text-sm font-semibold border border-green-200 dark:border-green-500/30 shrink-0">
                📈 High-Conversion Only
                <button onClick={() => setMinScoreFilter(undefined)} className="hover:text-green-900 dark:hover:text-green-200 ml-1"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {selectedIds.size > 0 && (
              <>
                {canDelete && (
                  <button 
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete ({selectedIds.size})
                  </button>
                )}
                {canAssign && (
                  <button 
                    onClick={() => setShowBulkAssign(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign ({selectedIds.size})
                  </button>
                )}
                {canUpdate && (
                  <button 
                    onClick={() => setShowBulkUpdate(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Update ({selectedIds.size})
                  </button>
                )}
              </>
            )}

            <div className="relative">
              <button 
                onClick={() => setIsColumnsMenuOpen(!isColumnsMenuOpen)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-semibold transition-colors",
                  isColumnsMenuOpen ? "bg-primary/10 text-primary border-primary/30" : "bg-card text-foreground border-border hover:bg-muted"
                )}
              >
                <Columns className="w-4 h-4" />
                Columns
              </button>
              {isColumnsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsColumnsMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 max-h-80 overflow-y-auto overflow-x-hidden bg-card border border-border rounded-lg shadow-lg z-50 p-2 py-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between px-2 pb-1 border-b border-border mb-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Visible Columns</h4>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const allTrue = Object.keys(visibleColumns).reduce((acc, key) => ({ ...acc, [key]: true }), {});
                            setVisibleColumns(allTrue as typeof visibleColumns);
                          }}
                          className="text-[10px] font-semibold text-primary hover:underline"
                        >
                          All
                        </button>
                        <button 
                          onClick={() => {
                            const allFalse = Object.keys(visibleColumns).reduce((acc, key) => ({ ...acc, [key]: false }), {});
                            setVisibleColumns(allFalse as typeof visibleColumns);
                          }}
                          className="text-[10px] font-semibold text-muted-foreground hover:underline"
                        >
                          None
                        </button>
                      </div>
                    </div>
                    {Object.entries(visibleColumns).map(([key, isVisible]) => (
                      <label key={key} className="flex items-center gap-3 px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isVisible}
                          onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !isVisible }))}
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                        <span className="text-sm font-medium text-foreground">{COLUMN_LABELS[key] || key}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <SavedViewsDropdown 
              currentFilterState={advancedFilterState}
              onSelectView={(view: SavedView) => {
                setAdvancedFilterState(view.filters);
                setCurrentPage(1);
                setIsAdvancedFilterSidebarOpen(true);
              }}
              onClearView={() => {
                setAdvancedFilterState(undefined);
                setCurrentPage(1);
              }}
            />

            <button 
              onClick={() => setIsAdvancedFilterSidebarOpen(!isAdvancedFilterSidebarOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-semibold transition-colors",
                isAdvancedFilterSidebarOpen ? "bg-primary/10 text-primary border-primary/30" : "bg-card text-foreground border-border hover:bg-muted"
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(statusFilter !== 'All' || sourceFilter !== 'All' || counselorFilter !== 'All' || dispositionFilter !== 'All' || showDeleted || ((advancedFilterState?.rootGroup?.conditions?.length ?? 0) > 0)) && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          </div>
        </div>


          <>
            <div 
              className="md:hidden flex-1 px-4 py-2 space-y-3 pb-8"
            >
              {isLoading ? (
                // Skeleton cards for mobile
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse">
                    <div className="flex gap-3 mb-3">
                      <div className="w-8 h-8 bg-muted rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-2/3" />
                        <div className="h-3 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-4/5" />
                    </div>
                  </div>
                ))
              ) : (
                paginatedLeads.map((lead) => (
                  <MobileLeadCard
                    key={lead.id}
                    lead={lead}
                    statusColors={statusColors}
                  />
                ))
              )}
              {!isLoading && paginatedLeads.length === 0 && (
                <EmptyState
                  icon={Users}
                  title="No leads found"
                  description="We couldn't find any leads matching your current filters."
                  action={
                    <button
                      onClick={() => { setSearchTerm(''); setStatusFilter('All'); setMinScoreFilter(undefined); }}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Clear Filters
                    </button>
                  }
                />
              )}
              {/* Mobile pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-border rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-border rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Table (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 border-b border-border">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold w-10">
                      {!isCounselor && (
                        <input 
                          type="checkbox"
                          checked={paginatedLeads.length > 0 && selectedIds.size === paginatedLeads.length}
                          onChange={handleSelectAll}
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      )}
                    </th>
                    {visibleColumns.leadDetails && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1">Lead Details <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.callAttempts && (
                    <th scope="col" className="px-4 py-3 font-semibold" onClick={() => handleSort('callAttempts' as keyof Lead)}>
                      Call Attempts
                    </th>
                    )}
                    {visibleColumns.interactions && (
                    <th scope="col" className="px-4 py-3 font-semibold" onClick={() => handleSort('interactionsCount' as keyof Lead)}>
                      Interactions
                    </th>
                    )}
                    {visibleColumns.courseUni && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('course')}>
                      <div className="flex items-center gap-1">Course & Uni <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.score && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('score')}>
                      <div className="flex items-center gap-1">Score <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.status && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.priority && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('priority')}>
                       <div className="flex items-center gap-1">Priority <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {!isCounselor && visibleColumns.counselor && (
                    <th scope="col" className="px-4 py-3 font-semibold">Counselor</th>
                    )}
                    {visibleColumns.createdOn && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center gap-1">Created On <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.modifiedOn && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('modifiedOn' as keyof Lead)}>
                      <div className="flex items-center gap-1">Modified On <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.assignmentDate && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('assignmentDate' as keyof Lead)}>
                      <div className="flex items-center gap-1">Assignment Date <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.lastCallDate && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('lastCallDate' as keyof Lead)}>
                      <div className="flex items-center gap-1">Last Call Date <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.firstCallDate && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('firstCallDate' as keyof Lead)}>
                      <div className="flex items-center gap-1">First Call Date <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.finalFollowUpDate && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('finalFollowUpDate' as keyof Lead)}>
                      <div className="flex items-center gap-1">Final Follow Up Date <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.contactedTimestamp && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('contactedTimestamp' as keyof Lead)}>
                      <div className="flex items-center gap-1">Contacted Timestamp <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.transitionToFallOut && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('transitionToFallOut' as keyof Lead)}>
                      <div className="flex items-center gap-1">Transition to FallOut <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.transitionToCounselled && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('transitionToCounselled' as keyof Lead)}>
                      <div className="flex items-center gap-1">Transition to Counselled <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.moreThan5MContactedTime && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('moreThan5MContactedTime' as keyof Lead)}>
                      <div className="flex items-center gap-1">More Than 5M Contacted Time <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.moreThan10MContactedTime && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('moreThan10MContactedTime' as keyof Lead)}>
                      <div className="flex items-center gap-1">More Than 10M Contacted Time <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.moreThan15MContactedTime && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('moreThan15MContactedTime' as keyof Lead)}>
                      <div className="flex items-center gap-1">More Than 15M Contacted Time <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.conversionDate && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('conversionDate' as keyof Lead)}>
                      <div className="flex items-center gap-1">Conversion Date <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.managerPrioritized && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('managerPrioritized' as keyof Lead)}>
                      <div className="flex items-center gap-1">Manager Prioritized <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.firstAssignmentDate && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('firstAssignmentDate' as keyof Lead)}>
                      <div className="flex items-center gap-1">First Assignment Date <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.transitionToAdmitted && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('transitionToAdmitted' as keyof Lead)}>
                      <div className="flex items-center gap-1">Transition to Admitted <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.transitionToOBInitiated && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('transitionToOBInitiated' as keyof Lead)}>
                      <div className="flex items-center gap-1">Transition to OB Initiated <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.transitionToOffer && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('transitionToOffer' as keyof Lead)}>
                      <div className="flex items-center gap-1">Transition to Offer <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.transitionToVerificationPending && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('transitionToVerificationPending' as keyof Lead)}>
                      <div className="flex items-center gap-1">Transition to Verification Pending <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.transitionToConverted && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('transitionToConverted' as keyof Lead)}>
                      <div className="flex items-center gap-1">Transition to Converted <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {visibleColumns.transitionToScreening && (
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => handleSort('transitionToScreening' as keyof Lead)}>
                      <div className="flex items-center gap-1">Transition to Screening <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    )}
                    {!isCounselor && (
                      <th scope="col" className="px-4 py-3 font-semibold text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody 
                  className="divide-y divide-border select-none"
                  onContextMenu={(e) => e.preventDefault()}
                  onCopy={(e) => e.preventDefault()}
                >
                  {paginatedLeads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      onClick={(e) => {
                        // Prevent navigation if clicking on checkbox or action buttons
                        const target = e.target as HTMLElement;
                        if (!target.closest('button') && !target.closest('input[type="checkbox"]')) {
                          window.open(`/all-leads/${lead.id}`, '_blank');
                        }
                      }}
                      className={cn("hover:bg-muted/30 transition-colors cursor-pointer group", selectedIds.has(lead.id) && "bg-primary/5")}
                    >
                      <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                        {!isCounselor && (
                          <input 
                            type="checkbox"
                            checked={selectedIds.has(lead.id)}
                            onChange={() => handleSelectOne(lead.id)}
                            className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                          />
                        )}
                      </td>
                      {visibleColumns.leadDetails && (
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5 items-start">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{lead.name}</span>
                            {getSLAStatus(lead) && (
                              <span className={cn("px-1.5 py-0.5 rounded border text-[9px] font-semibold flex items-center gap-1", getSLAStatus(lead)?.color)}>
                                {React.createElement(getSLAStatus(lead)!.icon, { className: "w-2.5 h-2.5" })}
                                {getSLAStatus(lead)?.label}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{lead.email}</span>
                          <span className="text-xs text-muted-foreground">{lead.leadNumber} • {lead.phone}</span>
                        </div>
                      </td>
                      )}
                      {visibleColumns.callAttempts && (
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{lead.callAttempts ?? (lead as any).call_attempts ?? 0}</td>
                      )}
                      {visibleColumns.interactions && (
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{lead.interactionsCount ?? (lead as any).interactions_count ?? 0}</td>
                      )}
                      {visibleColumns.courseUni && (
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">{typeof lead.course === 'string' ? lead.course : (lead.course?.name || 'Not specified')}</span>
                          <span className="text-xs text-muted-foreground">{typeof lead.university === 'string' ? lead.university : (lead.university?.name || 'Not specified')}</span>
                        </div>
                      </td>
                      )}
                      {visibleColumns.score && (
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1.5 w-32">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all duration-500',
                                  (lead.leadScore ?? lead.score ?? 0) >= 81 ? 'bg-orange-500' :
                                  (lead.leadScore ?? lead.score ?? 0) >= 61 ? 'bg-amber-500' :
                                  (lead.leadScore ?? lead.score ?? 0) >= 31 ? 'bg-sky-500' :
                                  'bg-blue-400'
                                )}
                                style={{ width: `${Math.min(lead.leadScore ?? lead.score ?? 0, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold">{lead.leadScore ?? lead.score ?? 0}</span>
                          </div>
                          <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-semibold border w-fit', 
                            computeIntent(lead) === 'HOT' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400' :
                            computeIntent(lead) === 'WARM' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400' :
                            'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400'
                          )}>
                            {computeIntent(lead)}
                          </span>
                        </div>
                      </td>
                      )}
                      {visibleColumns.status && (
                      <td className="px-4 py-4">
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', statusColors[(lead.leadStatus || lead.status) as LeadStatus] || 'bg-gray-100 text-gray-600')}>
                          {lead.leadStatus || lead.status || 'New'}
                        </span>
                      </td>
                      )}
                      {visibleColumns.priority && (
                      <td className="px-4 py-4">
                        <span className={cn("text-xs font-semibold", priorityColors[lead.priority as LeadPriority])}>
                          {lead.priority || 'Medium'}
                        </span>
                      </td>
                      )}
                      {!isCounselor && visibleColumns.counselor && (
                      <td className="px-4 py-4 font-medium text-sm" onClick={e => e.stopPropagation()}>
                        <select
                          value={lead.assignedCounselor || lead.counselorId || ''}
                          onChange={async (e) => {
                            const newAssigneeId = e.target.value;
                            if (newAssigneeId) {
                               await assignLead(lead.id, newAssigneeId);
                               refresh();
                            }
                          }}
                          className="bg-background border border-border rounded-lg text-sm px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary w-[140px] text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <option value="">Unassigned</option>
                          {allUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </td>
                      )}
                      {visibleColumns.createdOn && (
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground text-sm">
                            {lead.createdAt ? format(new Date(lead.createdAt), 'dd MMM yyyy') : 'N/A'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {lead.createdAt ? format(new Date(lead.createdAt), 'hh:mm a') : ''}
                          </span>
                        </div>
                      </td>
                      )}
                      {visibleColumns.modifiedOn && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).updatedAt || (lead as any).updated_at)}</td>}
                      {visibleColumns.assignmentDate && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).assignmentDate)}</td>}
                      {visibleColumns.lastCallDate && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(lead.lastCallDate || (lead as any).last_call_date)}</td>}
                      {visibleColumns.firstCallDate && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).firstCallDate)}</td>}
                      {visibleColumns.finalFollowUpDate && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(lead.finalFollowUpDate || (lead as any).final_follow_up_date)}</td>}
                      {visibleColumns.contactedTimestamp && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).contactedTimestamp)}</td>}
                      {visibleColumns.transitionToFallOut && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).transition_to_fallout_at || (lead as any).transitionToFallOut)}</td>}
                      {visibleColumns.transitionToCounselled && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).transition_to_counselled_at || (lead as any).transitionToCounselled)}</td>}
                      {visibleColumns.moreThan5MContactedTime && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{(lead as any).moreThan5MContactedTime ? 'Yes' : 'No'}</td>}
                      {visibleColumns.moreThan10MContactedTime && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{(lead as any).moreThan10MContactedTime ? 'Yes' : 'No'}</td>}
                      {visibleColumns.moreThan15MContactedTime && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{(lead as any).moreThan15MContactedTime ? 'Yes' : 'No'}</td>}
                      {visibleColumns.conversionDate && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).conversionDate)}</td>}
                      {visibleColumns.managerPrioritized && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{(lead as any).managerPrioritized ? 'Yes' : 'No'}</td>}
                      {visibleColumns.firstAssignmentDate && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).firstAssignmentDate)}</td>}
                      {visibleColumns.transitionToAdmitted && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).transitionToAdmitted)}</td>}
                      {visibleColumns.transitionToOBInitiated && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).transition_to_ob_initiated_at || (lead as any).transitionToOBInitiated)}</td>}
                      {visibleColumns.transitionToOffer && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).transition_to_offer_at || (lead as any).transitionToOffer)}</td>}
                      {visibleColumns.transitionToVerificationPending && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).transitionToVerificationPending)}</td>}
                      {visibleColumns.transitionToConverted && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).transition_to_converted_at || (lead as any).transitionToConverted)}</td>}
                      {visibleColumns.transitionToScreening && <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate((lead as any).transitionToScreening)}</td>}
                      {!isCounselor && (
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLead(lead);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit Lead"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            
                            {/* Duplicate Action */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (await confirm({
                                  title: 'Duplicate Lead',
                                  message: 'Are you sure you want to duplicate this lead?',
                                  confirmLabel: 'Duplicate'
                                })) {
                                  const res = await duplicateLead(lead.id);
                                  if (res.success) toast.success('Lead duplicated successfully');
                                }
                              }}
                              className="p-1.5 rounded-md hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"
                              title="Duplicate Lead"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
  
                            {/* Restore or Delete Action depending on deleted status */}
                            {lead.deletedAt ? (
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const res = await restoreLead(lead.id);
                                  if (res.success) toast.success('Lead restored successfully');
                                }}
                                className="p-1.5 rounded-md hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors"
                                title="Restore Lead"
                              >
                                <ArchiveRestore className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (await confirm({
                                    title: 'Delete Lead',
                                    message: 'Are you sure you want to delete this lead?',
                                    confirmLabel: 'Delete',
                                    variant: 'danger'
                                  })) {
                                    await deleteLead(lead.id);
                                    toast.success('Lead deleted successfully');
                                  }
                                }}
                                className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {paginatedLeads.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-0">
                        <EmptyState 
                          icon={Users}
                          title="No leads found"
                          description="We couldn't find any leads matching your current filters."
                          action={
                            <button 
                              onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('All');
                              }}
                              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                              Clear Filters
                            </button>
                          }
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Footer */}
            <div className="p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between text-sm gap-4">
              <span className="text-muted-foreground">
                Showing <span className="font-medium text-foreground">{totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="font-medium text-foreground">{totalCount}</span> results
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Rows per page:</span>
                  <select 
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-card border border-border rounded text-sm px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                    <option value={5000}>5000</option>
                    <option value={10000}>10000</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-border rounded-md hover:bg-muted font-medium transition-colors disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1 px-2">
                     {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                       // Display window of 5 pages around current page
                       let pageNum = currentPage - 2 + idx;
                       if (currentPage <= 3) pageNum = idx + 1;
                       if (currentPage > totalPages - 2) pageNum = totalPages - 4 + idx;
                       if (pageNum > 0 && pageNum <= totalPages) {
                         return (
                           <button
                             key={pageNum}
                             onClick={() => setCurrentPage(pageNum)}
                             className={cn("w-7 h-7 rounded-md flex items-center justify-center font-medium transition-colors", currentPage === pageNum ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground hover:text-foreground")}
                           >
                             {pageNum}
                           </button>
                         );
                       }
                       return null;
                     })}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || totalPages === 0}
                    className="px-3 py-1 border border-border rounded-md hover:bg-muted font-medium transition-colors disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>

      </div>

      <LeadFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSubmit={handleAddOrEdit} 
        initialData={selectedLead} 
      />

      <MergeLeadsModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        leads={paginatedLeads}
        onMerge={mergeLeads}
      />

      {/* ── CSV Import Preview Modal ──────────────────────────────────────── */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Import Leads</h2>
                  <p className="text-sm text-muted-foreground">{importPreview.rows.length} rows detected — map your columns below</p>
                </div>
              </div>
              <button 
                onClick={() => { setImportPreview(null); setImportResults(null); }}
                className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {importResults ? (
                /* Results View */
                <div className="space-y-4">
                  <div className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border",
                    importResults.success > 0 ? "bg-green-500/10 border-green-500/30 text-green-600" : "bg-red-500/10 border-red-500/30 text-red-500"
                  )}>
                    {importResults.success > 0 
                      ? <CheckCircle className="w-6 h-6 shrink-0" />
                      : <AlertCircle className="w-6 h-6 shrink-0" />
                    }
                    <div>
                      <p className="font-semibold">{importResults.success > 0 ? 'Import Complete' : 'Import Failed'}</p>
                      <p className="text-sm opacity-80">
                        {importResults.success} imported successfully
                        {importResults.failed > 0 && `, ${importResults.failed} failed`}
                      </p>
                    </div>
                  </div>
                  {importResults.errors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Errors:</p>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {importResults.errors.map((err, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-red-500 bg-red-500/5 px-3 py-2 rounded-lg">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Column Mapping */}
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-3">Column Mapping</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {DB_FIELDS.map((field) => (
                        <div key={field.key} className="flex items-center gap-2">
                          <label className="w-36 text-sm text-muted-foreground shrink-0">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-0.5">*</span>}
                          </label>
                          <select
                            value={importPreview.mapping[field.key] || ''}
                            onChange={(e) => setImportPreview(prev => prev ? {
                              ...prev,
                              mapping: { ...prev.mapping, [field.key]: e.target.value }
                            } : null)}
                            className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">— Skip —</option>
                            {importPreview.headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Data Preview */}
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-3">
                      Preview <span className="text-muted-foreground font-normal">(first 5 rows)</span>
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            {importPreview.headers.map(h => (
                              <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {importPreview.rows.slice(0, 5).map((row, i) => (
                            <tr key={i} className="hover:bg-muted/30">
                              {importPreview.headers.map(h => (
                                <td key={h} className="px-3 py-2 text-foreground whitespace-nowrap max-w-[200px] truncate">{row[h]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {importPreview.rows.length > 5 && (
                      <p className="text-xs text-muted-foreground mt-2 text-right">
                        +{importPreview.rows.length - 5} more rows will be imported
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-border shrink-0">
              <button
                onClick={() => { setImportPreview(null); setImportResults(null); }}
                className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
              >
                {importResults ? 'Close' : 'Cancel'}
              </button>
              {!importResults && (
                <button
                  onClick={handleImportSubmit}
                  disabled={isImporting}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Importing…
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import {importPreview.rows.length} Leads
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Assign Modal ──────────────────────────────────────────────── */}
      {showBulkAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">Bulk Assign Leads</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Assigning {selectedIds.size} selected lead{selectedIds.size !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => { setShowBulkAssign(false); setBulkAssignUserIds([]); setBulkAssignSearch(''); }}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={bulkAssignSearch}
                  onChange={e => setBulkAssignSearch(e.target.value)}
                  placeholder="Search by name, role, department..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {/* User List */}
              <div className="max-h-72 overflow-y-auto space-y-1.5 border border-border rounded-xl p-1">
                {allUsers
                  .filter(u =>
                    !bulkAssignSearch ||
                    u.name.toLowerCase().includes(bulkAssignSearch.toLowerCase()) ||
                    u.role_name.toLowerCase().includes(bulkAssignSearch.toLowerCase()) ||
                    (u.department || '').toLowerCase().includes(bulkAssignSearch.toLowerCase())
                  )
                  .map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setBulkAssignUserIds(prev => 
                          prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                        );
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg text-sm transition-colors text-left',
                        bulkAssignUserIds.includes(u.id)
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted border border-transparent'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{u.name}</span>
                          {bulkAssignUserIds.includes(u.id) && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                            u.role_name === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' :
                            u.role_name === 'Manager' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                            u.role_name === 'Team Leader' ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' :
                            'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400'
                          )}>
                            {u.role_name}
                          </span>
                          {u.department && <span className="text-[10px] text-muted-foreground">{u.department}</span>}
                          <span className="text-[10px] font-bold text-primary/80 ml-auto">{u.active_lead_count} leads</span>
                        </div>
                      </div>
                    </button>
                  ))
                }
                {allUsers.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No assignable users found. Make sure users have roles like Admin, Manager, Team Leader, or Counselor.
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 p-5 border-t border-border">
              <button
                onClick={() => { setShowBulkAssign(false); setBulkAssignUserIds([]); }}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={bulkAssignUserIds.length === 0 || isAssigning}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAssigning ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : <UserPlus className="w-4 h-4" />}
                {isAssigning ? 'Assigning...' : bulkAssignUserIds.length > 1 ? `Round Robin (${bulkAssignUserIds.length})` : `Assign ${selectedIds.size} Lead${selectedIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Update Modal ──────────────────────────────────────────────── */}
      {showBulkUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">Bulk Update Leads</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Updating {selectedIds.size} selected lead{selectedIds.size !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => { setShowBulkUpdate(false); setBulkUpdateField(''); setBulkUpdateValue(''); }}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Field to Update</label>
                <select
                  value={bulkUpdateField}
                  onChange={e => {
                    setBulkUpdateField(e.target.value as any);
                    setBulkUpdateValue(''); // reset value when field changes
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select a field...</option>
                  <option value="status">Lead Status</option>
                  <option value="priority">Priority</option>
                  <option value="source">Lead Source</option>
                </select>
              </div>

              {bulkUpdateField === 'status' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">New Status</label>
                  <select
                    value={bulkUpdateValue}
                    onChange={e => setBulkUpdateValue(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select status...</option>
                    <option value="Inquiry">Inquiry</option>
                    <option value="Not Connected">Not Connected</option>
                    <option value="Cold">Cold</option>
                    <option value="Warm">Warm</option>
                    <option value="Hot">Hot</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Application">Application</option>
                    <option value="Docs Pending">Docs Pending</option>
                    <option value="Admitted">Admitted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              )}

              {bulkUpdateField === 'priority' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">New Priority</label>
                  <select
                    value={bulkUpdateValue}
                    onChange={e => setBulkUpdateValue(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select priority...</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              )}

              {bulkUpdateField === 'source' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">New Source</label>
                  <select
                    value={bulkUpdateValue}
                    onChange={e => setBulkUpdateValue(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select source...</option>
                    <option value="Website">Website</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Referral">Referral</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Event">Event</option>
                    <option value="Agency">Agency</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 p-5 border-t border-border bg-muted/20">
              <button
                onClick={() => { setShowBulkUpdate(false); setBulkUpdateField(''); setBulkUpdateValue(''); }}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors bg-card"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpdateSubmit}
                disabled={!bulkUpdateField || !bulkUpdateValue || isBulkUpdating}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBulkUpdating ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : <Edit2 className="w-4 h-4" />}
                {isBulkUpdating ? 'Updating...' : 'Update Leads'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LeadFiltersSheet 
        isOpen={isFiltersSheetOpen}
        onClose={() => setIsFiltersSheetOpen(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        showDeleted={showDeleted}
        setShowDeleted={setShowDeleted}
      />

       <LeadSortSheet 
        isOpen={isSortSheetOpen}
        onClose={() => setIsSortSheetOpen(false)}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={(f, d) => {
          setSortField(f);
          setSortDirection(d);
        }}
      />

      <AdvancedFilterSidebar
        isOpen={isAdvancedFilterSidebarOpen}
        onClose={() => setIsAdvancedFilterSidebarOpen(false)}
        filterState={advancedFilterState || { rootGroup: { id: 'root', logic: 'AND', conditions: [] } }}
        onFilterChange={setAdvancedFilterState}
        onApply={() => {
          setCurrentPage(1);
          setIsAdvancedFilterSidebarOpen(false);
        }}
        onClear={() => {
          setAdvancedFilterState(undefined);
        }}
      />
    </div>
  );
}
