import React, { useState, useMemo } from 'react';
import { Search, FileSpreadsheet, ArrowUpDown, Filter, Users } from 'lucide-react';
import { useLeads } from '../../hooks/useLeads';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { format } from 'date-fns';

export function UniversityLeads() {
  const [searchTerm, setSearchTerm] = useState('');
  const { leads, isLoading } = useLeads();
  
  // Simulate university leads filtering (until RLS enforces this)
  const myLeads = useMemo(() => leads.filter(l => l.university === 'Amity University' || (typeof l.university === 'string' && l.university.includes('Amity'))), [leads]);

  const filteredLeads = useMemo(() => {
    return myLeads.filter(lead => 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm)
    );
  }, [myLeads, searchTerm]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[calc(100vh-200px)] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Interested Leads</h1>
          <p className="text-muted-foreground mt-1">View students who have expressed interest in your programs.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-card border border-border text-foreground font-medium rounded-lg shadow-sm hover:bg-muted transition-colors flex items-center justify-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by student name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          <button className="px-4 py-2 bg-background border border-border text-foreground font-medium rounded-lg shadow-sm hover:bg-muted transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredLeads.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 font-medium cursor-pointer hover:text-foreground transition-colors group">
                    <div className="flex items-center gap-1">
                      Student Name <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </div>
                  </th>
                  <th className="px-6 py-3 font-medium">Contact Details</th>
                  <th className="px-6 py-3 font-medium">Program Interest</th>
                  <th className="px-6 py-3 font-medium">Edvix Counselor</th>
                  <th className="px-6 py-3 font-medium">Date Sourced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{lead.name}</div>
                      <div className="text-xs text-muted-foreground">{lead.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground">{lead.email}</div>
                      <div className="text-xs text-muted-foreground">{lead.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground">{typeof lead.course === 'object' ? lead.course?.name : lead.course || 'Unspecified'}</div>
                      <div className="text-xs text-muted-foreground font-medium text-blue-500">{typeof lead.university === 'object' ? lead.university?.name : lead.university}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                          {lead.assignedTo?.charAt(0) || 'U'}
                        </div>
                        <span className="text-foreground">{lead.assignedTo || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {lead.createdAt ? format(new Date(lead.createdAt), 'MMM d, yyyy') : 'Recently'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState 
                icon={Users}
                title="No leads found"
                description={searchTerm ? "Try adjusting your search query." : "No leads have shown interest in your programs recently."}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
