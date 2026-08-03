import React from 'react';
import { Outlet } from 'react-router-dom';
import { MarketingSidebar } from './layout/MarketingSidebar';
import { MarketingTopNav } from './layout/MarketingTopNav';

export function MarketingLayout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/10 selection:text-primary">
      <MarketingSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <MarketingTopNav />
        <main className="flex-1 overflow-y-auto">
          <div className="animate-in fade-in duration-500 relative h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
