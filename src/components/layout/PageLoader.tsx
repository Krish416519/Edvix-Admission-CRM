import React from 'react';
import { Loader2 } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center w-full animate-in fade-in duration-500">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
      <h2 className="text-xl font-semibold text-foreground tracking-tight">Loading Component...</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        Please wait while we initialize the module.
      </p>
    </div>
  );
}
