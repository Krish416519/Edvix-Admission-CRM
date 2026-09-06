import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { ThemeProvider } from '../ThemeProvider';
import { useState } from 'react';

export function DynamicWorkspaceLayout() {
  const { isSuperAdmin, isDomainAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Dynamic styling based on permissions/roles
  const getWorkspaceStyle = () => {
    if (isSuperAdmin()) return 'border-t-4 border-indigo-500';
    if (isDomainAdmin()) return 'border-t-4 border-emerald-500';
    return '';
  };

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        
        <div className="flex-1 flex flex-col h-screen min-w-0">
          <TopNav setSidebarOpen={setSidebarOpen} />
          <main className={`flex-1 overflow-y-auto bg-background/50 ${getWorkspaceStyle()}`}>
            <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
