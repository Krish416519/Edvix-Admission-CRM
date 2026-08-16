import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Shield, Settings, GraduationCap, 
  BookOpen, Cpu, ShieldAlert, Database, Bell, Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';

const ADMIN_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '' },
  { id: 'users', label: 'User Management', icon: Users, path: 'users' },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield, path: 'roles' },
  { id: 'settings', label: 'System Settings', icon: Settings, path: 'settings' },
  { id: 'dispositions', label: 'Lead Dispositions', icon: Settings, path: 'dispositions' },
  { id: 'universities', label: 'Universities', icon: GraduationCap, path: 'universities' },
  { id: 'courses', label: 'Courses', icon: BookOpen, path: 'courses' },
  { id: 'ai', label: 'AI Configuration', icon: Cpu, path: 'ai' },
  { id: 'security', label: 'Security Center', icon: ShieldAlert, path: 'security' },
  { id: 'backup', label: 'Backup & Restore', icon: Database, path: 'backup' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: 'notifications' },
  { id: 'logs', label: 'System Logs', icon: Activity, path: 'logs' },
  { id: 'automation', label: 'Automation Builder', icon: Cpu, path: 'automation' },
  { id: 'developer', label: 'Developer Settings', icon: Settings, path: 'developer' },
  { id: 'webhooks', label: 'Webhook Logs', icon: Activity, path: 'webhooks' },
];

export function AdminLayout() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-[90rem] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          Super Admin Console
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Centralized control center for system settings, security, and master data.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col h-fit max-h-full">
          <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              const path = tab.path ? `/admin/${tab.path}` : '/admin';
              const isActive = location.pathname === path || (tab.path === '' && location.pathname === '/admin');

              return (
                <NavLink
                  key={tab.id}
                  to={path}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                  {tab.label}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden flex flex-col min-h-0 relative">
          <div className="overflow-y-auto p-6 custom-scrollbar h-full">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
