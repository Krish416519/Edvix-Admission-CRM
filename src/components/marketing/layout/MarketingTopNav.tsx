
import { Bell, Search, Plus, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../ThemeProvider';
import { useNavigate } from 'react-router-dom';

export function MarketingTopNav() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="h-16 shrink-0 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns, journeys..."
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          New Campaign
        </button>

        <button
          type="button"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <button className="relative p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-card" />
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-none">{user?.name || 'Marketing Admin'}</p>
            <p className="text-xs text-muted-foreground mt-1">{user?.role || 'Marketing'}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-border">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              user?.name?.charAt(0) || 'M'
            )}
          </div>
          <button 
            onClick={() => { logout(); navigate('/login'); }}
            className="ml-2 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
