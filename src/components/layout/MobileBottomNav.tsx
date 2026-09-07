import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CheckCircle, Sparkles, Menu, X, PieChart } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { MobileMoreMenu } from './MobileMoreMenu';

export function MobileBottomNav() {
  const location = useLocation();
  const { hasPermission, hasResourceAccess, isSuperAdmin, isDomainAdmin, user } = useAuth();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const canViewReports = isSuperAdmin?.() || isDomainAdmin?.() || user?.role === 'Super Admin' || user?.role === 'Admin' || hasPermission('View Reports', 'Reports');
  const showLeads = hasResourceAccess('Lead Management');

  // The 4 core layers explicitly requested: Dashboard, All Leads, Smart View, Analytics + Menu
  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ...(showLeads ? [
      { name: 'All Leads', href: '/all-leads', icon: Users },
      { name: 'Smart View', href: '/smart-view', icon: Sparkles },
    ] : [
      { name: 'Tasks', href: '/tasks', icon: CheckCircle },
    ]),
    canViewReports 
      ? { name: 'Analytics', href: '/analytics', icon: PieChart }
      : { name: 'Tasks', href: '/tasks', icon: CheckCircle },
  ];

  // Hide on detail pages so page-specific action bars (like LeadDetails) can take over
  const isDetailPage = location.pathname.match(/^\/(leads|all-leads|smart-view|tasks|admissions)\/[a-zA-Z0-9_-]+$/);
  if (isDetailPage) return null;

  return (
    <>
      <nav 
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/60 z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] select-none"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-90 touch-manipulation relative",
                  isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute top-1 w-8 h-1 bg-primary rounded-full shadow-[0_1px_8px_rgba(var(--primary),0.5)] animate-in fade-in duration-200" />
                )}
                <item.icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110 fill-primary/20" : "")} />
                <span className="text-[10px] tracking-tight">{item.name}</span>
              </Link>
            );
          })}
          
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-90 touch-manipulation text-muted-foreground hover:text-foreground relative",
              isMoreMenuOpen && "text-primary font-bold"
            )}
            aria-label="Open full menu"
          >
            {isMoreMenuOpen && (
              <span className="absolute top-1 w-8 h-1 bg-primary rounded-full shadow-[0_1px_8px_rgba(var(--primary),0.5)] animate-in fade-in duration-200" />
            )}
            <Menu className={cn("w-5 h-5 transition-transform", isMoreMenuOpen ? "scale-110" : "")} />
            <span className="text-[10px] tracking-tight">Menu</span>
          </button>
        </div>
      </nav>

      <MobileMoreMenu isOpen={isMoreMenuOpen} onClose={() => setIsMoreMenuOpen(false)} />
    </>
  );
}
