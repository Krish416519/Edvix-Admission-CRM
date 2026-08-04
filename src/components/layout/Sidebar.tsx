import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, FileText, Settings, CheckCircle, X, LogOut, IndianRupee, Bell, PieChart, Workflow, MessageSquare, Mail, Network, ShieldAlert, Megaphone, Server } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Applications', href: '/applications', icon: FileText },
  { name: 'Admissions', href: '/admissions', icon: GraduationCap },
  { name: 'Tasks', href: '/tasks', icon: CheckCircle },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageSquare },
  { name: 'Email', href: '/email', icon: Mail },
  { name: 'Integrations', href: '/integration', icon: Network, permission: { action: 'Manage Integrations', resource: 'System Settings' } },
  { name: 'Automation', href: '/automation', icon: Workflow, permission: { action: 'Manage Settings', resource: 'System Settings' } },
  { name: 'Analytics', href: '/analytics', icon: PieChart, permission: { action: 'View Reports', resource: 'Reports' } },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Admin Console', href: '/admin', icon: ShieldAlert, permission: { action: 'Manage Settings', resource: 'System Settings' } },
  { name: 'Backend Status', href: '/admin/backend', icon: Server, permission: { action: 'Manage Settings', resource: 'System Settings' } },
  { name: 'Finance', href: '/finance', icon: IndianRupee, permission: { action: 'Read', resource: 'Finance' } },
  { name: 'Marketing Hub', href: '/marketing', icon: Megaphone, roles: ['Super Admin', 'Admin', 'Marketing'] },
  { name: 'Partner Portal', href: '/partner', icon: Network, roles: ['Super Admin', 'Admin', 'Partner'] },
  { name: 'University Portal', href: '/university', icon: GraduationCap, roles: ['Super Admin', 'Admin', 'University'] },
];

export function Sidebar({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const location = useLocation();
  const { user, logout, hasRole, hasPermission } = useAuth();
  const { unreadCount } = useNotifications();

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
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-200 ease-in-out md:translate-x-0 md:static flex flex-col",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold shadow-sm">
              E
            </div>
            <span className="text-lg font-semibold tracking-tight">Edvix.in</span>
          </div>
          <button className="ml-auto md:hidden text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <nav className="flex-1 space-y-1">
            {navigation.map((item) => {
              // Backward compatibility for roles, preferred is permissions
              if (item.roles && !hasRole(item.roles as any)) return null;
              if (item.permission && !hasPermission(item.permission.action, item.permission.resource)) return null;
              
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => setOpen(false)}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.name}
                  {item.name === 'Notifications' && unreadCount > 0 && (
                    <span className="ml-auto bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors group">
            <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex-shrink-0 border border-border">
              {user?.avatar ? (
                <img src={user.avatar} alt="User avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-medium text-sm">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-sm font-medium truncate text-foreground">{user?.name || 'User'}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.role || 'Staff'}</span>
            </div>
            <button 
              onClick={logout}
              className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-md hover:bg-primary/10 opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
