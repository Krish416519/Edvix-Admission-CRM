import React, { useEffect, useState } from 'react';
import { dispositionService } from '../../../lib/dispositionService';
import { LeadDispositionHistory } from '../../../types/disposition';
import { Clock, CheckCircle2, User as UserIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function DispositionHistory({ leadId, refreshKey = 0 }: { leadId: string; refreshKey?: number }) {
  const [history, setHistory] = useState<LeadDispositionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [leadId, refreshKey]);

  const loadHistory = async () => {
    try {
      const data = await dispositionService.getLeadHistory(leadId);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading history...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="p-4 sm:p-8 text-center text-muted-foreground bg-muted/20 rounded-lg sm:rounded-xl border border-border border-dashed">
        <Clock className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No disposition history available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
      {history.map((record, idx) => (
        <div key={record.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
          
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-4 border-background bg-primary/10 text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>

          <div className="w-[calc(100%-3rem)] sm:w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 sm:p-4 rounded-lg sm:rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 sm:mb-2 gap-0.5">
              <div className="font-bold text-foreground text-sm sm:text-base">
                {record.dispositions?.name || 'Unknown Disposition'}
              </div>
              <time className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                {formatDistanceToNow(new Date(record.created_at || ''), { addSuffix: true })}
              </time>
            </div>
            
            {record.sub_dispositions && (
              <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                <span className="font-medium text-foreground">Reason:</span> {record.sub_dispositions.name}
              </div>
            )}
            
            {record.next_actions && (
              <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                <span className="font-medium text-foreground">Next Action:</span> {record.next_actions.name}
              </div>
            )}
            
            {record.follow_up_at && (
              <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mb-2 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded inline-block">
                Follow-up: {new Date(record.follow_up_at).toLocaleString()}
              </div>
            )}

            {record.notes && (
              <div className="text-xs sm:text-sm bg-muted/50 p-2 sm:p-2.5 rounded-lg border border-border/50 text-foreground italic">
                "{record.notes}"
              </div>
            )}

            {record.previous_status && record.new_status && record.previous_status !== record.new_status && (
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5 border-t border-border pt-2">
                Status changed: <span className="line-through opacity-70">{record.previous_status}</span> &rarr; <span className="font-medium text-foreground">{record.new_status}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
