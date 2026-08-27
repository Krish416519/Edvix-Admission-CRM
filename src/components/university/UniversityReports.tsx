import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, Users, FileCheck, CheckCircle2 } from 'lucide-react';
import { useAdmissions } from '../../hooks/useAdmissions';

export function UniversityReports() {
  const { admissions } = useAdmissions();

  // Calculate stats based on admissions data
  const totalApplications = admissions.length;
  const enrolledStudents = admissions.filter(a => a.stage === 'Admission Completed').length;
  const pendingDocs = admissions.filter(a => a.stage === 'Document Verification').length;
  
  const approvalRate = totalApplications > 0 ? Math.round((enrolledStudents / totalApplications) * 100) : 0;

  // Chart data: Applications by status
  const statusData = useMemo(() => {
    const counts = admissions.reduce((acc, adm) => {
      acc[adm.stage] = (acc[adm.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [admissions]);

  // Chart data: Applications by Intake
  const intakeData = useMemo(() => {
    const counts = admissions.reduce((acc, adm) => {
      const intake = adm.intake || 'Unknown';
      acc[intake] = (acc[intake] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([intake, count]) => ({ intake, count }));
  }, [admissions]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">University Reports</h1>
          <p className="text-muted-foreground mt-1">Analytics and insights for your institution.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: totalApplications, icon: Users, color: 'text-blue-500' },
          { label: 'Enrolled', value: enrolledStudents, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Pending Docs', value: pendingDocs, icon: FileCheck, color: 'text-amber-500' },
          { label: 'Approval Rate', value: `${approvalRate}%`, icon: TrendingUp, color: 'text-indigo-500' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stat.value}</h3>
            </div>
            <div className={`p-3 bg-muted rounded-full ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6">Applications by Stage</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6">Applications by Intake</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intakeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="intake" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
