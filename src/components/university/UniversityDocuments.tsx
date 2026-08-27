import { useState } from 'react';
import { FileText, Search, Filter, CheckCircle2, XCircle, AlertCircle, Eye, Download } from 'lucide-react';
import { useAdmissions } from '../../hooks/useAdmissions';
import { Skeleton } from '../ui/Skeleton';
import { format } from 'date-fns';

export function UniversityDocuments() {
  const [searchTerm, setSearchTerm] = useState('');
  const { admissions, isLoading } = useAdmissions();
  
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Document Verification</h1>
          <p className="text-muted-foreground mt-1">Review and verify student documents for admission.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-border flex gap-4 bg-muted/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by student name or document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          <button className="px-4 py-2 bg-background border border-border text-foreground rounded-lg hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium">
            <Filter className="w-4 h-4" />
            Filter Status
          </button>
        </div>
        
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
             <CheckCircle2 className="w-8 h-8 text-emerald-500" />
           </div>
           <h3 className="text-lg font-medium text-foreground mb-1">All Caught Up</h3>
           <p className="text-muted-foreground max-w-sm mb-6">
             There are no pending documents to verify at the moment.
           </p>
        </div>
      </div>
    </div>
  );
}
