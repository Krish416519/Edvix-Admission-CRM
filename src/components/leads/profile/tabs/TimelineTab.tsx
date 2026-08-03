import React, { useState, useMemo, useEffect } from 'react';
import { Lead } from '../../../../types/schema';
import { ActivityTimeline } from '../../../shared/ActivityTimeline';
import { AuditLogDetailPanel } from '../../../shared/AuditLogDetailPanel';
import { mockAuditLogs, subscribeAuditLogs } from '../../../../data/mockAuditLogs';
import { AuditLog } from '../../../../types/audit';
import { Filter } from 'lucide-react';

export function TimelineTab({ lead }: { lead: Lead }) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | undefined>();
  const [filter, setFilter] = useState<string>('All');
  const [logs, setLogs] = useState<AuditLog[]>(mockAuditLogs);

  useEffect(() => {
    const unsubscribe = subscribeAuditLogs((newLogs) => {
      setLogs([...newLogs]);
    });
    return unsubscribe;
  }, []);

  // Filter logs for this specific lead
  const leadLogs = useMemo(() => {
    let filtered = logs.filter(log => log.leadId === lead.id || (log.entityType === 'Lead' && log.entityId === lead.id));
    
    if (filter !== 'All') {
      filtered = filtered.filter(log => log.action === filter || log.entityType === filter);
    }
    
    // Sort descending by timestamp
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [lead.id, filter, logs]);

  return (
    <div className="p-6 animate-in fade-in duration-300 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-bold">Activity Timeline</h3>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="All">All Activities</option>
            <option value="Note">Notes</option>
            <option value="Task">Tasks</option>
            <option value="Status Changed">Status Changes</option>
            <option value="Document">Documents</option>
          </select>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2">
        <ActivityTimeline logs={leadLogs} onLogClick={setSelectedLog} />
      </div>

      {selectedLog && (
        <AuditLogDetailPanel 
          log={selectedLog} 
          isOpen={true} 
          onClose={() => setSelectedLog(undefined)} 
        />
      )}
    </div>
  );
}
