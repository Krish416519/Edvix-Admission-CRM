import React, { useRef, useState } from 'react';
import { useAdmissionLetters } from '../../hooks/useUniversityOps';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertTriangle, Eye, ShieldCheck, Download, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/Skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface AdmissionLetterManagerProps {
  submissionId: string;
  admissionId: string;
}

const LETTER_TYPES = [
  'Admission Letter',
  'Offer Letter',
  'Provisional Admission',
  'Enrollment Letter'
];

export function AdmissionLetterManager({ submissionId, admissionId }: AdmissionLetterManagerProps) {
  const { userRole } = useAuth();
  const { letters, uploadLetter, updateVerification } = useAdmissionLetters(submissionId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState(LETTER_TYPES[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const canVerify = userRole === 'Admin' || userRole === 'Super Admin' || userRole === 'University Operations Manager';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      await uploadLetter({
        submissionId,
        admissionId,
        letterType: selectedType,
        file
      });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Verified': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'Rejected': return 'text-red-600 bg-red-100 dark:bg-red-500/20 dark:text-red-400';
      case 'Needs Correction': return 'text-orange-600 bg-orange-100 dark:bg-orange-500/20 dark:text-orange-400';
      case 'Under Review': return 'text-blue-600 bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400';
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-500/20 dark:text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Verified': return <CheckCircle className="w-4 h-4" />;
      case 'Rejected': return <XCircle className="w-4 h-4" />;
      case 'Needs Correction': return <AlertTriangle className="w-4 h-4" />;
      case 'Under Review': return <Clock className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Official Letters</h2>
          <p className="text-sm text-muted-foreground mt-1">Upload and verify admission documents from the university</p>
        </div>
      </div>

      <div className="p-6 bg-muted/30 border-b border-border">
        <div className="flex flex-col sm:flex-row items-end gap-4 max-w-2xl">
          <div className="w-full sm:flex-1">
            <label className="block text-sm font-medium text-foreground mb-1.5">Document Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
            >
              {LETTER_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-auto shrink-0">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Upload Document
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-0">
        {letters.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No official letters have been uploaded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {letters.map((letter) => (
              <div key={letter.id} className={cn("p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors", letter.isLatest ? "bg-background" : "bg-muted/50")}>
                
                <div className="flex items-start gap-4">
                  <div className={cn("p-3 rounded-lg shrink-0", getStatusColor(letter.verificationStatus))}>
                    {getStatusIcon(letter.verificationStatus)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-foreground">{letter.letterType}</h4>
                      {!letter.isLatest && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">Archived Version {letter.version}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{letter.fileName} • {(letter.fileSizeBytes / 1024).toFixed(1)} KB</p>
                    <p className="text-xs text-muted-foreground mt-1">Uploaded {new Date(letter.uploadedAt).toLocaleString()}</p>
                    
                    {letter.verificationStatus === 'Rejected' && letter.rejectionReason && (
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-2 rounded-md inline-block">
                        <strong>Reason for rejection:</strong> {letter.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-3 shrink-0">
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium self-start sm:self-end", getStatusColor(letter.verificationStatus))}>
                    {letter.verificationStatus}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-colors" title="View Document">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-colors" title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                    
                    {canVerify && letter.verificationStatus === 'Under Review' && letter.isLatest && (
                      <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
                        <button 
                          onClick={() => updateVerification(letter.id, 'Verified')}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Verify
                        </button>
                        <button 
                          onClick={() => setRejectingId(letter.id)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium rounded-md transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reject Reason Input (Inline) */}
                {rejectingId === letter.id && (
                  <div className="w-full sm:col-span-full mt-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg animate-in slide-in-from-top-2">
                    <label className="block text-xs font-semibold text-red-800 dark:text-red-300 mb-1.5">Reason for Rejection *</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g. Document is blurry, incorrect student name..."
                        className="flex-1 px-3 py-1.5 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        autoFocus
                      />
                      <button 
                        onClick={() => {
                          if (!rejectReason.trim()) return;
                          updateVerification(letter.id, 'Rejected', rejectReason.trim());
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                        disabled={!rejectReason.trim()}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        className="px-3 py-1.5 bg-background border border-input text-foreground rounded-md text-sm font-medium hover:bg-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
