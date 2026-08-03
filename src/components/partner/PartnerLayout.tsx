import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { PartnerSidebar } from './layout/PartnerSidebar';
import { PartnerTopNav } from './layout/PartnerTopNav';

export function PartnerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-full bg-background font-sans text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      <PartnerSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="lg:pl-72 flex flex-col min-h-screen">
        <PartnerTopNav setSidebarOpen={setSidebarOpen} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
