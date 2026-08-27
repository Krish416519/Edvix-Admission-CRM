
import { useMarketing } from '../../hooks/useMarketing';
import { Workflow, Plus, Play, Pause, MoreHorizontal, MessageSquare, Mail, Clock, UserPlus, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EmptyState } from '../ui/EmptyState';

const iconMap = {
  'WhatsApp': MessageSquare,
  'Email': Mail,
  'Delay': Clock,
  'Assign': UserPlus,
  'Condition': Workflow
};

export function MarketingJourneys() {
  const { journeys, loading } = useMarketing();
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Lead Nurturing Journeys</h1>
          <p className="text-muted-foreground mt-1">Automate touchpoints across email, WhatsApp, and counselor assignment.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          Create Journey
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-1 lg:col-span-2 flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : journeys.length === 0 ? (
          <div className="col-span-1 lg:col-span-2">
            <EmptyState
              icon={Workflow}
              title="No journeys found"
              description="Create your first automated nurturing journey to engage with leads."
              action={
                <button onClick={() => {}} className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors">
                  Create Journey
                </button>
              }
            />
          </div>
        ) : (
          journeys.map(journey => (
            <div key={journey.id} className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden">
            <div className="p-5 border-b border-border flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    journey.status === 'Active' ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                  <h3 className="font-bold text-lg text-foreground">{journey.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Workflow className="w-3.5 h-3.5" /> Trigger: {journey.trigger}
                </p>
              </div>
              <button className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 flex-1 bg-muted/10 relative">
              <div className="absolute left-9 top-5 bottom-5 w-px bg-border z-0" />
              
              <div className="space-y-4 relative z-10">
                {journey.steps.map((step, idx) => {
                  const StepIcon = iconMap[step.type as keyof typeof iconMap] || Workflow;
                  return (
                    <div key={step.id} className="flex gap-4 items-center">
                      <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shrink-0 shadow-sm text-muted-foreground">
                        <StepIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 bg-background border border-border rounded-lg p-3 shadow-sm">
                        <p className="text-sm font-medium text-foreground">{step.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.type}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-border bg-card grid grid-cols-3 gap-4 divide-x divide-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Enrolled</p>
                <p className="font-bold text-foreground">{journey.enrolled.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Completed</p>
                <p className="font-bold text-foreground">{journey.completed.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Conversion</p>
                <p className="font-bold text-emerald-500">{journey.conversionRate}%</p>
              </div>
            </div>
          </div>
          ))
        )}

        <button className="rounded-xl border-2 border-dashed border-border bg-card/50 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center min-h-[300px] text-muted-foreground hover:text-foreground group">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium text-lg">Build New Journey</span>
          <span className="text-sm mt-1 opacity-80">Start from scratch or use a template</span>
        </button>
      </div>
    </div>
  );
}
