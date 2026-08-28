import { LeadsList } from '../leads/LeadsList';

export function LivePipeline() {
  return (
    <div className="h-full">
      <LeadsList showSmartStages={true} />
    </div>
  );
}
