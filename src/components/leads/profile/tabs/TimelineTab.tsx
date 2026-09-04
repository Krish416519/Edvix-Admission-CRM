import { useState, useEffect, useCallback } from 'react';
import { Lead } from '../../../../types/schema';
import { ActivityTimeline } from '../../../shared/ActivityTimeline';
import { AuditLogDetailPanel } from '../../../shared/AuditLogDetailPanel';
import { AuditLog } from '../../../../types/audit';
import { Filter } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';

const PAGE_SIZE = 50;

export function TimelineTab({ lead, refreshKey = 0 }: { lead: Lead; refreshKey?: number }) {
  const { user } = useAuth();
  const showAuthor = true;
  const [selectedLog, setSelectedLog] = useState<AuditLog | undefined>();
  const [filter, setFilter] = useState<string>('All');
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Map UI filter to DB types
  const getFilterTypes = (filterVal: string): string[] | null => {
    switch (filterVal) {
      case 'Notes': return ['note'];
      case 'Calls': return ['call'];
      case 'Status Changes': return ['status_change'];
      case 'Disposition Changes': return ['disposition_change'];
      case 'Assignments': return ['assignment'];
      case 'Tasks': return ['task', 'task_created', 'task_completed'];
      case 'Created': return ['lead_created'];
      default: return null;
    }
  };

  const fetchActivities = useCallback(async (pageNum: number, isReset: boolean) => {
    if (isReset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE; // Inclusive range requests PAGE_SIZE + 1 items

      let query = supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }) // deterministic tie-breaker
        .range(from, to);

      const filterTypes = getFilterTypes(filter);
      if (filterTypes) {
        query = query.in('type', filterTypes);
      } else if (filter === 'System') {
        query = query.eq('author', 'System');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching activities:', error);
        return;
      }

      const resultData = data || [];
      const hasMoreItems = resultData.length > PAGE_SIZE;
      
      // Remove the 51st item if it exists
      if (hasMoreItems) {
        resultData.pop();
      }

      // Fetch users for mapping
      const { data: usersData } = await supabase.from('users').select('id, name, role');
      const userMap = new Map();
      if (usersData) {
        usersData.forEach(u => userMap.set(u.id, { name: u.name, role: u.role }));
      }

      const formattedLogs: AuditLog[] = resultData.map((activity: any) => {
        let actionStr = activity.type;
        if (actionStr === 'status_change') actionStr = 'Status Changed';
        else if (actionStr === 'disposition_change') actionStr = 'Disposition Changed';
        else if (actionStr === 'note') actionStr = 'Note';
        else if (actionStr === 'call') actionStr = 'Call Logged';
        else if (actionStr === 'assignment') actionStr = 'Assigned';
        else if (actionStr === 'lead_created') actionStr = 'Created';
        
        let title = activity.subject || actionStr;
        if (actionStr === 'Status Changed' || actionStr === 'Disposition Changed') {
          if (activity.content?.includes('Disposition: **')) {
            const match = activity.content.match(/Disposition: \*\*(.*?)\*\*/);
            if (match) {
              title = `Disposition: ${match[1]}`;
            }
          } else if (activity.metadata?.newStatus) {
            title = activity.metadata.newStatus;
          }
        }
        
        const mapUser = userMap.get(activity.created_by);
        let userName = mapUser?.name;
        let userRole = mapUser?.role;

        if (!userName && activity.created_by && activity.created_by === user?.id) {
          userName = user?.name;
          userRole = user?.role;
        }

        if (!userName && activity.author && !activity.author.match(/^[0-9a-f-]{36}$/i) && activity.author !== 'Unknown User' && activity.author !== 'System') {
          userName = activity.author;
        }

        // Fallback for older unstructured logs
        if ((!userName || userName === 'System') && ['status_change', 'note', 'call'].includes(activity.type)) {
          const counselorId = lead.assignedCounselor || (lead as any).assigned_counselor || (lead as any).counselorId;
          const counselorName = (lead as any).counselor; 
          
          if (counselorId) {
             const assigned = userMap.get(counselorId);
             if (assigned) {
               userName = assigned.name;
               userRole = assigned.role;
             }
          }
          
          if ((!userName || userName === 'System') && counselorName && counselorName !== 'Unassigned') {
             userName = counselorName;
             userRole = 'Counselor';
          }
        }

        userName = userName || 'System';
        userRole = userRole || (userName === 'System' ? 'System' : undefined);

        return {
          id: activity.id,
          action: actionStr,
          entityType: activity.related_entity_type || 'Lead',
          entityId: activity.related_entity_id || lead.id,
          title: title,
          description: activity.content || '',
          userId: activity.created_by,
          userName: userName,
          userRole: userRole,
          timestamp: activity.created_at,
          leadId: lead.id,
          previousValue: activity.previous_value || activity.metadata?.previousStatus,
          newValue: activity.new_value || activity.metadata?.newStatus,
          previousLabel: activity.previous_label,
          newLabel: activity.new_label,
          source: activity.source,
        };
      });

      // Synthetic creation event fallback if no more records and we are looking at everything/creation
      if (!hasMoreItems && (filter === 'All' || filter === 'Created') && pageNum > 0) {
        // We only add it if we are actually at the end of the history
        // Or if pageNum == 0 and resultData is short
      }
      
      if (!hasMoreItems && (filter === 'All' || filter === 'Created')) {
        const creationDate = lead.createdAt || (lead as any).created_at || new Date().toISOString();
        const syntheticCreationId = `creation-${lead.id}`;
        // Ensure we don't duplicate it
        const alreadyExists = resultData.some((a: any) => a.type === 'lead_created') || formattedLogs.some(l => l.id === syntheticCreationId);
        
        if (!alreadyExists) {
          formattedLogs.push({
            id: syntheticCreationId,
            action: 'Created',
            entityType: 'Lead',
            entityId: lead.id,
            title: 'Lead Captured',
            description: `Lead ${lead.firstName} ${lead.lastName} was captured in the system.`,
            userName: 'System',
            timestamp: creationDate,
            leadId: lead.id
          });
        }
      }

      setLogs(prev => {
        if (isReset) return formattedLogs;
        
        // Append and deduplicate
        const existingIds = new Set(prev.map(l => l.id));
        const newLogs = formattedLogs.filter(l => !existingIds.has(l.id));
        return [...prev, ...newLogs];
      });

      setHasMore(hasMoreItems);
      setPage(pageNum);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lead, filter, user]);

  // Handle filter changes and external refresh
  useEffect(() => {
    setLogs([]);
    setHasMore(true);
    setPage(0);
    fetchActivities(0, true);
  }, [fetchActivities, refreshKey, filter]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchActivities(page + 1, false);
    }
  };

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
            <option value="Notes">Notes</option>
            <option value="Calls">Calls</option>
            <option value="Status Changes">Status Changes</option>
            <option value="Disposition Changes">Disposition Changes</option>
            <option value="Assignments">Assignments</option>
            <option value="Tasks">Tasks</option>
            <option value="System">System</option>
            <option value="Created">Lead Capture</option>
          </select>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 pb-8">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <ActivityTimeline logs={logs} onLogClick={setSelectedLog} showAuthor={showAuthor} hideNoise={filter !== 'System'} />
            
            {hasMore && (
              <div className="flex justify-center pt-4 pb-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 bg-muted/50 hover:bg-muted text-sm font-medium rounded-full transition-colors disabled:opacity-50 flex items-center gap-2 border border-border"
                >
                  {loadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      Loading more...
                    </>
                  ) : (
                    'Load more activity'
                  )}
                </button>
              </div>
            )}
            
            {!hasMore && logs.length > 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground opacity-60">
                No more activity
              </div>
            )}
          </div>
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
