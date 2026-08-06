import React, { useState } from 'react';
import { FileText, Search, Upload, Filter, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useLeads } from '../../hooks/useLeads';
import { Skeleton } from '../ui/Skeleton';
import { format } from 'date-fns';

export function PartnerDocuments() {
  const [searchTerm, setSearchTerm] = useState('');
  const { leads, isLoading } = useLeads();
  
  // In a real app, this would fetch from a useDocuments hook that fetches from the documents table 
  // linked to the partner's leads/admissions. For now, we simulate the documents linked to myLeads.
  const myLeads = leads;

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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Document Center</h1>
          <p className="text-muted-foreground mt-1">Manage documents for your submitted leads.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
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
            Filter
          </button>
        </div>
        
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
             <FileText className="w-8 h-8 text-muted-foreground" />
           </div>
           <h3 className="text-lg font-medium text-foreground mb-1">No Documents Found</h3>
           <p className="text-muted-foreground max-w-sm mb-6">
             You haven't uploaded any documents for your leads yet. Click "Upload Document" to get started.
           </p>
           <button className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all">
             Upload First Document
           </button>
        </div>
      </div>
    </div>
  );
}
