import { useState, useEffect } from 'react';
import { Menu, Search, Sun, Moon, Sparkles, Command, X, User, LogOut, CreditCard, Phone } from 'lucide-react';
import { useTheme } from '../ThemeProvider';
import { useAuth } from '../../contexts/AuthContext';
import { useAI } from '../../contexts/AIContext';
import { useTelephony } from '../../contexts/TelephonyContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { useNavigate, Link } from 'react-router-dom';

export function TopNav({ setSidebarOpen }: { setSidebarOpen: (open: boolean) => void }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, switchOrganization, hasRole } = useAuth();
  const { toggleAssistant } = useAI();
  const { setIsDialerOpen } = useTelephony();
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  // Handle Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
    <header className="sticky top-0 z-30 flex h-14 md:h-16 md:mx-4 md:mt-4 md:rounded-2xl shrink-0 items-center gap-x-2 md:gap-x-4 border-b md:border border-border/40 bg-[var(--color-glass)] backdrop-blur-[40px] px-3 md:px-6 shadow-sm transition-all">
      {/* Mobile Logo & Hamburger (Kept for desktop compatibility, but hidden on mobile since we have bottom nav) */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Mobile App Title/Logo */}
      <Link to="/" className="flex md:hidden items-center gap-2 mr-auto hover:opacity-90 transition-opacity">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold shadow-sm text-xs">
          E
        </div>
        <span className="text-[15px] font-bold tracking-tight">Edvix CRM</span>
      </Link>

      <div className="flex flex-1 gap-x-2 md:gap-x-4 self-stretch justify-end md:justify-between items-center">
        {/* Desktop Search */}
        <div className="relative hidden md:flex flex-1 items-center max-w-2xl">
          <button
            onClick={() => setShowGlobalSearch(true)}
            className="w-full h-10 bg-muted/50 hover:bg-muted text-muted-foreground border border-border rounded-lg text-sm transition-colors flex items-center px-3"
          >
            <Search className="h-4 w-4 mr-2" />
            <span className="flex-1 text-left">Search leads, users, settings...</span>
            <div className="ml-auto flex items-center gap-1">
              <kbd className="inline-flex items-center gap-1 bg-background border border-border rounded px-1.5 py-0.5 text-[10px] font-medium font-sans">
                <Command className="w-3 h-3" /> K
              </kbd>
            </div>
          </button>
        </div>

        {/* Mobile Search Button */}
        <button
          onClick={() => setShowGlobalSearch(true)}
          className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-x-1 md:gap-x-4 lg:gap-x-6">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground transition-colors"
            onClick={toggleTheme}
          >
            <span className="sr-only">Toggle dark mode</span>
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Moon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          
          <button
            type="button"
            className="-m-2.5 p-2.5 text-primary hover:bg-primary/10 rounded-full transition-colors flex items-center gap-1.5"
            onClick={toggleAssistant}
          >
            <Sparkles className="h-5 w-5" />
            <span className="hidden sm:inline text-sm font-semibold">AI</span>
          </button>
          
          <button
            type="button"
            className="-m-2.5 p-2.5 text-foreground hover:bg-muted rounded-full transition-colors flex items-center justify-center"
            onClick={() => setIsDialerOpen(true)}
            title="Open Dialer"
          >
            <Phone className="h-5 w-5" />
          </button>

          <NotificationBell />

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />

          {/* Organization Switcher */}
          {user?.organizations && user.organizations.length > 1 && (
            <div className="hidden lg:flex items-center">
              <select
                value={user.activeOrganizationId || ''}
                onChange={(e) => switchOrganization(e.target.value)}
                className="bg-muted text-sm border border-border rounded-md px-2 py-1 focus:ring-primary focus:border-primary text-foreground cursor-pointer outline-none transition-colors max-w-[150px] truncate"
              >
                {user.organizations.map((org: any) => (
                  <option key={org.id} value={org.id} className="bg-card">
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Profile dropdown Placeholder */}
          <div className="hidden lg:flex items-center gap-x-4 relative">
             <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="focus:outline-none flex items-center">
               {user?.avatar ? (
                 <img
                    className="h-8 w-8 rounded-full bg-muted object-cover cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all border border-border"
                    src={user.avatar}
                    alt={user?.name}
                  />
               ) : (
                 <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all border border-border font-medium text-sm">
                   {user?.name?.charAt(0) || 'U'}
                 </div>
               )}
             </button>
             
             {showProfileMenu && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                 <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 py-1">
                   <div className="px-4 py-2 border-b border-border">
                     <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                     <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                   </div>
                   <button
                     onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}
                     className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                   >
                     <User className="w-4 h-4 text-muted-foreground" />
                     My Profile
                   </button>
                   {hasRole(['Admin', 'Super Admin']) && (
                     <button
                       onClick={() => { setShowProfileMenu(false); navigate('/admin/billing'); }}
                       className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2"
                     >
                       <CreditCard className="w-4 h-4 text-muted-foreground" />
                       Billing
                     </button>
                   )}
                   <button
                     onClick={() => { setShowProfileMenu(false); logout(); navigate('/login'); }}
                     className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2"
                   >
                     <LogOut className="w-4 h-4" />
                     Log out
                   </button>
                 </div>
               </>
             )}
          </div>
        </div>
      </div>
    </header>

      {/* Global Search Modal */}
      {showGlobalSearch && (
        <div className="fixed inset-0 z-[100] bg-card md:bg-black/40 md:backdrop-blur-sm flex justify-center items-start md:pt-20 md:p-4">
          <div className="bg-card w-full h-full md:h-auto md:max-w-2xl md:rounded-xl md:shadow-2xl md:border md:border-border flex flex-col overflow-hidden animate-in fade-in md:zoom-in-95 duration-200">
            <div className="flex items-center px-4 py-3 border-b border-border gap-3 mt-[env(safe-area-inset-top)] md:mt-0">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search CRM..." 
                className="flex-1 bg-transparent border-none outline-none text-base md:text-lg placeholder:text-muted-foreground text-foreground"
                autoFocus
              />
              <button 
                onClick={() => setShowGlobalSearch(false)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Links</div>
              <div className="space-y-1">
                <button onClick={() => { navigate('/admin/users'); setShowGlobalSearch(false); }} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted text-left">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">User Management</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Admin</span>
                </button>
                <button onClick={() => { navigate('/all-leads'); setShowGlobalSearch(false); }} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted text-left">
                  <div className="flex items-center gap-3">
                    <Search className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-foreground">Recent Leads</span>
                  </div>
                  <span className="text-xs text-muted-foreground">CRM</span>
                </button>
                <button onClick={() => { navigate('/admin'); setShowGlobalSearch(false); }} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted text-left">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-foreground">Admin Console</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
