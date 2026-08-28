import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight, GraduationCap, Calendar, Building, User, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAdmissions } from '../../hooks/useAdmissions';
import { Admission, AdmissionStage } from '../../types/admission';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { AdmissionsDashboardWidgets } from './AdmissionsDashboardWidgets';
import { toast } from 'sonner';

const stages: AdmissionStage[] = [
  'Inquiry',
  'Interested',
  'Counseling',
  'Documents Pending',
  'Documents Verified',
  'Application Submitted',
  'University Verification',
  'Fee Pending',
  'Payment Received',
  'Admission Confirmed',
  'Enrollment Completed',
  'LMS Issued',
  'Completed',
  'Cancelled',
  'Completed',
  'Cancelled',
];

const MobileAdmissionCard = ({ adm, onClick, onDelete }: { adm: Admission; onClick: (id: string) => void; onDelete: (adm: Admission) => void }) => {
  return (
    <div 
      onClick={() => onClick(adm.id)}
      className="bg-card border border-border p-4 rounded-xl flex flex-col gap-3 hover:bg-muted/30 transition-colors cursor-pointer group shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shadow-sm shrink-0">
            {adm.studentName.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-foreground text-base group-hover:text-primary transition-colors">{adm.studentName}</div>
            <div className="text-xs text-muted-foreground">{adm.admissionNumber || adm.id.slice(0, 8)}</div>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(adm); }}
          className="p-2 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 p-2.5 rounded-lg border border-border/50">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-semibold">Program & Univ</div>
          <div className="font-medium text-xs truncate" title={adm.course}>{adm.course}</div>
          <div className="text-xs truncate text-muted-foreground" title={adm.university}>{adm.university}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-semibold">Intake</div>
          <div className="font-medium text-xs truncate">{adm.intake || 'N/A'} {adm.academicSession}</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-1">
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider truncate max-w-[150px]">
          {adm.currentStage || adm.stage}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <User className="w-3.5 h-3.5" />
          <span className="truncate max-w-[100px]">{adm.counselorName || 'Unassigned'}</span>
        </div>
      </div>
    </div>
  );
};

export function AdmissionsList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<AdmissionStage | 'All'>('All');
  const [universityFilter, setUniversityFilter] = useState('All');
  const [intakeFilter, setIntakeFilter] = useState('All');
  const [counselorFilter, setCounselorFilter] = useState('All');
  const [deleteTarget, setDeleteTarget] = useState<Admission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { admissions, isLoading, deleteAdmission } = useAdmissions({
    stage: stageFilter === 'All' ? undefined : stageFilter,
    searchTerm: searchTerm || undefined,
  });

  const [localAdmissions, setLocalAdmissions] = useState<typeof admissions>([]);

  // Keep local state in sync with hook data (e.g. after filters change)
  useEffect(() => {
    setLocalAdmissions(admissions);
  }, [admissions]);

  const universities = Array.from(new Set(admissions.map(a => a.university).filter(Boolean)));
  const intakes = Array.from(new Set(admissions.map(a => a.intake).filter(Boolean)));
  const counselors = Array.from(new Set(admissions.map(a => a.counselorName).filter(Boolean)));

  // Client-side filter for university/intake/counselor (these are display filters on already-fetched data)
  const filteredAdmissions = localAdmissions.filter(adm => {
    const matchesUniv = universityFilter === 'All' || adm.university === universityFilter;
    const matchesIntake = intakeFilter === 'All' || adm.intake === intakeFilter;
    const matchesCounselor = counselorFilter === 'All' || adm.counselorName === counselorFilter;
    return matchesUniv && matchesIntake && matchesCounselor;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    // Optimistically remove from local state immediately
    setLocalAdmissions(prev => prev.filter(a => a.id !== deleteTarget.id));
    try {
      const result = await deleteAdmission(deleteTarget.id);
      if (result && result.success === false) throw new Error(result.error || 'Delete failed');
      toast.success(`Admission for ${deleteTarget.studentName} deleted successfully`);
      setDeleteTarget(null);
    } catch (err: any) {
      // Rollback on failure
      setLocalAdmissions(admissions);
      toast.error(err.message || 'Failed to delete admission');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track student admissions progress.</p>
        </div>
      </div>
      
      <AdmissionsDashboardWidgets admissions={admissions} />

      <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col gap-4 bg-muted/20">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by student name, ID, or course..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1.5 flex-1 min-w-[150px]">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
              <select 
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value as any)}
                className="w-full bg-background text-foreground text-sm focus:outline-none truncate"
              >
                <option value="All">All Stages</option>
                {stages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            </div>
            
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1.5 flex-1 min-w-[150px]">
              <Building className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
              <select 
                value={universityFilter}
                onChange={e => setUniversityFilter(e.target.value)}
                className="w-full bg-background text-foreground text-sm focus:outline-none truncate"
              >
                <option value="All">All Universities</option>
                {universities.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1.5 flex-1 min-w-[150px]">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
              <select 
                value={intakeFilter}
                onChange={e => setIntakeFilter(e.target.value)}
                className="w-full bg-background text-foreground text-sm focus:outline-none truncate"
              >
                <option value="All">All Intakes</option>
                {intakes.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1.5 flex-1 min-w-[150px]">
              <User className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
              <select 
                value={counselorFilter}
                onChange={e => setCounselorFilter(e.target.value)}
                className="w-full bg-background text-foreground text-sm focus:outline-none truncate"
              >
                <option value="All">All Counselors</option>
                {counselors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-3 p-4 bg-muted/5 border-t border-border">
          {isLoading && (
            <div className="flex flex-col gap-3">
               <Skeleton className="h-[180px] w-full rounded-xl" />
               <Skeleton className="h-[180px] w-full rounded-xl" />
            </div>
          )}
          {!isLoading && filteredAdmissions.map((adm) => (
             <MobileAdmissionCard key={adm.id} adm={adm} onClick={(id) => navigate(`/applications/${id}`)} onDelete={setDeleteTarget} />
          ))}
          {!isLoading && filteredAdmissions.length === 0 && (
            <EmptyState
              icon={GraduationCap}
              title="No admissions found"
              description="We couldn't find any admissions matching your current filters."
              action={
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setStageFilter('All');
                    setUniversityFilter('All');
                    setIntakeFilter('All');
                    setCounselorFilter('All');
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
                >
                  Clear Filters
                </button>
              }
            />
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block flex-1 overflow-auto relative">
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8">
               <Skeleton className="h-12 w-full rounded-lg mb-4" />
               <Skeleton className="h-16 w-full rounded-xl mb-2" />
               <Skeleton className="h-16 w-full rounded-xl mb-2" />
               <Skeleton className="h-16 w-full rounded-xl mb-2" />
            </div>
          )}
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 border-b border-border">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold">Student & ID</th>
                <th scope="col" className="px-6 py-3 font-semibold">Program & Intake</th>
                <th scope="col" className="px-6 py-3 font-semibold">Stage</th>
                <th scope="col" className="px-6 py-3 font-semibold">Counselor</th>
                <th scope="col" className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAdmissions.map((adm) => (
                <tr 
                  key={adm.id} 
                  onClick={() => navigate(`/applications/${adm.id}`)}
                  className="hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shadow-sm">
                        {adm.studentName.charAt(0)}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{adm.studentName}</span>
                        <span className="text-xs text-muted-foreground">{adm.admissionNumber || adm.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{adm.course} • {adm.university}</span>
                      <span className="text-xs text-muted-foreground">{adm.intake || 'N/A'} {adm.academicSession}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                      {adm.currentStage || adm.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">{adm.counselorName || 'Unassigned'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(adm); }}
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete admission"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredAdmissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-0">
                    <EmptyState
                      icon={GraduationCap}
                      title="No admissions found"
                      description="We couldn't find any admissions matching your current filters."
                      action={
                        <button 
                          onClick={() => {
                            setSearchTerm('');
                            setStageFilter('All');
                            setUniversityFilter('All');
                            setIntakeFilter('All');
                            setCounselorFilter('All');
                          }}
                          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
                        >
                          Clear Filters
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border p-6 animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Delete Admission?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete the admission for{' '}
              <strong className="text-foreground">{deleteTarget.studentName}</strong>?
              This action can be undone by an administrator.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Deleting...' : 'Yes, delete it'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="w-full px-4 py-2.5 bg-transparent border border-border text-foreground font-medium rounded-xl hover:bg-muted transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
