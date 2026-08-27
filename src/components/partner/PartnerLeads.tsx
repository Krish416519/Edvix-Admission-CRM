import { useState, useMemo } from 'react';
import { Search, Plus, FileSpreadsheet, ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { useLeads } from '../../hooks/useLeads';
import { Lead } from '../../types/schema';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from '../ui/EmptyState';
import { LeadFormModal } from '../leads/LeadFormModal';
import { Skeleton } from '../ui/Skeleton';
import { format } from 'date-fns';
import { partnerService } from '../../lib/partner/PartnerService';
import { toast } from 'sonner';

export function PartnerLeads() {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { leads, isLoading, addLead } = useLeads();
  
  // Real data filtered by RLS (and explicitly by user id for Super Admins testing the view)
  const myLeads = leads.filter(l => l.partner_id === user?.id);

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
          <div className="flex gap-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Skeleton className="h-[calc(100vh-200px)] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">My Leads</h1>
          <p className="text-muted-foreground mt-1">Manage and track the leads you have submitted.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="px-4 py-2 bg-card border border-border text-foreground font-medium rounded-lg shadow-sm hover:bg-muted transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-none">
            <FileSpreadsheet className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredLeads.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 font-medium cursor-pointer hover:text-foreground transition-colors group">
                    <div className="flex items-center gap-1">
                      Lead Name <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </div>
                  </th>
                  <th className="px-6 py-3 font-medium">Contact Details</th>
                  <th className="px-6 py-3 font-medium">Course Interest</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Submitted Date</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
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
                      <div className="text-xs text-muted-foreground">{typeof lead.university === 'object' ? lead.university?.name : lead.university || 'Unspecified'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {lead.createdAt ? format(new Date(lead.createdAt), 'MMM d, yyyy') : 'Recently'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100 rounded-md hover:bg-primary/10">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState 
                icon={Search}
                title="No leads found"
                description={searchTerm ? "Try adjusting your search query." : "You haven't submitted any leads yet."}
                action={
                  !searchTerm && (
                    <button 
                      onClick={() => setIsFormOpen(true)}
                      className="mt-4 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      Submit Lead
                    </button>
                  )
                }
              />
            </div>
          )}
        </div>
      </div>

      {isFormOpen && (
        <LeadFormModal 
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={async (data) => {
            try {
              await partnerService.submitLead(data);
              setIsFormOpen(false);
              toast.success('Lead submitted successfully.');
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : 'Failed to submit lead.';
              toast.error(message);
            }
          }}
        />
      )}
    </div>
  );
}
