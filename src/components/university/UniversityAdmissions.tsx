import { useState, useMemo } from 'react';
import { Search, Filter, FileText, ArrowUpDown, ShieldAlert, GraduationCap, CheckCircle2 } from 'lucide-react';
import { useAdmissions } from '../../hooks/useAdmissions';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { format } from 'date-fns';

export function UniversityAdmissions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { admissions, isLoading } = useAdmissions();
  
  const filteredAdmissions = useMemo(() => {
    return admissions.filter(adm => {
      const matchesSearch = adm.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            adm.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || adm.stage === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [admissions, searchTerm, statusFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Admission Tracking</h1>
          <p className="text-muted-foreground mt-1">Monitor applications, verify documents, and track enrollments.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-180px)]">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by student name or Application ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48 bg-background border border-border rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              <option value="All">All Stages</option>
              <option value="Application Submitted">Application Submitted</option>
              <option value="Document Verification">Document Verification</option>
              <option value="Fee Payment">Fee Payment</option>
              <option value="Admission Completed">Admission Completed</option>
            </select>
          </div>
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
                  <th className="px-6 py-3 font-medium">Program Applied</th>
                  <th className="px-6 py-3 font-medium">Edvix Status</th>
                  <th className="px-6 py-3 font-medium">Document Status</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAdmissions.map((adm) => (
                  <tr key={adm.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{adm.id}</div>
                      <div className="text-xs text-muted-foreground">{adm.createdAt ? format(new Date(adm.createdAt), 'MMM d, yyyy') : 'Recently'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{adm.studentName}</div>
                      <div className="text-xs text-muted-foreground">{adm.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{adm.course}</div>
                      <div className="text-xs text-muted-foreground">Intake: Fall 2026</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {adm.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {adm.documents?.some(d => d.status === 'Rejected') ? (
                        <div className="flex items-center gap-1.5 text-red-500">
                          <ShieldAlert className="w-4 h-4" />
                          <span className="text-xs font-medium">Needs Attention</span>
                        </div>
                      ) : adm.documents?.every(d => d.status === 'Verified') ? (
                        <div className="flex items-center gap-1.5 text-emerald-500">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-medium">All Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-500">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-medium">Pending Review</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                         View Details
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState 
                icon={GraduationCap}
                title="No applications found"
                description={searchTerm ? "No students matched your search criteria." : "No admissions are currently processing for your university."}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
