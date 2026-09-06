import { Users, TrendingUp, AlertTriangle, Target, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function ManagerWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manager Command Center</h1>
        <p className="text-muted-foreground">Track team performance, identify bottlenecks, and review SLA violations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Team Conversion</h3>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold">14.2%</div>
          <p className="text-xs text-emerald-600 mt-1">+2.1% from last week</p>
        </div>
        
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">SLA Violations</h3>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">8</div>
          <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Active Members</h3>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">12</div>
          <p className="text-xs text-muted-foreground mt-1">Currently online</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Bottlenecks</h3>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">3</div>
          <p className="text-xs text-muted-foreground mt-1">Stages delayed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
           <h3 className="font-semibold text-lg mb-4">Team Performance Matrix</h3>
           <div className="flex items-center justify-center h-48 bg-muted/50 rounded-lg text-muted-foreground text-sm">
             [Performance Chart Placeholder]
           </div>
        </div>
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
           <h3 className="font-semibold text-lg mb-4">Actionable Approvals</h3>
           <div className="flex items-center justify-center h-48 bg-muted/50 rounded-lg text-muted-foreground text-sm">
             [Approvals List Placeholder]
           </div>
        </div>
      </div>
    </div>
  );
}
