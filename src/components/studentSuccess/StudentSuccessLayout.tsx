import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  GraduationCap, LayoutDashboard, Users, LifeBuoy,
  AlertTriangle, CheckSquare, ChevronRight, Menu, X, ArrowLeft
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export function StudentSuccessLayout() {
  const { hasRole } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', to: '/student-success', icon: LayoutDashboard, exact: true },
    { name: 'Enrollments', to: '/student-success/enrollments', icon: GraduationCap },
    { name: 'Support Desk', to: '/student-success/support', icon: LifeBuoy },
    { name: 'At-Risk Students', to: '/student-success/at-risk', icon: AlertTriangle },
    { name: 'Milestones', to: '/student-success/milestones', icon: CheckSquare },
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

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 mt-16 lg:mt-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 h-full flex flex-col">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-6 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-emerald-500" />
            </div>
            Student Success
          </h2>

          <nav className="space-y-1 flex-1 overflow-y-auto overflow-x-hidden">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                end={item.exact}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group",
                  isActive
                    ? "bg-emerald-500 text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto pt-4 flex flex-col gap-2 border-t border-border">
            {hasRole(['Super Admin', 'Admin']) && (
              <Link
                to="/"
                className="flex items-center gap-x-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all group"
              >
                <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                Back to CRM
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
