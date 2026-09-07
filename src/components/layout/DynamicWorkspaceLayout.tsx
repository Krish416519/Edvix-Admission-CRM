import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { MobileBottomNav } from './MobileBottomNav';
import { AIAssistant } from '../ai/AIAssistant';
import { GlobalTaskReminder } from '../tasks/GlobalTaskReminder';
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
      <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden relative">
        {/* Background Mesh Gradient for native app depth */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[40%] -right-[10%] w-[70%] h-[70%] rounded-full bg-primary/8 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/8 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        </div>

        <div className="relative z-10 flex w-full h-full">
          {/* Desktop Sidebar (hidden on mobile, driven by MobileBottomNav + MobileMoreMenu) */}
          <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
          
          <div className="flex-1 flex flex-col h-[100dvh] min-w-0">
            <TopNav setSidebarOpen={setSidebarOpen} />
            <main className={`flex-1 overflow-y-auto bg-background/50 ${getWorkspaceStyle()} scroll-ios pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6`}>
              <div className="w-full max-w-[1600px] mx-auto p-2.5 sm:p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
                <Outlet />
              </div>
            </main>
          </div>

          {/* Native Mobile App Bottom Navigation Bar */}
          <MobileBottomNav />
          <AIAssistant />
          <GlobalTaskReminder />
        </div>
      </div>
    </ThemeProvider>
  );
}
