import React, { useState, useMemo, useEffect } from 'react';
import { Lead } from '../../../../types/schema';
import { ActivityTimeline } from '../../../shared/ActivityTimeline';
import { AuditLogDetailPanel } from '../../../shared/AuditLogDetailPanel';
import { AuditLog } from '../../../../types/audit';
import { Filter } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';

export function TimelineTab({ lead, refreshKey = 0 }: { lead: Lead; refreshKey?: number }) {
  const { user, hasRole } = useAuth();
  // Only admins and authorized roles can see who performed each activity
  const showAuthor = hasRole(['Admin', 'Super Admin', 'Accounts', 'Marketing', 'University']);
  const [selectedLog, setSelectedLog] = useState<AuditLog | undefined>();
  const [filter, setFilter] = useState<string>('All');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [lead.id, lead.updatedAt, (lead as any).updated_at, refreshKey]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching activities:', error);
        return;
      }

      // Fetch users for mapping
      const { data: usersData } = await supabase.from('users').select('id, name, role');
      const userMap = new Map();
      if (usersData) {
        usersData.forEach(u => userMap.set(u.id, { name: u.name, role: u.role }));
      }

      // Format activities into AuditLogs
      const formattedLogs: AuditLog[] = (data || []).map((activity: any) => {
        let actionStr = activity.type;
        if (actionStr === 'status_change') actionStr = 'Status Changed';
        else if (actionStr === 'note_added') actionStr = 'Note';
        else if (actionStr === 'call_logged') actionStr = 'Call Logged';
        
        let title = activity.subject || actionStr;
        if (actionStr === 'Status Changed') {
          if (activity.content?.includes('Disposition: **')) {
            const match = activity.content.match(/Disposition: \*\*(.*?)\*\*/);
            if (match) {
              title = `Disposition: ${match[1]}`;
            }
          } else if (activity.metadata?.newStatus) {
            title = activity.metadata.newStatus;
          }
        }
        
        const user = userMap.get(activity.created_by);
        // Prefer user lookup by UUID, fall back to stored author name, then 'System'
        const userName = user?.name || (activity.author && !activity.author.match(/^[0-9a-f-]{36}$/i) ? activity.author : null) || 'System';
        const userRole = user?.role || 'System';

        return {
          id: activity.id,
          action: actionStr,
          entityType: 'Lead',
          entityId: lead.id,
          title: title,
          description: activity.content || '',
          userId: activity.created_by,
          userName: userName,
          userRole: userRole,
          timestamp: activity.created_at,
          leadId: lead.id,
          previousValue: activity.metadata?.previousStatus,
          newValue: activity.metadata?.newStatus,
        };
      });

      // Add the initial lead creation event
      const creationDate = lead.createdAt || (lead as any).created_at || new Date().toISOString();
      formattedLogs.push({
        id: `creation-${lead.id}`,
        action: 'Created',
        entityType: 'Lead',
        entityId: lead.id,
        title: 'Lead Captured',
        description: `Lead ${lead.firstName} ${lead.lastName} was captured in the system.`,
        userName: 'System',
        timestamp: creationDate,
        leadId: lead.id
      });

      // Sort descending by timestamp
      formattedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setLogs(formattedLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter logs for this specific lead
  const leadLogs = useMemo(() => {
    let filtered = logs;
    
    if (filter !== 'All') {
      filtered = filtered.filter(log => log.action === filter || log.title?.includes(filter));
    }
    
    return filtered;
  }, [filter, logs]);

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
            <option value="Call Logged">Calls</option>
            <option value="Status Changed">Status Changes</option>
            <option value="Created">Lead Capture</option>
          </select>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <ActivityTimeline logs={leadLogs} onLogClick={setSelectedLog} showAuthor={showAuthor} />
        )}
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
