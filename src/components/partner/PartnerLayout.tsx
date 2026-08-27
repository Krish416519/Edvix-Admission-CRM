import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { PartnerSidebar } from './layout/PartnerSidebar';
import { PartnerTopNav } from './layout/PartnerTopNav';
import { cn } from '../../lib/utils';

export function PartnerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="h-full bg-background font-sans text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      <PartnerSidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <div className={cn("flex flex-col min-h-screen transition-all duration-300", isCollapsed ? "lg:pl-20" : "lg:pl-72")}>
        <PartnerTopNav setSidebarOpen={setSidebarOpen} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
