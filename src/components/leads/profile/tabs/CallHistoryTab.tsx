import { useEffect, useState } from 'react';
import { Lead } from '../../../../types/schema';
import { Call } from '../../../../types/telephony';
import { useTelephony } from '../../../../contexts/TelephonyContext';
import { CallHistoryPanel } from '../../../telephony/CallHistoryPanel';

export function CallHistoryTab({ lead }: { lead: Lead }) {
  const { fetchCallsForLead } = useTelephony();
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCalls = async () => {
      setIsLoading(true);
      const data = await fetchCallsForLead(lead.id);
      setCalls(data);
      setIsLoading(false);
    };
    
    if (lead?.id) {
      loadCalls();
    }
  }, [lead?.id]);

  return (
    <div className="p-4 h-full">
      <CallHistoryPanel calls={calls} isLoading={isLoading} />
    </div>
  );
}
