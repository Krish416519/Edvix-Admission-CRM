import React, { useState } from 'react';
import { useStudentSuccess } from '../../../hooks/useStudentSuccess';
import { X, Search, GraduationCap, Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Props {
  onClose: () => void;
}

export function CreateEnrollmentModal({ onClose }: Props) {
  const { createEnrollment } = useStudentSuccess();
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const searchAdmissions = async (term: string) => {
    if (term.length < 2) { setAdmissions([]); return; }
    setIsLoading(true);
    const { data } = await supabase
      .from('admissions')
      .select(`id, admission_number, student_name, university:universities(name), course:courses(name), current_stage`)
      .or(`student_name.ilike.%${term}%,admission_number.ilike.%${term}%`)
      .limit(10);
    setAdmissions(data || []);
    setIsLoading(false);
  };

  const handleCreate = async (admissionId: string) => {
    setCreating(true);
    try {
      await createEnrollment(admissionId);
      onClose();
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Create Enrollment</h2>
              <p className="text-xs text-muted-foreground">Search and select an admission to begin lifecycle tracking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder="Search by student name or admission number..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); searchAdmissions(e.target.value); }}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2">
            {isLoading && (
              <div className="text-center py-8 text-muted-foreground text-sm">Searching...</div>
            )}
            {!isLoading && searchTerm.length >= 2 && admissions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No admissions found.</div>
            )}
            {admissions.map(admission => (
              <button
                key={admission.id}
                disabled={creating}
                onClick={() => handleCreate(admission.id)}
                className="w-full flex items-center gap-3 p-3 bg-background border border-border rounded-lg hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all text-left group disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0">
                  {admission.student_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{admission.student_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {admission.university?.name} · {admission.course?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{admission.admission_number} · Stage: {admission.current_stage}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {creating ? 'Creating...' : 'Enroll →'}
                </span>
              </button>
            ))}
          </div>

          {searchTerm.length < 2 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <GraduationCap className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Type at least 2 characters to search admissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
