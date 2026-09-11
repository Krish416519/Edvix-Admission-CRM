import { useState, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Search
} from 'lucide-react';
import { useIntegration } from '../../lib/integrationService';
import { ImportJob, DeduplicationStrategy } from '../../types/integration';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const CRM_TARGET_FIELDS = [
  { id: 'name', label: 'Student Full Name', required: true, aliases: ['name', 'full name', 'student name', 'candidate name', 'applicant'] },
  { id: 'phone', label: 'Phone / Mobile', required: true, aliases: ['phone', 'mobile', 'contact', 'phone number', 'mobile number'] },
  { id: 'email', label: 'Email Address', required: false, aliases: ['email', 'email address', 'mail'] },
  { id: 'course', label: 'Desired Course / Program', required: false, aliases: ['course', 'program', 'degree', 'desired course', 'stream'] },
  { id: 'city', label: 'City', required: false, aliases: ['city', 'town', 'district'] },
  { id: 'state', label: 'State', required: false, aliases: ['state', 'province', 'region'] },
  { id: 'budget', label: 'Budget / Fee Expectation', required: false, aliases: ['budget', 'fee', 'annual fee', 'budget range'] },
  { id: 'priority', label: 'Priority (High/Med/Low)', required: false, aliases: ['priority', 'urgency', 'intent'] },
  { id: 'source', label: 'Lead Source Tag', required: false, aliases: ['source', 'lead source', 'campaign', 'channel'] }
];

export function ImportTab() {
  const { importJobs: jobs, executeCsvImport } = useIntegration();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredJobs = useMemo(() => {
    return jobs.filter(j =>
      j.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.source.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [jobs, searchQuery]);

  const downloadSampleCsv = () => {
    const csvContent =
      'Student Name,Phone Number,Email Address,Desired Course,City,State,Budget,Priority,Lead Source\n' +
      'Aarav Sharma,9876543210,aarav.sharma@example.com,B.Tech Computer Science,Mumbai,Maharashtra,₹3,50,000 / yr,High,Campus Walkin\n' +
      'Priya Patel,9823456789,priya.patel@example.com,MBA Marketing,Ahmedabad,Gujarat,₹5,00,000 / yr,Medium,Shiksha Export\n' +
      'Rohan Iyer,9811223344,rohan.iyer@example.com,BBA International Business,Bengaluru,Karnataka,₹2,80,000 / yr,High,CollegeDunia\n' +
      'Sneha Mukherjee,9833445566,sneha.m@example.com,B.Des Fashion,Kolkata,West Bengal,₹4,20,000 / yr,Medium,Meta Ad Form\n' +
      'Kabir Verma,9844556677,kabir.verma@example.com,BCA Data Science,Delhi,Delhi NCR,₹2,50,000 / yr,Low,Website Direct\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'edvix_leads_import_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded edvix_leads_import_sample.csv');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-emerald-500/5 p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Bulk Lead Ingestion</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              CSV & Excel
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Upload CSV datasets from education fairs, external aggregators, or offline registrations with automated field mapping and duplicate resolution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={downloadSampleCsv}
            className="bg-card hover:bg-muted text-foreground px-3.5 py-2.5 rounded-xl text-sm font-semibold border border-border flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Download Sample CSV
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Upload className="w-4 h-4" />
            Import Leads
          </button>
        </div>
      </div>

      {/* Filter and Jobs History */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search previous imports..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-foreground"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Total Batches: <strong className="text-foreground">{jobs.length}</strong>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Import Batch & Source</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Processed Leads</th>
                  <th className="px-5 py-3.5">Duplicates</th>
                  <th className="px-5 py-3.5">Execution Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredJobs.map(job => (
                  <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm">{job.filename}</div>
                          <div className="text-xs text-muted-foreground">
                            Source Tag: <span className="font-medium text-foreground">{job.source}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {job.status === 'Completed' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                        {job.status === 'Processing' && (
                          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                        )}
                        {job.status === 'Failed' && (
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                        )}
                        <span
                          className={cn(
                            'text-xs font-semibold px-2.5 py-0.5 rounded-full',
                            job.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : job.status === 'Processing'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          )}
                        >
                          {job.status}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1.5 min-w-[130px]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">{job.successCount}</span>
                          <span className="text-muted-foreground">of {job.totalRows} leads</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{
                              width: `${job.totalRows > 0 ? (job.successCount / job.totalRows) * 100 : 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs font-mono text-muted-foreground">
                      {job.duplicateCount > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          {job.duplicateCount} resolved
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(job.startedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => navigate('/all-leads')}
                        className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <span>View Leads</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredJobs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="font-medium text-foreground">No bulk import jobs found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload your first CSV file to populate leads in bulk.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 10x REAL CSV IMPORT WIZARD MODAL                          */}
      {/* ========================================================= */}
      {isImportModalOpen && (
        <RealCsvImportWizard
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => setIsImportModalOpen(false)}
          onExecute={executeCsvImport}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// REAL CSV IMPORT WIZARD COMPONENT
// -------------------------------------------------------------
function RealCsvImportWizard({
  onClose,
  onSuccess,
  onExecute
}: {
  onClose: () => void;
  onSuccess: () => void;
  onExecute: (
    filename: string,
    rows: any[],
    mapping: Record<string, string>,
    strategy: DeduplicationStrategy,
    defaultSource: string
  ) => Promise<any>;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [dedupStrategy, setDedupStrategy] = useState<DeduplicationStrategy>('skip');
  const [sourceTag, setSourceTag] = useState('CSV Import - Sept 2026');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const navigate = useNavigate();

  // Simple and robust client-side CSV parser
  const parseCsvText = (text: string) => {
    const lines = text
      .split(/\r\n|\n/)
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      toast.error('CSV file must have at least a header and one data row');
      return;
    }

    // Split headers respecting potential quotes
    const headers = splitCsvLine(lines[0]);
    setCsvHeaders(headers);

    const rows: Record<string, any>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = splitCsvLine(lines[i]);
      if (values.length === 0) continue;
      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }

    setParsedRows(rows);

    // Auto-map headers
    const autoMap: Record<string, string> = {};
    headers.forEach(header => {
      const lower = header.toLowerCase().trim();
      for (const target of CRM_TARGET_FIELDS) {
        if (target.aliases.some(alias => lower.includes(alias))) {
          autoMap[header] = target.id;
          break;
        }
      }
    });

    setColumnMapping(autoMap);
    setStep(2);
  };

  const splitCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(s => s.replace(/^"|"$/g, '').trim());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setSourceTag(`CSV Upload (${f.name.replace('.csv', '')})`);
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result as string;
        parseCsvText(text);
      };
      reader.readAsText(f);
    }
  };

  const handleRunImport = async () => {
    if (!file) return;
    try {
      setIsProcessing(true);
      const result = await onExecute(
        file.name,
        parsedRows,
        columnMapping,
        dedupStrategy,
        sourceTag.trim() || 'CSV Ingest'
      );
      setImportResult(result);
      setStep(4);
    } catch (e: any) {
      toast.error(`Import failed: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Import Leads Wizard</h3>
              <p className="text-xs text-muted-foreground">Upload, map fields, deduplicate, and ingest into CRM.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 border-b border-border bg-muted/10 flex items-center justify-between text-xs font-semibold">
          {[
            { num: 1, label: 'Upload' },
            { num: 2, label: 'Map Columns' },
            { num: 3, label: 'Deduplication' },
            { num: 4, label: 'Completed' }
          ].map(s => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  step === s.num
                    ? 'bg-primary text-primary-foreground'
                    : step > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step > s.num ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span className={step === s.num ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto min-h-[320px]">
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-10 hover:bg-muted/10 transition-colors text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-lg text-foreground mb-1">Select or Drop CSV File</h4>
              <p className="text-xs text-muted-foreground max-w-sm mb-6">
                Upload lead spreadsheets containing student names, phone numbers, email addresses, and course preferences.
              </p>

              <input
                type="file"
                id="csvFileInput"
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
              />
              <label
                htmlFor="csvFileInput"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5 rounded-xl text-sm shadow-sm cursor-pointer transition-all"
              >
                Browse CSV File
              </label>

              <p className="text-[11px] text-muted-foreground mt-4">
                Supports UTF-8 formatted CSV files up to 20MB.
              </p>
            </div>
          )}

          {/* STEP 2: MAP FIELDS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground">Map CSV Columns to CRM Fields</h4>
                  <p className="text-xs text-muted-foreground">
                    Parsed <strong className="text-foreground">{parsedRows.length}</strong> rows from{' '}
                    <span className="font-mono text-xs">{file?.name}</span>.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {Object.keys(columnMapping).length} / {csvHeaders.length} Mapped
                </span>
              </div>

              {/* Column Mapping Table */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {csvHeaders.map(header => {
                  const currentMappedField = columnMapping[header] || '';

                  return (
                    <div
                      key={header}
                      className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl shadow-2xs"
                    >
                      <div className="flex-1 font-mono text-xs font-semibold text-foreground truncate">
                        {header}
                        <span className="block font-normal text-[10px] text-muted-foreground font-sans">
                          Sample: "{parsedRows[0]?.[header] || 'N/A'}"
                        </span>
                      </div>

                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

                      <div className="flex-1">
                        <select
                          value={currentMappedField}
                          onChange={e => {
                            const val = e.target.value;
                            setColumnMapping(prev => ({ ...prev, [header]: val }));
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">-- Ignore this column --</option>
                          {CRM_TARGET_FIELDS.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.label} {f.required ? '*' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Data Preview */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Data Preview (First 3 Rows)
                </div>
                <div className="bg-muted/30 border border-border rounded-xl p-2.5 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-[11px] text-muted-foreground">
                        {csvHeaders.slice(0, 5).map(h => (
                          <th key={h} className="pb-1.5 pr-3 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 3).map((r, idx) => (
                        <tr key={idx} className="border-b border-border/40 last:border-none">
                          {csvHeaders.slice(0, 5).map(h => (
                            <td key={h} className="py-1.5 pr-3 text-foreground truncate max-w-[120px]">
                              {r[h] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DEDUPLICATION & SETTINGS */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h4 className="font-bold text-sm text-foreground mb-1">Deduplication Strategy</h4>
                <p className="text-xs text-muted-foreground">
                  Select how Edvix should handle existing student records matching the same phone or email.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    id: 'skip',
                    title: 'Skip Duplicate Leads (Recommended)',
                    desc: 'Preserves existing lead ownership and disposition history. Duplicate rows are recorded as skipped.'
                  },
                  {
                    id: 'merge',
                    title: 'Merge & Enrich Existing Leads',
                    desc: 'Updates matching leads with new course interests, budget, or city fields from this batch.'
                  },
                  {
                    id: 'create_always',
                    title: 'Always Create New Leads',
                    desc: 'Creates a distinct lead record even if the phone or email is already registered.'
                  }
                ].map(opt => (
                  <label
                    key={opt.id}
                    onClick={() => setDedupStrategy(opt.id as DeduplicationStrategy)}
                    className={cn(
                      'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                      dedupStrategy === opt.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:bg-muted/30'
                    )}
                  >
                    <div className="mt-0.5">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border flex items-center justify-center',
                          dedupStrategy === opt.id ? 'border-primary' : 'border-muted-foreground'
                        )}
                      >
                        {dedupStrategy === opt.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-foreground">{opt.title}</div>
                      <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Attribution Lead Source Tag
                </label>
                <input
                  type="text"
                  value={sourceTag}
                  onChange={e => setSourceTag(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 text-foreground"
                />
              </div>

              {/* Batch Summary */}
              <div className="bg-muted/40 border border-border rounded-xl p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground">Total Rows Ready:</span>{' '}
                  <strong className="text-foreground">{parsedRows.length}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Target Destination:</span>{' '}
                  <strong className="text-foreground">Admissions CRM Leads</strong>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: RESULT / SUCCESS */}
          {step === 4 && importResult && (
            <div className="flex flex-col items-center justify-center text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-lg text-foreground mb-1">Import Ingested Successfully!</h4>
              <p className="text-xs text-muted-foreground max-w-sm mb-6">
                Your student leads have been parsed, validated against CRM rules, and inserted into Supabase.
              </p>

              <div className="grid grid-cols-3 gap-3 w-full max-w-md bg-muted/40 border border-border rounded-xl p-4 text-center mb-6">
                <div>
                  <div className="text-xs text-muted-foreground">Created Leads</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {importResult.successCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Duplicates</div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {importResult.duplicateCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                  <div className="text-lg font-bold text-foreground">{importResult.totalRows}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onSuccess();
                    navigate('/all-leads');
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <span>View in All Leads</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onSuccess}
                  className="bg-muted hover:bg-muted/80 text-foreground font-semibold px-4 py-2 rounded-xl text-xs"
                >
                  Close Wizard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (step === 1) onClose();
              else setStep((prev => (prev - 1) as any));
            }}
            disabled={step === 4 || isProcessing}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted disabled:opacity-40"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(3)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2 rounded-xl text-xs shadow-sm"
            >
              Continue to Deduplication
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleRunImport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 rounded-xl text-xs shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isProcessing ? 'Ingesting Leads...' : 'Start Ingestion'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
