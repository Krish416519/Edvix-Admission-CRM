import { useEffect, useState } from 'react';
import { dispositionService } from '../../../lib/dispositionService';
import { LeadDispositionHistory } from '../../../types/disposition';
import { Clock, CheckCircle2, FileText, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { parseDescription } from '../../shared/ActivityTimeline';

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
    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent pt-4">
      {history.map((record, idx) => {
        const { kvPairs, summary } = parseDescription(record.notes || '');
        const hasStructuredNotes = kvPairs.length > 0;
        const titleName = record.disposition_name || record.dispositions?.name || 'Unknown Disposition';
        const isCounselled = titleName.toLowerCase().includes('counsel');

        return (
          <div key={record.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-4 border-background bg-primary/10 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
               {isCounselled ? <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" /> : <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />}
            </div>

            <div className="w-[calc(100%-3rem)] sm:w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 sm:p-5 rounded-xl border border-border bg-card shadow-sm transition-colors hover:border-primary/30 hover:shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1.5">
                     <h4 className="text-[15px] font-bold text-foreground leading-none uppercase tracking-wide">
                       {titleName}
                     </h4>
                  </div>
                  {record.follow_up_at && (
                    <div className="mt-2.5">
                      <span className="inline-flex px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-[10px] font-semibold tracking-wide">
                        Follow-up: {format(new Date(record.follow_up_at), "MMM dd, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {formatDistanceToNow(new Date(record.created_at || ''), { addSuffix: true })}
                  </span>
                </div>
              </div>
              
              <div className="h-px w-full bg-border my-4" />

              <div className="flex flex-col space-y-4">
                {(record.sub_disposition_name || record.sub_dispositions) && (
                  <div className="text-xs sm:text-[13px] text-foreground/90">
                    <span className="font-medium text-muted-foreground mr-2 uppercase text-[10px] tracking-wide">Reason:</span> 
                    {record.sub_disposition_name || record.sub_dispositions?.name}
                  </div>
                )}
                
                {(record.next_action_name || record.next_actions) && (
                  <div className="text-xs sm:text-[13px] text-foreground/90">
                    <span className="font-medium text-muted-foreground mr-2 uppercase text-[10px] tracking-wide">Next Action:</span> 
                    {record.next_action_name || record.next_actions?.name}
                  </div>
                )}

                {hasStructuredNotes ? (
                  <div className="flex flex-col pt-1">
                    <div className="flex items-center gap-2 mb-3">
                       <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Counselling Details</h5>
                       <div className="h-px bg-border/50 flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                      {kvPairs.map((pair, idx) => {
                        const valLower = pair.value.toLowerCase();
                        const isBool = valLower === 'yes' || valLower === 'no';
                        const isYes = valLower === 'yes';
                        return (
                          <div key={idx} className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-tight">{pair.key}</span>
                            <span className={`text-[12px] font-semibold leading-snug ${isBool ? (isYes ? 'text-emerald-500' : 'text-rose-500') : 'text-foreground'}`}>
                              {pair.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {summary && summary !== 'na.' && summary !== 'No additional notes provided.' && (
                      <div className="mt-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                         <h5 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Additional Notes</h5>
                         <p className="text-[12px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{summary}</p>
                      </div>
                    )}
                  </div>
                ) : record.notes ? (
                  <div className="text-[12px] bg-muted/30 p-3 rounded-lg border border-border/50 text-foreground/90 italic whitespace-pre-wrap leading-relaxed">
                    "{record.notes}"
                  </div>
                ) : null}

                {record.previous_status && record.new_status && record.previous_status !== record.new_status && (
                  <div className="mt-1 pt-3 text-[11px] text-muted-foreground flex items-center gap-1.5 border-t border-border/50">
                    Status changed: <span className="line-through opacity-70">{record.previous_status}</span> &rarr; <span className="font-medium text-foreground">{record.new_status}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
