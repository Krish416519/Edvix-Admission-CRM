import { useState } from 'react';
import { Shield, Check, X, Search, FileText, AlertTriangle, Eye, Download, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface DocumentVerificationPanelProps {
  admissionId: string;
}

export function DocumentVerificationPanel({ admissionId }: DocumentVerificationPanelProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>('doc-1');
  
  const documents = [
    { id: 'doc-1', name: 'BTech_Degree_Rahul.pdf', type: 'Degree Certificate', status: 'Under Review', uploaded_at: '2 hours ago', size: '2.4 MB' },
    { id: 'doc-2', name: 'Passport_Scan.jpg', type: 'Identity Proof', status: 'Rejected', uploaded_at: '1 day ago', size: '1.1 MB' }
  ];

  const handleVerify = (status: 'Approved' | 'Rejected') => {
    toast.success(`Document marked as ${status}`);
  };

  return (
    <div className="flex h-[600px] border border-border rounded-xl bg-card overflow-hidden shadow-sm">
      {/* Sidebar: Document List */}
      <div className="w-80 border-r border-border bg-muted/10 flex flex-col">
        <div className="p-4 border-b border-border bg-card">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-500" /> Verification Queue
          </h3>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {documents.map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelectedDocId(doc.id)}
              className={cn(
                "w-full text-left p-3 rounded-lg mb-2 transition-all border",
                selectedDocId === doc.id 
                  ? "bg-primary/5 border-primary/20 shadow-sm" 
                  : "bg-card border-transparent hover:border-border hover:bg-muted/50"
              )}
            >
              <div className="font-medium text-foreground text-sm truncate">{doc.name}</div>
              <div className="text-xs text-muted-foreground mt-1 flex justify-between items-center">
                <span>{doc.type}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] uppercase font-bold",
                  doc.status === 'Under Review' ? "text-amber-600 bg-amber-100 dark:bg-amber-500/20" : "text-red-600 bg-red-100 dark:bg-red-500/20"
                )}>
                  {doc.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Area: Document Preview & AI Assistant */}
      <div className="flex-1 flex flex-col bg-background relative">
        {selectedDocId ? (
          <>
            {/* Toolbar */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-muted-foreground" />
                BTech_Degree_Rahul.pdf
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-muted rounded-md text-muted-foreground transition-colors" title="Preview">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-muted rounded-md text-muted-foreground transition-colors" title="Download">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Preview Placeholder */}
            <div className="flex-1 p-8 flex items-center justify-center bg-muted/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-black/5 dark:bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
              <div className="bg-card border border-border w-full max-w-2xl h-full shadow-sm flex items-center justify-center rounded-sm z-10 relative">
                <div className="text-center text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Secure Document Previewer</p>
                  <p className="text-sm mt-1 opacity-70">Supports PDF, JPG, PNG</p>
                </div>
              </div>
            </div>

            {/* AI Assistant & Action Bar */}
            <div className="border-t border-border bg-card p-4 shrink-0 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
              
              {/* AI Insights */}
              <div className="flex-1 max-w-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">AI Document Assistant</span>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg p-3 text-sm text-indigo-900 dark:text-indigo-200">
                  <p className="font-medium flex items-center gap-1.5 mb-1">
                    <Check className="w-4 h-4 text-emerald-500" /> Extracted Name: <strong>Rahul Kumar</strong> (Matches Lead)
                  </p>
                  <p className="font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Warning: The graduation date (2025) is within 6 months. Verify final transcript requirements.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0">
                <button 
                  onClick={() => handleVerify('Rejected')}
                  className="flex-1 lg:flex-none px-6 py-2.5 border-2 border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
                <button 
                  onClick={() => handleVerify('Approved')}
                  className="flex-1 lg:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
              </div>

            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a document to verify
          </div>
        )}
      </div>
    </div>
  );
}
