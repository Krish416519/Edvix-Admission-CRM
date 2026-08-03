import React from 'react';
import { Lead } from '../../../../types/schema';

export function CommunicationTab({ lead }: { lead: Lead }) {
  return (
    <div className="p-6 animate-in fade-in duration-300">
      <h3 className="text-lg font-bold mb-6">Communication</h3>
      <div className="bg-muted/20 border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
        Communication history coming soon.
      </div>
    </div>
  );
}
