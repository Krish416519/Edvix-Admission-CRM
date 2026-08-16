import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, FileText, Settings, CheckCircle, X, LogOut, IndianRupee, Bell, PieChart, Workflow, MessageSquare, Mail, Network, ShieldAlert, Megaphone, Server, Phone, Sparkles, ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Admission OS', href: '/admission-os', icon: Sparkles },
  { name: 'Command Center', href: '/admission-os/command-center', icon: ShieldAlert, roles: ['Super Admin', 'Admin'] },
  { name: 'AI Assistant', href: '/ai-dashboard', icon: Sparkles },
  { name: 'Leads', href: '/leads', icon: Users, resource: 'Lead Management' },
  { name: 'Applications', href: '/applications', icon: FileText, resource: 'Lead Management' },
  { name: 'Admissions', href: '/admissions', icon: GraduationCap, resource: 'Lead Management' },
  { name: 'Tasks', href: '/tasks', icon: CheckCircle },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageSquare, resource: 'Communication' },
  { name: 'Email', href: '/email', icon: Mail, resource: 'Communication' },
  { name: 'Call Center', href: '/call-center', icon: Phone, resource: 'Communication' },
  { name: 'Integrations', href: '/integration', icon: Network, permission: { action: 'Manage Integrations', resource: 'System Settings' } },
  { name: 'Automation', href: '/automation', icon: Workflow, permission: { action: 'Manage Settings', resource: 'System Settings' } },
  { name: 'Analytics', href: '/analytics', icon: PieChart, permission: { action: 'View Reports', resource: 'Reports' } },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Admin Console', href: '/admin', icon: ShieldAlert, permission: { action: 'Manage Settings', resource: 'System Settings' } },
  { name: 'Founder AI Briefing', href: '/admin/founder', icon: Sparkles, roles: ['Super Admin'] },
  { name: 'Backend Status', href: '/admin/backend', icon: Server, permission: { action: 'Manage Settings', resource: 'System Settings' } },
  { name: 'Finance', href: '/finance', icon: IndianRupee, permission: { action: 'Read', resource: 'Finance' } },
  { name: 'Marketing Hub', href: '/marketing', icon: Megaphone, roles: ['Super Admin', 'Admin', 'Marketing'] },
  { name: 'Partner Portal', href: '/partner', icon: Network, roles: ['Super Admin', 'Admin', 'Partner'] },
  { name: 'University Portal', href: '/university', icon: GraduationCap, roles: ['Super Admin', 'Admin', 'University'] },
];

export function Sidebar({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const location = useLocation();
  const { user, logout, hasRole, hasPermission, hasResourceAccess } = useAuth();
  const { unreadCount } = useNotifications();

  const toggleCollapse = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem('sidebarCollapsed', String(newVal));
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300 ease-in-out md:translate-x-0 md:static flex flex-col group",
        open ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn("flex h-16 shrink-0 items-center px-5 border-b border-border transition-all", isCollapsed ? "justify-center" : "justify-between")}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-primary flex items-center justify-center text-white font-bold shadow-sm">
              E
            </div>
            {!isCollapsed && <span className="text-lg font-semibold tracking-tight whitespace-nowrap animate-in fade-in">Edvix.in</span>}
          </div>
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Collapse Toggle Button (Desktop only) */}
        <button 
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3 top-20 bg-card border border-border rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted shadow-sm z-50 transition-transform"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", isCollapsed && "rotate-180")} />
        </button>
        
        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <nav className="flex-1 space-y-1">
            {navigation.map((item) => {
              // Backward compatibility for roles, preferred is permissions
              if (item.roles && !hasRole(item.roles as any)) return null;
              // Check resource-level access (for generic modules like Leads)
              if (item.resource && !hasResourceAccess(item.resource)) return null;

              // Check specific action permissions
              if (item.permission && !hasPermission(item.permission.action, item.permission.resource)) return null;
              
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative overflow-hidden",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    isCollapsed ? "justify-center" : ""
                  )}
                  onClick={() => setOpen(false)}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                  {!isCollapsed && <span className="truncate animate-in fade-in">{item.name}</span>}
                  
                  {item.name === 'Notifications' && unreadCount > 0 && (
                    <span className={cn(
                      "bg-primary text-white text-[10px] font-bold rounded-full min-w-[20px] text-center shadow-sm",
                      isCollapsed ? "absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[8px] min-w-0" : "ml-auto px-1.5 py-0.5"
                    )}>
                      {isCollapsed ? '' : (unreadCount > 9 ? '9+' : unreadCount)}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t border-border">
          <div className={cn("flex items-center rounded-lg hover:bg-muted transition-colors group relative", isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2")}>
            <div className="w-9 h-9 shrink-0 rounded-full bg-muted overflow-hidden flex items-center justify-center border border-border">
              {user?.avatar ? (
                <img src={user.avatar} alt="User avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            {!isCollapsed && (
              <>
                <div className="flex flex-col flex-1 overflow-hidden animate-in fade-in">
                  <span className="text-sm font-medium truncate text-foreground">{user?.name || 'User'}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground truncate tracking-wider">{user?.role || 'Staff'}</span>
                </div>
                <button 
                  onClick={logout}
                  className="text-muted-foreground hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
            {isCollapsed && (
              <button 
                onClick={logout}
                className="absolute -top-10 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-red-500 bg-card border border-border shadow-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none group-hover:pointer-events-auto"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
