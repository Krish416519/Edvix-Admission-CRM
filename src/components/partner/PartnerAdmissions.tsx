import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, CheckCircle2, AlertCircle, FileText, ArrowUpDown } from 'lucide-react';
import { useAdmissions } from '../../hooks/useAdmissions';
import { useLeads } from '../../hooks/useLeads';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { format } from 'date-fns';

export function PartnerAdmissions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { admissions, isLoading: admissionsLoading } = useAdmissions();
  const { leads, isLoading: leadsLoading } = useLeads();
  
  // Filter for Super Admins testing the view: only show admissions linked to their partner leads
  const myLeads = leads.filter(l => l.partner_id === user?.id);
  const myAdmissions = admissions.filter(a => a.lead_id && myLeads.find(l => l.id === a.lead_id));

  const isLoading = admissionsLoading || leadsLoading;

  const filteredAdmissions = useMemo(() => {
    return myAdmissions.filter(adm => 
      adm.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adm.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [myAdmissions, searchTerm]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Admissions Tracking</h1>
          <p className="text-muted-foreground mt-1">Track the admission progress of your submitted leads.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-180px)]">
        <div className="p-4 border-b border-border flex gap-4 bg-muted/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by student name or ID..."
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

        <div className="flex-1 overflow-auto relative">
          {isLoading ? (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8">
               <Skeleton className="h-12 w-full rounded-lg mb-4" />
               <Skeleton className="h-16 w-full rounded-xl mb-2" />
               <Skeleton className="h-16 w-full rounded-xl mb-2" />
               <Skeleton className="h-16 w-full rounded-xl mb-2" />
            </div>
          ) : filteredAdmissions.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">Application ID</th>
                  <th className="px-6 py-3 font-medium">Student Info</th>
                  <th className="px-6 py-3 font-medium">Program</th>
                  <th className="px-6 py-3 font-medium">Current Stage</th>
                  <th className="px-6 py-3 font-medium">Documents</th>
                  <th className="px-6 py-3 font-medium">Counselor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAdmissions.map((adm) => (
                  <tr 
                    key={adm.id} 
                    onClick={() => navigate(`/applications/${adm.id}`)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{adm.id}</div>
                      <div className="text-xs text-muted-foreground">{adm.createdAt ? format(new Date(adm.createdAt), 'MMM d, yyyy') : 'Recently'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{adm.studentName}</div>
                      <div className="text-xs text-muted-foreground">{adm.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground">{adm.course}</div>
                      <div className="text-xs text-muted-foreground">{adm.university}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 w-fit">
                          {adm.stage}
                        </span>
                        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: `${adm.progress || 50}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-foreground">{adm.documents?.filter(d => d.status === 'Verified').length || 0} / {adm.documents?.length || 0} Verified</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {adm.counselorName || 'Unassigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState 
                icon={Search}
                title="No admissions found"
                description={searchTerm ? "Try adjusting your search query." : "None of your leads have progressed to admission yet."}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
