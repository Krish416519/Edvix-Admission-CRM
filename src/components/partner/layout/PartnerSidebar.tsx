
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Users, GraduationCap, 
  IndianRupee, PieChart, LogOut, Sparkles, UserPlus, LifeBuoy, ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';

const navigation = [
  { name: 'Overview', href: '/partner', icon: LayoutDashboard },
  { name: 'My Leads', href: '/partner/leads', icon: Users },
  { name: 'Admissions', href: '/partner/admissions', icon: GraduationCap },
  { name: 'Enrolled Students', href: '/partner/students', icon: GraduationCap },
  { name: 'Commissions', href: '/partner/commissions', icon: IndianRupee },
  { name: 'University Catalog', href: '/partner/catalog', icon: GraduationCap },
  { name: 'Reports', href: '/partner/reports', icon: PieChart },
  { name: 'AI Assistant', href: '/partner/ai', icon: Sparkles },
  { name: 'Support', href: '/partner/support', icon: LifeBuoy },
  { name: 'Profile & KYC', href: '/partner/kyc', icon: UserPlus },
];

export function PartnerSidebar({ 
  sidebarOpen, 
  setSidebarOpen,
  isCollapsed,
  setIsCollapsed
}: { 
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
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
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card/80 backdrop-blur-2xl border-r border-border/50 px-6 pb-4 shadow-2xl">
                <Link to="/partner" className="flex h-16 shrink-0 items-center hover:opacity-80 transition-opacity mt-2">
                  <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl mr-3 shadow-inner">
                    <Sparkles className="h-6 w-6 text-indigo-500" />
                  </div>
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 tracking-tight">
                    Partner Portal
                  </span>
                </Link>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {navigation.map((item) => (
                          <li key={item.name}>
                            <NavLink
                              to={item.href}
                              end={item.href === '/partner'}
                              onClick={() => setSidebarOpen(false)}
                              className={({ isActive }) =>
                                cn(
                                  isActive
                                    ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold shadow-[inset_3px_0_0_0_currentColor]'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                                  'group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-medium transition-all duration-200'
                                )
                              }
                            >
                              <item.icon 
                                className={cn(
                                  "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                                  ({ isActive }: any) => isActive ? "text-primary drop-shadow-md" : ""
                                )} 
                                aria-hidden="true" 
                              />
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
      <div className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "lg:w-20" : "lg:w-[280px]"
      )}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border/40 bg-card/60 backdrop-blur-xl pb-4 pt-4 relative shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
          
          {/* Collapse Toggle Button */}
          {setIsCollapsed && (
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="absolute -right-3 top-8 bg-background border border-border/60 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted hover:scale-110 z-10 hidden lg:block transition-all shadow-sm"
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          )}

          <Link to="/partner" className={cn("flex h-14 shrink-0 items-center hover:opacity-80 transition-opacity mt-2", isCollapsed ? "justify-center px-0" : "px-6")}>
            <div className={cn("p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl shadow-inner", !isCollapsed && "mr-3")}>
              <Sparkles className="h-6 w-6 text-indigo-500" />
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold tracking-tight text-foreground whitespace-nowrap">
                Edvix <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 font-bold text-lg">Partner</span>
              </span>
            )}
          </Link>
          <nav className="flex flex-1 flex-col pt-4">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                {!isCollapsed && (
                  <div className="text-[10px] font-bold leading-6 text-muted-foreground/70 uppercase tracking-widest mb-3 px-6">
                    Portal Menu
                  </div>
                )}
                <ul role="list" className={cn("space-y-1.5", isCollapsed ? "px-3" : "px-4")}>
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <NavLink
                        to={item.href}
                        end={item.href === '/partner'}
                        title={isCollapsed ? item.name : undefined}
                        className={({ isActive }) =>
                          cn(
                            isActive
                              ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold shadow-[inset_3px_0_0_0_currentColor]'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                            isCollapsed ? 'justify-center p-3' : 'gap-x-3 p-3 px-4',
                            'group flex rounded-xl text-sm leading-6 font-medium transition-all duration-200 relative overflow-hidden'
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <div className="absolute inset-0 bg-primary/5 opacity-50 blur-xl rounded-xl" />
                            )}
                            <item.icon 
                              className={cn(
                                "h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 relative z-10",
                                isActive ? "text-primary drop-shadow-md" : ""
                              )} 
                              aria-hidden="true" 
                            />
                            {!isCollapsed && <span className="relative z-10">{item.name}</span>}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
              
              <li className={cn("mt-auto flex flex-col gap-2 pb-4", isCollapsed ? "px-3" : "px-4")}>
                {hasRole(['Super Admin', 'Admin']) && (
                  <Link
                    to="/"
                    title={isCollapsed ? "Back to CRM" : undefined}
                    className={cn(
                      "flex items-center rounded-xl text-sm leading-6 font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-200 w-full group",
                      isCollapsed ? "justify-center p-3" : "gap-x-3 p-3 px-4"
                    )}
                  >
                    <ArrowLeft className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-1" />
                    {!isCollapsed && <span>Back to CRM</span>}
                  </Link>
                )}
                 <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    title={isCollapsed ? "Sign out" : undefined}
                    className={cn(
                      "flex items-center rounded-xl text-sm leading-6 font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 w-full group",
                      isCollapsed ? "justify-center p-3" : "gap-x-3 p-3 px-4"
                    )}
                  >
                    <LogOut className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                    {!isCollapsed && <span>Sign out</span>}
                 </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
