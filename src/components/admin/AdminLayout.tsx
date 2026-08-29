
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
  { id: 'smartviews', label: 'Smart View Config', icon: Settings, path: 'smartviews' },
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
    <div className="flex flex-col h-[calc(100dvh-11rem)] md:h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-[90rem] mx-auto w-full px-2 md:px-0">
      <div className="mb-4 md:mb-6 shrink-0">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
          Super Admin Console
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">Centralized control center for system settings, security, and master data.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col h-fit md:max-h-full">
          <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto p-2 gap-1 md:space-y-1 hide-scrollbar md:custom-scrollbar">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              const path = tab.path ? `/admin/${tab.path}` : '/admin';
              const isActive = location.pathname === path || (tab.path === '' && location.pathname === '/admin');

              return (
                <NavLink
                  key={tab.id}
                  to={path}
                  className={cn(
                    "flex shrink-0 md:w-full items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-colors text-left whitespace-nowrap",
                    isActive
                      ? "bg-primary text-white md:bg-primary/10 md:text-primary shadow-sm md:shadow-none"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-border md:border-transparent"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4", isActive ? "text-white md:text-primary" : "text-muted-foreground")} />
                  {tab.label}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden flex flex-col min-h-0 relative">
          <div className="overflow-y-auto p-4 md:p-6 custom-scrollbar h-full">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
