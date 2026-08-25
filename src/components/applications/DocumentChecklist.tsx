import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Clock, File as FileIcon, MoreVertical, Eye, Download, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface DocumentChecklistProps {
  admissionId: string;
  role: 'Admin' | 'Counselor' | 'Partner';
}

interface Requirement {
  id: string;
  name: string;
  is_mandatory: boolean;
  status: string;
  uploaded_file: string | null;
  updated_at: string | null;
  rejection_reason?: string;
}

export function DocumentChecklist({ admissionId, role }: DocumentChecklistProps) {
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [requirements, setRequirements] = useState<Requirement[]>([
    { id: 'req-1', name: 'Degree Certificate', is_mandatory: true, status: 'Approved', uploaded_file: 'BTech_Degree_Rahul.pdf', updated_at: '2 days ago' },
    { id: 'req-2', name: 'Passport Size Photograph', is_mandatory: true, status: 'Pending Upload', uploaded_file: null, updated_at: null },
    { id: 'req-3', name: 'Work Experience Letter', is_mandatory: false, status: 'Under Review', uploaded_file: 'Exp_Letter_TCS.pdf', updated_at: '4 hours ago' },
    { id: 'req-4', name: 'Identity Proof (Passport)', is_mandatory: true, status: 'Rejected', uploaded_file: 'Passport_Scan.jpg', updated_at: '1 hour ago', rejection_reason: 'Image is blurry. Please re-upload a clear scan.' },
  ]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Approved':
        return { icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400' };
      case 'Rejected':
        return { icon: <AlertCircle className="w-5 h-5 text-red-500" />, bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-700 dark:text-red-400' };
      case 'Under Review':
        return { icon: <Clock className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-700 dark:text-amber-400' };
      default:
        return { icon: <UploadCloud className="w-5 h-5 text-muted-foreground" />, bg: 'bg-muted/50', border: 'border-border/50', text: 'text-muted-foreground' };
    }
  };

  const handleSingleUpload = (reqId: string, file: File) => {
    setRequirements(prev => prev.map(r =>
      r.id === reqId
        ? { ...r, uploaded_file: file.name, status: 'Under Review', updated_at: 'just now' }
        : r
    ));
    toast.success(`"${file.name}" uploaded successfully. Under review.`);
  };

  const handleBulkUpload = (files: FileList) => {
    const fileNames = Array.from(files).map(f => f.name);
    toast.success(`${files.length} file(s) queued for upload: ${fileNames.join(', ')}`);
    // In production: upload each file to Supabase Storage and link to document requirements
  };

  const handleRemove = (reqId: string, docName: string) => {
    setRequirements(prev => prev.map(r =>
      r.id === reqId
        ? { ...r, uploaded_file: null, status: 'Pending Upload', updated_at: null }
        : r
    ));
    setMenuOpenId(null);
    toast.success(`"${docName}" removed.`);
  };

  return (
    <div className="space-y-4" onClick={() => setMenuOpenId(null)}>
      {/* Hidden bulk input */}
      <input
        ref={bulkInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={e => { if (e.target.files?.length) handleBulkUpload(e.target.files); e.target.value = ''; }}
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-foreground">Required Documents</h2>
        <button
          onClick={() => bulkInputRef.current?.click()}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-colors"
        >
          <UploadCloud className="w-4 h-4" /> Bulk Upload
        </button>
      </div>

      <div className="grid gap-4">
        {requirements.map((req) => {
          const conf = getStatusConfig(req.status);
          // Each row gets its own hidden file input
          const inputId = `file-input-${req.id}`;
          return (
            <div key={req.id} className={cn("flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md bg-card", conf.border)}>
              {/* Hidden per-document input */}
              <input
                id={inputId}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.[0]) handleSingleUpload(req.id, e.target.files[0]);
                  e.target.value = '';
                }}
              />

              <div className="flex items-start gap-4 mb-4 sm:mb-0">
                <div className={cn("p-2.5 rounded-lg shrink-0", conf.bg)}>
                  {conf.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground text-base">{req.name}</h3>
                    {req.is_mandatory && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 uppercase tracking-wider">
                        Required
                      </span>
                    )}
                  </div>

                  {req.uploaded_file ? (
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                      <FileIcon className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[200px]">{req.uploaded_file}</span>
                      <span className="text-xs opacity-70">• {req.updated_at}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5">Please upload a valid document format (PDF, JPG, PNG).</p>
                  )}

                  {req.status === 'Rejected' && req.rejection_reason && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-500/10 p-2 rounded-md border border-red-100 dark:border-red-500/20">
                      Reason: {req.rejection_reason}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 relative">
                <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider", conf.bg, conf.text)}>
                  {req.status}
                </span>

                {req.status !== 'Approved' && (
                  <button
                    onClick={() => document.getElementById(inputId)?.click()}
                    className="px-4 py-2 border border-input bg-background hover:bg-muted text-foreground text-sm font-medium rounded-lg transition-colors"
                  >
                    {req.status === 'Rejected' ? 'Replace' : 'Upload'}
                  </button>
                )}

                {/* ⋮ Context Menu */}
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === req.id ? null : req.id)}
                    className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuOpenId === req.id && (
                    <div className="absolute right-0 top-10 z-50 w-44 bg-card border border-border rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-150">
                      {req.uploaded_file && (
                        <>
                          <button
                            onClick={() => { toast.info(`Viewing: ${req.uploaded_file}`); setMenuOpenId(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted text-foreground transition-colors"
                          >
                            <Eye className="w-4 h-4 text-muted-foreground" /> View Document
                          </button>
                          <button
                            onClick={() => { toast.success(`Downloading: ${req.uploaded_file}`); setMenuOpenId(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted text-foreground transition-colors"
                          >
                            <Download className="w-4 h-4 text-muted-foreground" /> Download
                          </button>
                          <div className="border-t border-border my-1" />
                          <button
                            onClick={() => handleRemove(req.id, req.uploaded_file!)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> Remove
                          </button>
                        </>
                      )}
                      {!req.uploaded_file && (
                        <button
                          onClick={() => { document.getElementById(inputId)?.click(); setMenuOpenId(null); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted text-foreground transition-colors"
                        >
                          <UploadCloud className="w-4 h-4 text-muted-foreground" /> Upload File
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

