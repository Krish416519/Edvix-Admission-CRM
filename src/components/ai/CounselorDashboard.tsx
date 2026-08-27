import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Sparkles, Flame, AlertTriangle, PhoneCall, CheckCircle2,
  TrendingUp, Users, Clock, AlertCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { addAuditLog } from '../../data/mockAuditLogs';
import { automationService } from '../../lib/automationService';
import { Lead } from '../../types/schema';
import { useNavigate } from 'react-router-dom';

export function CounselorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [highPriority, setHighPriority] = useState<Lead[]>([]);
  const [atRisk, setAtRisk] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [perfScore, setPerfScore] = useState<number>(0);
  const [perfNote, setPerfNote] = useState<string>('');

  const handleExecuteWorkflow = async () => {
    setExecuting(true);
    try {
      // Simulate calling the automation engine for the suggested action
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      automationService.triggerEvent('Bulk Action', { action: 'Send WhatsApp Reminder', count: 3 });
      
      addAuditLog({
        action: 'Executed',
        entityType: 'Workflow',
        entityId: 'WFL-AI-123',
        title: 'AI Workflow Executed',
        description: 'Bulk WhatsApp reminder sent to 3 leads in Application Started status without documents.',
        userName: user?.name || 'Counselor'
      });
      
      toast.success('Workflow executed successfully. 3 messages queued.');
    } catch (e) {
      toast.error('Failed to execute workflow');
    } finally {
      setExecuting(false);
    }
  };

  useEffect(() => {
    const fetchAIPriorities = async () => {
      if (!user) return;
      try {
        // Fetch AI Priority Queue Leads (sorted by ai_priority_score)
        const { data: priorityLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('assigned_counselor', user.id)
          .not('status', 'in', '("Admission Done", "Lost")')
          .order('ai_priority_score', { ascending: false })
          .limit(5);
        
        // High drop-off risk
        const { data: riskLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('assigned_counselor', user.id)
          .eq('ai_drop_off_risk', 'High')
          .not('status', 'in', '("Admission Done", "Lost")')
          .limit(5);

        // Fetch Counselor Performance
        const { data: perf } = await supabase
          .from('counselor_performance')
          .select('*')
          .eq('counselor_id', user.id)
          .eq('date', new Date().toISOString().split('T')[0])
          .single();

        if (priorityLeads) setHighPriority(priorityLeads);
        if (riskLeads) setAtRisk(riskLeads);
        if (perf) {
          setPerfScore(perf.score);
          setPerfNote(perf.ai_recommendation || perf.ai_improvements || 'You are tracking well today. Keep it up!');
        } else {
          setPerfScore(92); // Mock default if cron hasn't run yet
          setPerfNote('You are tracking well today. Keep it up!');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAIPriorities();
  }, [user]);

  if (loading) return <div className="p-8 flex justify-center"><Sparkles className="w-8 h-8 text-primary animate-pulse" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Assistant Dashboard</h1>
          <p className="text-muted-foreground">Your personalized daily priorities and intelligent recommendations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Productivity Score */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${perfScore >= 80 ? 'bg-emerald-500/10 text-emerald-500' : perfScore >= 60 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
            <TrendingUp className="w-8 h-8" />
          </div>
          <h3 className="text-3xl font-bold text-foreground">{perfScore}%</h3>
          <p className="text-sm text-muted-foreground font-medium mt-1">AI Performance Score</p>
          <p className="text-xs text-muted-foreground mt-2 px-4">{perfNote}</p>
        </div>

        {/* Tasks Summary */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-center">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-primary" /> Today's Focus
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Calls to make</span>
              <span className="font-semibold">12</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Pending Follow-ups</span>
              <span className="font-semibold text-amber-500">5</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Urgent Documents</span>
              <span className="font-semibold text-red-500">2</span>
            </div>
          </div>
        </div>

        {/* Action Recommendation */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6 shadow-sm flex flex-col justify-center">
          <h3 className="font-semibold flex items-center gap-2 mb-2 text-primary">
            <Sparkles className="w-5 h-5" /> Suggested Action
          </h3>
          <p className="text-sm text-foreground mb-4">
            "You have 3 leads in 'Application Started' status who haven't uploaded documents in 48 hours. Want me to send a bulk WhatsApp reminder?"
          </p>
          <button 
            onClick={handleExecuteWorkflow}
            disabled={executing}
            className="bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {executing ? 'Executing...' : 'Execute Workflow'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hot Leads */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold">AI Priority Queue</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {highPriority.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No leads in priority queue right now.</p>
            ) : (
              highPriority.map((lead, index) => (
                <div key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="flex items-start justify-between p-3 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors group">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">
                        P{index + 1}
                      </span>
                      <p className="font-medium group-hover:text-primary transition-colors text-sm">{lead.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{lead.status} • Score: {lead.aiPriorityScore || lead.ai_priority_score || 0}</p>
                    <p className="text-[11px] text-primary/80 line-clamp-1 italic">{lead.aiPriorityReason || lead.ai_priority_reason || 'Needs follow-up'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-orange-500 text-xs font-semibold whitespace-nowrap">
                      <TrendingUp className="w-3 h-3" /> {(lead.conversionProbability || lead.conversion_probability || 0)}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* At Risk Leads */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold">Leads at Risk</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {atRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">All leads are healthy.</p>
            ) : (
              atRisk.map(lead => (
                <div key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="flex items-center justify-between p-3 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors group">
                  <div>
                    <p className="font-medium group-hover:text-red-500 transition-colors">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">Inactive for a while</p>
                  </div>
                  <button className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md flex items-center gap-1">
                    <PhoneCall className="w-3 h-3" /> Call Now
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
