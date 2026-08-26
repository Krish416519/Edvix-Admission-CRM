import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { AIAssistant } from '../ai/AIAssistant';
import { Outlet } from 'react-router-dom';
import { MobileBottomNav } from './MobileBottomNav';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      {/* Background Mesh Gradient */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -right-[10%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      <div className="relative z-10 flex w-full h-full">
        {/* Desktop/Tablet Sidebar */}
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <TopNav setSidebarOpen={setSidebarOpen} />
        
        {/* Main Content Area - Added bottom padding on mobile for the Bottom Nav */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] md:pb-8">
          <div className="mx-auto max-w-[1920px] w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>
      
      <MobileBottomNav />
      <AIAssistant />
      </div>
    </div>
  );
}
