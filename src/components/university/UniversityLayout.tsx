import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { UniversitySidebar } from './layout/UniversitySidebar';
import { UniversityTopNav } from './layout/UniversityTopNav';

export function UniversityLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-full bg-background font-sans text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      <UniversitySidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="lg:pl-72 flex flex-col min-h-screen">
        <UniversityTopNav setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
