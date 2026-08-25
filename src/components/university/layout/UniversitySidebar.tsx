import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Users, GraduationCap, 
  Wallet, BookOpen, LogOut, Landmark, FileText, Bell, BarChart2, Bot, ArrowLeft
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';

const navigation = [
  { name: 'Overview', href: '/university', icon: LayoutDashboard },
  { name: 'Interested Leads', href: '/university/leads', icon: Users },
  { name: 'Admissions', href: '/university/admissions', icon: GraduationCap },
  { name: 'Documents', href: '/university/documents', icon: FileText },
  { name: 'Settlements', href: '/university/finance', icon: Wallet },
  { name: 'Programs', href: '/university/courses', icon: BookOpen },
  { name: 'Reports', href: '/university/reports', icon: BarChart2 },
  { name: 'Notifications', href: '/university/notifications', icon: Bell },
  { name: 'AI Assistant', href: '/university/ai', icon: Bot },
];

export function UniversitySidebar({ 
  sidebarOpen, 
  setSidebarOpen 
}: { 
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  const { logout, hasRole } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="relative z-50 lg:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out">
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card border-r border-border px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center">
                  <Landmark className="h-8 w-8 text-blue-500" />
                  <span className="ml-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">
                    University Portal
                  </span>
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {navigation.map((item) => (
                          <li key={item.name}>
                            <NavLink
                              to={item.href}
                              end={item.href === '/university'}
                              onClick={() => setSidebarOpen(false)}
                              className={({ isActive }) =>
                                cn(
                                  isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all'
                                )
                              }
                            >
                              <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                              {item.name}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-card px-6 pb-4 pt-4">
          <div className="flex h-12 shrink-0 items-center px-2">
            <Landmark className="h-7 w-7 text-blue-500" />
            <span className="ml-3 text-xl font-bold tracking-tight text-foreground">
              Edvix <span className="text-muted-foreground font-medium text-lg">University</span>
            </span>
          </div>
          <nav className="flex flex-1 flex-col pt-4">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <div className="text-xs font-semibold leading-6 text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  Portal Menu
                </div>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <NavLink
                        to={item.href}
                        end={item.href === '/university'}
                        className={({ isActive }) =>
                          cn(
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                            'group flex gap-x-3 rounded-lg p-2.5 text-sm leading-6 font-medium transition-all'
                          )
                        }
                      >
                        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        {item.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
              
              <li className="mt-auto -mx-2 flex flex-col gap-2">
                {hasRole(['Super Admin', 'Admin']) && (
                  <Link
                    to="/"
                    className="w-full flex items-center gap-x-3 rounded-lg p-2.5 text-sm leading-6 font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
                  >
                    <ArrowLeft className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-1" />
                    Back to CRM
                  </Link>
                )}
                 <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-x-3 rounded-lg p-2.5 text-sm leading-6 font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign out
                 </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
