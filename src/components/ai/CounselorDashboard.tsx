import React, { useState, useEffect } from 'react';
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
        // High conversion probability or Hot temp
        const { data: hotLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('assigned_counselor', user.id)
          .gte('conversion_probability', 60)
          .neq('status', 'Admission Done')
          .neq('status', 'Lost')
          .order('conversion_probability', { ascending: false })
          .limit(5);
        
        // High drop-off risk
        const { data: riskLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('assigned_counselor', user.id)
          .eq('drop_off_risk', 'High')
          .neq('status', 'Lost')
          .neq('status', 'Admission Done')
          .limit(5);

        if (hotLeads) setHighPriority(hotLeads);
        if (riskLeads) setAtRisk(riskLeads);
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
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h3 className="text-3xl font-bold text-foreground">92%</h3>
          <p className="text-sm text-muted-foreground font-medium mt-1">Daily Productivity Score</p>
          <p className="text-xs text-muted-foreground mt-2 px-4">You are tracking above average today. Keep it up!</p>
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
            <h3 className="font-semibold">Likely Conversions (Top 5)</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {highPriority.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hot leads right now.</p>
            ) : (
              highPriority.map(lead => (
                <div key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className="flex items-center justify-between p-3 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors group">
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.status} • {lead.course_id || 'Course Unknown'}</p>
                  </div>
                  <div className="flex items-center gap-2 text-orange-500 text-sm font-semibold">
                    <TrendingUp className="w-4 h-4" /> {lead.conversion_probability || 0}%
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
