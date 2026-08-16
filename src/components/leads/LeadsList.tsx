import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Download, Upload, Plus, ChevronDown, MoreHorizontal, 
  ArrowUpDown, LayoutList, KanbanSquare, Users, Trash2, Edit2, UserPlus, FileSpreadsheet,
  X, CheckCircle, AlertCircle, FileUp, Copy, ArchiveRestore, Layers, Merge, Check
} from 'lucide-react';
import { useLeads } from '../../hooks/useLeads';
import { Lead, LeadStatus, LeadPriority } from '../../types/schema';
import { cn } from '../../lib/utils';
import { LeadsKanban } from './LeadsKanban';
import { EmptyState } from '../ui/EmptyState';
import { LeadFormModal } from './LeadFormModal';
import { MergeLeadsModal } from './MergeLeadsModal';
import { MobileLeadCard } from './mobile/MobileLeadCard';
import { LeadFiltersSheet } from './mobile/LeadFiltersSheet';
import { LeadSortSheet } from './mobile/LeadSortSheet';
import { useLeadAssignment } from '../../hooks/useLeadAssignment';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

import { addAuditLog } from '../../data/mockAuditLogs';

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

export function LeadsList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'All'>('All');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Advanced Filters
  const [showDeleted, setShowDeleted] = useState(false);
  const [counselorFilter, setCounselorFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
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

  // Mobile State
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

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

  const { leads, totalCount, isLoading, addLead, updateLead, deleteLead, bulkDeleteLeads,
    restoreLead,
    duplicateLead, mergeLeads, bulkUpdateLeads, refresh } = useLeads({
    page: currentPage,
    pageSize: pageSize,
    search: searchTerm,
    filters: { 
      status: statusFilter,
      source: sourceFilter,
      counselorId: counselorFilter,
      showDeleted: showDeleted
    },
    sort: { field: sortField as string, direction: sortDirection }
  });

  const { allUsers, assignLead, isAssigning, bulkAssignLeads, roundRobinAssignLeads } = useLeadAssignment();

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
      if (!p.lead_status) p.lead_status = 'New';
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
    'New': 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
    'Attempted': 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
    'Connected': 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    'Interested': 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    'Qualified': 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
    'Application Started': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
    'Documents Pending': 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    'Admission Done': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    'Lost': 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  };

  const priorityColors: Record<LeadPriority, string> = {
    'High': 'text-red-600 dark:text-red-500',
    'Medium': 'text-amber-600 dark:text-amber-500',
    'Low': 'text-green-600 dark:text-green-500'
  };

  const getTemperature = (score: number) => {
    if (score >= 91) return { label: 'Ready to Convert', color: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' };
    if (score >= 61) return { label: 'Hot', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' };
    if (score >= 31) return { label: 'Warm', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' };
    return { label: 'Cold', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' };
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
    if (confirm(`Are you sure you want to delete ${selectedIds.size} leads?`)) {
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
      Counselor: l.counselor
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
      }
    } else {
      const res = await addLead(data);
      if (res.success) {
        toast.success('Lead created successfully');
      }
    }
  };

  const totalLeads = totalCount;
  // Use leadStatus which is the canonical field
  const newLeadsCount = paginatedLeads.filter(l => (l.leadStatus || l.status) === 'New').length;
  const admissionsCount = paginatedLeads.filter(l => (l.leadStatus || l.status) === 'Admission Done').length;
  const qualifiedCount = paginatedLeads.filter(l => (l.leadStatus || l.status) === 'Qualified').length;
  const lostCount = paginatedLeads.filter(l => (l.leadStatus || l.status) === 'Lost').length;
  const hotLeadsCount = paginatedLeads.filter(l => (l.leadScore ?? l.score ?? 0) >= 61).length;
  const conversionRate = paginatedLeads.length ? Math.round((admissionsCount / paginatedLeads.length) * 100) : 0;

  return (
    <div className="flex flex-col animate-in fade-in duration-500 pb-10">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between mb-4 mt-2 px-1">
        <div>
          <h1 className="text-2xl font-black text-foreground leading-tight">Leads</h1>
          <p className="text-xs text-muted-foreground font-medium">{totalLeads} Total Leads</p>
        </div>
        <button 
          onClick={() => { setSelectedLead(undefined); setIsFormOpen(true); }}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg font-bold transition-all text-sm shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Lead
        </button>
      </div>

      {/* Mobile Search & Filter Bar */}
      <div className="md:hidden flex items-center gap-2 mb-4 px-1">
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
          {(statusFilter !== 'All' || showDeleted) && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full" />
          )}
        </button>
        <button 
          onClick={() => setIsSortSheetOpen(true)}
          className="w-11 h-11 flex items-center justify-center bg-card border border-border rounded-xl text-foreground hover:bg-muted transition-colors active:scale-95 shrink-0"
        >
          <ArrowUpDown className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Header & Actions */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Leads Management</h1>
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

      {/* Summary Cards */}
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

      {/* Mobile KPI horizontal scroll */}
      <div className="md:hidden flex gap-3 px-1 mb-3 overflow-x-auto hide-scrollbar pb-1">
        {[
          { label: 'Total', value: totalLeads, color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' },
          { label: 'New', value: newLeadsCount, color: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10' },
          { label: 'Qualified', value: qualifiedCount, color: 'text-teal-600 bg-teal-50 dark:bg-teal-500/10' },
          { label: '🔥 Hot', value: hotLeadsCount, color: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10' },
          { label: 'Lost', value: lostCount, color: 'text-red-600 bg-red-50 dark:bg-red-500/10' },
        ].map(kpi => (
          <div key={kpi.label} className={cn('shrink-0 px-3.5 py-2 rounded-xl flex flex-col items-center', kpi.color)}>
            <span className="text-[11px] font-semibold whitespace-nowrap">{kpi.label}</span>
            <span className="text-lg font-black">{kpi.value}</span>
          </div>
        ))}
      </div>

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
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {selectedIds.size > 0 && (
              <>
                <button 
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedIds.size})
                </button>
                <button 
                  onClick={() => setShowBulkAssign(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign ({selectedIds.size})
                </button>
                <button 
                  onClick={() => setShowBulkUpdate(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Update ({selectedIds.size})
                </button>
              </>
            )}

            <button 
              onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-semibold transition-colors",
                isAdvancedFiltersOpen ? "bg-primary/10 text-primary border-primary/30" : "bg-card text-foreground border-border hover:bg-muted"
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(statusFilter !== 'All' || sourceFilter !== 'All' || counselorFilter !== 'All' || showDeleted) && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </button>

            <div className="flex items-center p-1 bg-muted rounded-lg border border-border">
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('kanban')}
                className={cn("p-1.5 rounded-md transition-all", viewMode === 'kanban' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <KanbanSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {isAdvancedFiltersOpen && (
          <div className="hidden md:flex p-4 border-b border-border bg-muted/5 gap-4 items-end animate-in slide-in-from-top-2 duration-200 flex-wrap">
            <div className="flex flex-col gap-1.5 w-48">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Status</label>
              <div className="relative">
                <select 
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="appearance-none w-full bg-card border border-border rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer font-medium"
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Attempted">Attempted</option>
                  <option value="Connected">Connected</option>
                  <option value="Interested">Interested</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Application Started">Application Started</option>
                  <option value="Documents Pending">Documents Pending</option>
                  <option value="Admission Done">Admission Done</option>
                  <option value="Lost">Lost</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 w-48">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Source</label>
              <div className="relative">
                <select 
                  value={sourceFilter}
                  onChange={e => {
                    setSourceFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none w-full bg-card border border-border rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer font-medium"
                >
                  <option value="All">All Sources</option>
                  <option value="Meta">Meta</option>
                  <option value="Google">Google</option>
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 w-48">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Counselor</label>
              <div className="relative">
                <select 
                  value={counselorFilter}
                  onChange={e => {
                    setCounselorFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none w-full bg-card border border-border rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer font-medium"
                >
                  <option value="All">All Counselors</option>
                  <option value="Unassigned">Unassigned</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-foreground font-semibold flex items-center gap-2 cursor-pointer select-none border border-border bg-card px-3 py-2 rounded-lg hover:bg-muted transition-colors h-[38px]">
                <input 
                  type="checkbox" 
                  checked={showDeleted} 
                  onChange={e => { setShowDeleted(e.target.checked); setCurrentPage(1); }} 
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                Show Deleted Leads
              </label>
            </div>
            
            <div className="ml-auto">
               <button 
                 onClick={() => {
                   setStatusFilter('All');
                   setSourceFilter('All');
                   setCounselorFilter('All');
                   setShowDeleted(false);
                 }}
                 className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 h-[38px]"
               >
                 Clear All
               </button>
            </div>
          </div>
        )}

        {viewMode === 'list' ? (
          <>
            <div className="md:hidden flex-1 overflow-y-auto px-4 py-2 space-y-3 pb-32">
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
                      onClick={() => { setSearchTerm(''); setStatusFilter('All'); }}
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
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 border-b border-border">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold w-10">
                      <input 
                        type="checkbox"
                        checked={paginatedLeads.length > 0 && selectedIds.size === paginatedLeads.length}
                        onChange={handleSelectAll}
                        className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1">Lead Details <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('course')}>
                      <div className="flex items-center gap-1">Course & Uni <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('score')}>
                      <div className="flex items-center gap-1">Score <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('priority')}>
                       <div className="flex items-center gap-1">Priority <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">Counselor</th>
                    <th scope="col" className="px-4 py-3 font-semibold cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center gap-1">Captured On <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedLeads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      onClick={(e) => {
                        // Prevent navigation if clicking on checkbox or action buttons
                        const target = e.target as HTMLElement;
                        if (!target.closest('button') && !target.closest('input[type="checkbox"]')) {
                          navigate(`/leads/${lead.id}`);
                        }
                      }}
                      className={cn("hover:bg-muted/30 transition-colors cursor-pointer group", selectedIds.has(lead.id) && "bg-primary/5")}
                    >
                      <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => handleSelectOne(lead.id)}
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{lead.name}</span>
                          <span className="text-xs text-muted-foreground">{lead.email}</span>
                          <span className="text-xs text-muted-foreground">{lead.leadNumber} • {lead.phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">{lead.course || 'Not specified'}</span>
                          <span className="text-xs text-muted-foreground">{lead.university || 'Not specified'}</span>
                        </div>
                      </td>
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
                          <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-semibold border w-fit', getTemperature(lead.leadScore ?? lead.score ?? 0).color)}>
                            {getTemperature(lead.leadScore ?? lead.score ?? 0).label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', statusColors[(lead.leadStatus || lead.status) as LeadStatus] || 'bg-gray-100 text-gray-600')}>
                          {lead.leadStatus || lead.status || 'New'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn("text-xs font-semibold", priorityColors[lead.priority as LeadPriority])}>
                          {lead.priority || 'Medium'}
                        </span>
                      </td>
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
                          className="bg-transparent border border-border rounded-lg text-sm px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary w-[140px] text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <option value="">Unassigned</option>
                          {allUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </td>
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
                              if (confirm('Are you sure you want to duplicate this lead?')) {
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
                          {lead.deleted_at ? (
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
                                if (confirm('Are you sure you want to delete this lead?')) {
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
        ) : (
          <div className="flex-1 p-4 overflow-hidden flex flex-col bg-muted/10">
            <LeadsKanban searchTerm={searchTerm} leads={leads} updateLead={updateLead} />
          </div>
        )}
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
                    <option value="New">New</option>
                    <option value="Attempted">Attempted</option>
                    <option value="Connected">Connected</option>
                    <option value="Interested">Interested</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Application Started">Application Started</option>
                    <option value="Documents Pending">Documents Pending</option>
                    <option value="Admission Done">Admission Done</option>
                    <option value="Lost">Lost</option>
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
    </div>
  );
}
