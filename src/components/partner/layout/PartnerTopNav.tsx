import React from 'react';
import { Menu, Sun, Moon, Bell, LogOut, Search } from 'lucide-react';
import { useTheme } from '../../ThemeProvider';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function PartnerTopNav({ setSidebarOpen }: { setSidebarOpen: (open: boolean) => void }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground md:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="h-6 w-px bg-border md:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="relative flex flex-1 items-center max-w-2xl">
          <div className="w-full max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search leads, admissions..."
              className="w-full h-10 bg-muted/50 border border-border rounded-lg pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-colors text-foreground"
            />
          </div>
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
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
          
          <button className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground transition-colors relative">
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card"></span>
          </button>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />

          {/* Profile dropdown Placeholder */}
          <div className="hidden lg:flex items-center gap-x-4">
             {user?.avatar ? (
               <img
                  className="h-8 w-8 rounded-full bg-muted object-cover border border-border"
                  src={user.avatar}
                  alt={user.name}
                />
             ) : (
               <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-border font-medium text-sm">
                 {user?.name?.charAt(0) || 'P'}
               </div>
             )}
             <div className="flex flex-col">
               <span className="text-sm font-semibold text-foreground leading-none mb-1">{user?.name || 'Partner'}</span>
               <span className="text-xs text-muted-foreground leading-none">Partner Portal</span>
             </div>
             
             <button 
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="ml-2 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                title="Logout"
              >
               <LogOut className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>
    </header>
  );
}
