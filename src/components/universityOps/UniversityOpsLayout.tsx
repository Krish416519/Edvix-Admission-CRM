import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { 
  Building2, 
  Send, 
  Inbox, 
  Users, 
  Clock, 
  BarChart, 
  Settings,
  ChevronRight,
  Menu,
  X,
  ArrowLeft
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export function UniversityOpsLayout() {
  const { user, hasRole } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', to: '/university-ops', icon: Building2, exact: true },
    { name: 'Submission Queue', to: '/university-ops/queue', icon: Send },
    { name: 'Response Inbox', to: '/university-ops/responses', icon: Inbox },
    { name: 'SLA Tracker', to: '/university-ops/sla', icon: Clock },
    { name: 'Contacts', to: '/university-ops/contacts', icon: Users },
    { name: 'Analytics', to: '/university-ops/analytics', icon: BarChart },
    { name: 'Integrations', to: '/university-ops/integrations', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 bg-primary text-primary-foreground rounded-full shadow-lg"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 mt-16 lg:mt-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 h-full flex flex-col">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-6 shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
            University Ops
          </h2>
          <nav className="space-y-1 flex-1 overflow-y-auto overflow-x-hidden pr-2">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                end={item.exact}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors group",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("w-5 h-5", "group-hover:text-current")} />
                  {item.name}
                </div>
                <ChevronRight className={cn(
                  "w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0",
                  "text-current"
                )} />
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto pt-8 flex flex-col gap-2">
            {hasRole(['Super Admin', 'Admin']) && (
              <Link
                to="/"
                className="flex items-center gap-x-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-200 group"
              >
                <ArrowLeft className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-1" />
                <span>Back to CRM</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
