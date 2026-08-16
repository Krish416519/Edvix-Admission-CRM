import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { AIAssistant } from '../ai/AIAssistant';
import { Outlet } from 'react-router-dom';
import { MobileBottomNav } from './MobileBottomNav';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      {/* Desktop/Tablet Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <TopNav setSidebarOpen={setSidebarOpen} />
        
        {/* Main Content Area - Added bottom padding on mobile for the Bottom Nav */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] md:pb-8">
          <div className="mx-auto max-w-7xl w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>
      
      <MobileBottomNav />
      <AIAssistant />
    </div>
  );
}
