import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, Search, CheckCircle2, FileText, ChevronRight } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
  'Admission Confirmed': 'bg-blue-500/10 text-blue-600',
  'Payment Pending': 'bg-amber-500/10 text-amber-600',
  'Payment Completed': 'bg-teal-500/10 text-teal-600',
  'Enrollment Initiated': 'bg-indigo-500/10 text-indigo-600',
  'Enrollment Submitted': 'bg-violet-500/10 text-violet-600',
  'Enrollment Confirmed': 'bg-purple-500/10 text-purple-600',
  'Student ID Pending': 'bg-orange-500/10 text-orange-600',
  'Student ID Received': 'bg-cyan-500/10 text-cyan-600',
  'LMS Access Pending': 'bg-yellow-500/10 text-yellow-600',
  'LMS Access Activated': 'bg-lime-500/10 text-lime-600',
  'Orientation Pending': 'bg-pink-500/10 text-pink-600',
  'Active Student': 'bg-emerald-500/10 text-emerald-600',
  'Completed': 'bg-green-500/10 text-green-600',
  'Withdrawn': 'bg-red-500/10 text-red-600',
};

export function PartnerStudents() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchStudents() {
      if (!user) return;
      const { data } = await supabase
        .from('student_enrollments')
        .select(`
          *,
          admission:admissions(
            id, student_name, email,
            course:courses(name),
            university:universities(name)
          )
        `)
        .order('created_at', { ascending: false });
      
      setEnrollments(data || []);
      setIsLoading(false);
    }
    fetchStudents();
  }, [user]);

  const filtered = enrollments.filter(e => 
    e.admission?.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.student_id_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Enrolled Students</h1>
          <p className="text-muted-foreground mt-1">Track post-admission lifecycle and LMS access for your students.</p>
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
        </div>

        <div className="flex-1 overflow-auto relative p-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((e) => (
              <div key={e.id} className="p-5 bg-background border border-border rounded-xl flex items-center justify-between hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0">
                    {e.admission?.student_name?.charAt(0) ?? 'S'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{e.admission?.student_name}</h3>
                    <p className="text-sm text-muted-foreground">{e.admission?.university?.name} · {e.admission?.course?.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      {e.student_id_number ? (
                        <span className="text-muted-foreground">ID: <span className="font-mono text-foreground">{e.student_id_number}</span></span>
                      ) : (
                        <span className="text-muted-foreground italic">Student ID Pending</span>
                      )}
                      <span className="text-muted-foreground">•</span>
                      {e.lms_status === 'Activated' ? (
                        <span className="text-lime-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> LMS Active</span>
                      ) : (
                        <span className="text-muted-foreground">LMS: {e.lms_status || 'Pending'}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", STATUS_COLORS[e.enrollment_status] || 'bg-muted text-muted-foreground')}>
                    {e.enrollment_status}
                  </span>
                  <Link to="/partner/support" className="text-xs text-primary hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Need Help?
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState 
                icon={GraduationCap}
                title="No enrolled students found"
                description={searchTerm ? "Try adjusting your search query." : "None of your students have reached the enrolled stage yet."}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
