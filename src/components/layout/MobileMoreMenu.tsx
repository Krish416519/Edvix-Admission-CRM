
import { Link, useLocation } from 'react-router-dom';
import { X, Sparkles, FileText, GraduationCap, MessageSquare, Mail, Phone, Network, Workflow, PieChart, ShieldAlert, Server, IndianRupee, Megaphone, LogOut, LayoutDashboard, Users, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface MobileMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMoreMenu({ isOpen, onClose }: MobileMoreMenuProps) {
  const location = useLocation();
  const { user, logout, hasRole, hasPermission, hasResourceAccess } = useAuth();

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Smart View', href: '/smart-view', icon: Sparkles },
    { name: 'All Leads', href: '/all-leads', icon: Users, resource: 'Lead Management' },
    { name: 'Tasks', href: '/tasks', icon: CheckCircle },
    { name: 'Command Center', href: '/smart-view/command-center', icon: ShieldAlert, roles: ['Super Admin', 'Admin'] },
    { name: 'AI Assistant', href: '/ai-dashboard', icon: Sparkles },
    { name: 'Applications', href: '/applications', icon: FileText, resource: 'Lead Management' },
    { name: 'Admissions', href: '/admissions', icon: GraduationCap, resource: 'Lead Management' },
    { name: 'WhatsApp', href: '/whatsapp', icon: MessageSquare, resource: 'Communication' },
    { name: 'Email', href: '/email', icon: Mail, resource: 'Communication' },
    { name: 'Call Center', href: '/call-center', icon: Phone, resource: 'Communication' },
    { name: 'Integrations', href: '/integration', icon: Network, permission: { action: 'Manage Integrations', resource: 'System Settings' } },
    { name: 'Automation', href: '/automation', icon: Workflow, permission: { action: 'Manage Settings', resource: 'System Settings' } },
    { name: 'Analytics', href: '/analytics', icon: PieChart, permission: { action: 'View Reports', resource: 'Reports' } },
    { name: 'Admin Console', href: '/admin', icon: ShieldAlert, permission: { action: 'Manage Settings', resource: 'System Settings' } },
    { name: 'Founder AI Briefing', href: '/admin/founder', icon: Sparkles, roles: ['Super Admin'] },
    { name: 'Backend Status', href: '/admin/backend', icon: Server, permission: { action: 'Manage Settings', resource: 'System Settings' } },
    { name: 'Finance', href: '/finance', icon: IndianRupee, permission: { action: 'Read', resource: 'Finance' } },
    { name: 'Marketing Hub', href: '/marketing', icon: Megaphone, roles: ['Super Admin', 'Admin', 'Marketing'] },
    { name: 'Partner Portal', href: '/partner', icon: Network, roles: ['Super Admin', 'Admin', 'Partner'] },
    { name: 'University Portal', href: '/university', icon: GraduationCap, roles: ['Super Admin', 'Admin', 'University'] },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200 md:hidden"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className={cn(
        "fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl border-t border-border shadow-2xl transition-transform duration-300 ease-out flex flex-col md:hidden",
        "h-[85vh]" // Fixed height taking up most of screen
      )}>
        {/* Drag handle & Header */}
        <div className="flex-shrink-0 pt-3 pb-4 px-6 border-b border-border sticky top-0 bg-card z-10 rounded-t-3xl">
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Menu</h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {/* User Profile Summary (optional on top) */}
          <div className="p-4 mx-4 mt-4 mb-2 bg-muted/30 border border-border rounded-2xl flex items-center gap-3">
             <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex flex-shrink-0 items-center justify-center font-bold text-lg border border-primary/20">
               {user?.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="User" /> : user?.name?.charAt(0) || 'U'}
             </div>
             <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-foreground truncate">{user?.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.role}</p>
             </div>
          </div>

          <nav className="px-4 py-2 space-y-1">
            {menuItems.map((item) => {
              if (item.roles && !hasRole(item.roles as any)) return null;
              // Check resource-level access
              if (item.resource && !hasResourceAccess(item.resource)) return null;

              if (item.permission && !hasPermission(item.permission.action, item.permission.resource)) return null;
              
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all active:scale-[0.98]",
                    isActive 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[15px]">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          <div className="px-4 py-6">
            <button 
              onClick={() => { logout(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-red-600 font-medium bg-red-50 dark:bg-red-500/10 active:scale-[0.98] transition-transform"
            >
              <LogOut className="w-5 h-5" />
              Log out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
