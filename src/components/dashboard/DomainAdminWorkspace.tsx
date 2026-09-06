import { ShieldAlert, Users, Settings, Database, Activity, Map, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export function DomainAdminWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Domain Administration: {user?.domain?.name || 'All Domains'}</h1>
        <p className="text-muted-foreground">Manage organizational settings, users, and global configurations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          onClick={() => navigate('/admin/users')}
          className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">User Management</h3>
              <p className="text-sm text-muted-foreground">Roles & Permissions</p>
            </div>
          </div>
          <div className="text-sm text-indigo-600 flex items-center justify-between">
            Manage Access <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Security Logs</h3>
              <p className="text-sm text-muted-foreground">Audit & Activity</p>
            </div>
          </div>
          <div className="text-sm text-rose-600 flex items-center justify-between">
            View Logs <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">System Settings</h3>
              <p className="text-sm text-muted-foreground">Global configuration</p>
            </div>
          </div>
          <div className="text-sm text-emerald-600 flex items-center justify-between">
            Configure <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
