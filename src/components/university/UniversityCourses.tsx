
import { BookOpen, Search, Plus, Filter, MoreHorizontal } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';

// Hardcoded mock courses for University Portal demonstration
const mockUniversityCourses = [
  { id: 'PRG-001', name: 'Master of Business Administration (MBA)', category: 'Management', duration: '2 Years', fee: 550000, intake: 'Fall 2026', status: 'Active' },
  { id: 'PRG-002', name: 'Master of Computer Applications (MCA)', category: 'IT & Software', duration: '2 Years', fee: 400000, intake: 'Fall 2026', status: 'Active' },
  { id: 'PRG-003', name: 'Bachelor of Technology (B.Tech) - CSE', category: 'Engineering', duration: '4 Years', fee: 800000, intake: 'Fall 2026', status: 'Active' },
  { id: 'PRG-004', name: 'Bachelor of Business Administration (BBA)', category: 'Management', duration: '3 Years', fee: 350000, intake: 'Fall 2026', status: 'Closed' },
];

export function UniversityCourses() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Programs & Courses</h1>
          <p className="text-muted-foreground mt-1">Manage the academic programs currently listed on Edvix.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Request New Program
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-180px)]">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search programs..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          <button className="px-4 py-2 bg-background border border-border text-foreground font-medium rounded-lg shadow-sm hover:bg-muted transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {mockUniversityCourses.map(course => (
              <div key={course.id} className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                <div className="p-5 border-b border-border flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${course.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                      {course.status}
                    </span>
                    <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-1 leading-tight">{course.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{course.category}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Duration</p>
                      <p className="font-medium text-sm text-foreground">{course.duration}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Fee</p>
                      <p className="font-medium text-sm text-foreground">₹{course.fee.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Current Intake</p>
                      <p className="font-medium text-sm text-foreground">{course.intake}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/30 p-3 flex justify-end gap-2">
                   <button className="px-3 py-1.5 text-xs font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted transition-colors">
                     Edit Details
                   </button>
                   <button className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors">
                     View Enrolled Students
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
