import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CheckCircle, Sparkles, Menu, X, PieChart } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { MobileMoreMenu } from './MobileMoreMenu';

export function MobileBottomNav() {
  const location = useLocation();
  const { hasPermission, hasResourceAccess } = useAuth();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // We can customize the 4th slot based on permissions
  const showAnalytics = hasPermission('View Reports', 'Reports');
  const showLeads = hasResourceAccess('Lead Management');

  const navItems = [
    { name: 'Home', href: '/', icon: LayoutDashboard },
    ...(showLeads ? [
      { name: 'All Leads', href: '/all-leads', icon: Users },
      { name: 'Tasks', href: '/tasks', icon: CheckCircle },
    ] : []),
    showAnalytics 
      ? { name: 'Reports', href: '/analytics', icon: PieChart }
      : { name: 'AI', href: '/ai-dashboard', icon: Sparkles },
  ];

  // Hide on detail pages so page-specific action bars (like LeadDetails) can take over
  const isDetailPage = location.pathname.match(/^\/(leads|tasks|admissions)\/[a-zA-Z0-9_-]+$/);
  if (isDetailPage) return null;

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors active:scale-95",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "fill-primary/20")} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
          
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors active:scale-95 text-muted-foreground hover:text-foreground",
              isMoreMenuOpen && "text-primary"
            )}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </div>

      <MobileMoreMenu isOpen={isMoreMenuOpen} onClose={() => setIsMoreMenuOpen(false)} />
    </>
  );
}
