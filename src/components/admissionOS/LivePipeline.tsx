import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, AlertTriangle, Clock, ChevronRight, Users, Loader2,
  Shield, Zap, ArrowRight, Filter, RefreshCw, TrendingUp
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AdmissionOS, PipelineCard, PIPELINE_STAGES, PipelineStage } from '../../lib/ai/AdmissionOS';

const STAGE_COLORS: Record<PipelineStage, string> = {
  'New Lead': 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600',
  'Contacted': 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700',
  'Qualified': 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700',
  'Counselling': 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700',
  'University Suggested': 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700',
  'Documents Pending': 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
  'Documents Verified': 'bg-lime-50 dark:bg-lime-900/20 border-lime-300 dark:border-lime-700',
  'Application Submitted': 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-300 dark:border-cyan-700',
  'University Review': 'bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700',
  'Offer Letter': 'bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-700',
  'Fee Payment': 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700',
  'Admission Confirmed': 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700',
  'LMS Activated': 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700',
  'Completed': 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-600',
};

const RISK_BADGE: Record<string, string> = {
  'Low': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Medium': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'High': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Critical': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function LivePipeline() {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<PipelineCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | 'All'>('All');
  const [refreshing, setRefreshing] = useState(false);

  const fetchPipeline = async () => {
    try {
      const data = await AdmissionOS.getLivePipeline();
      setPipeline(data);
    } catch (e) {
      console.error('Failed to load pipeline:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPipeline();
  };

  const stageGroups = useMemo(() => {
    const groups: Record<string, PipelineCard[]> = {};
    for (const stage of PIPELINE_STAGES) {
      groups[stage] = pipeline.filter(c => c.pipelineStage === stage);
    }
    return groups;
  }, [pipeline]);

  const summary = useMemo(() => {
    return {
      total: pipeline.length,
      critical: pipeline.filter(c => c.riskLevel === 'Critical').length,
      high: pipeline.filter(c => c.riskLevel === 'High').length,
      revenue: pipeline.reduce((s, c) => s + c.expectedRevenue, 0),
    };
  }, [pipeline]);

  const visibleStages = selectedStage === 'All'
    ? PIPELINE_STAGES
    : PIPELINE_STAGES.filter(s => s === selectedStage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <Brain className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-lg font-semibold">Admission OS is analyzing your pipeline...</p>
          <p className="text-sm text-muted-foreground mt-1">Scanning leads, admissions, and activity data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-full mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admission OS</h1>
            <p className="text-sm text-muted-foreground">Live pipeline • {summary.total} students tracked</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Summary badges */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {summary.critical} Critical
            </span>
            <span className="px-2.5 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold">
              {summary.high} High Risk
            </span>
            <span className="px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> ₹{(summary.revenue / 100000).toFixed(1)}L Pipeline
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 border border-border rounded-lg hover:bg-muted transition-colors"
            title="Refresh pipeline"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Stage Filter */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar mb-4 pb-1 px-1">
        <button
          onClick={() => setSelectedStage('All')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border",
            selectedStage === 'All'
              ? 'bg-primary text-white border-primary'
              : 'bg-card text-muted-foreground border-border hover:bg-muted'
          )}
        >
          All Stages ({pipeline.length})
        </button>
        {PIPELINE_STAGES.map(stage => {
          const count = stageGroups[stage]?.length || 0;
          if (count === 0 && selectedStage !== stage) return null;
          return (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border",
                selectedStage === stage
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              )}
            >
              {stage} ({count})
            </button>
          );
        })}
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-4 h-full min-w-max px-1">
          {visibleStages.map(stage => {
            const cards = stageGroups[stage] || [];
            return (
              <div
                key={stage}
                className={cn(
                  "flex flex-col w-72 shrink-0 rounded-xl border-2 overflow-hidden",
                  STAGE_COLORS[stage]
                )}
              >
                {/* Stage Header */}
                <div className="px-4 py-3 border-b border-border/50 bg-background/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold truncate">{stage}</h3>
                    <span className="text-xs font-bold bg-foreground/10 px-2 py-0.5 rounded-full">{cards.length}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                  {cards.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground">No students</div>
                  )}
                  {cards.map(card => (
                    <div
                      key={card.id}
                      onClick={() => navigate(`/leads/${card.leadId}`)}
                      className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-primary/30"
                    >
                      {/* Name & Risk */}
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-semibold truncate flex-1 group-hover:text-primary transition-colors">
                          {card.studentName}
                        </h4>
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-2 shrink-0", RISK_BADGE[card.riskLevel])}>
                          {card.riskLevel}
                        </span>
                      </div>

                      {/* Owner & Wait Time */}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
                        <span className="flex items-center gap-1 truncate">
                          <Users className="w-3 h-3" /> {card.ownerName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {card.waitingHours < 24
                            ? `${card.waitingHours}h`
                            : `${Math.floor(card.waitingHours / 24)}d`}
                        </span>
                      </div>

                      {/* Probability bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-muted-foreground">Admission</span>
                          <span className="font-semibold">{Math.round(card.admissionProbability)}%</span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              card.admissionProbability > 60 ? 'bg-emerald-500' :
                              card.admissionProbability > 30 ? 'bg-amber-500' : 'bg-red-500'
                            )}
                            style={{ width: `${Math.min(card.admissionProbability, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Next Action */}
                      <div className="flex items-center gap-1.5 text-[10px] text-primary font-medium bg-primary/5 px-2 py-1 rounded-md">
                        <Zap className="w-3 h-3" />
                        <span className="truncate">{card.nextAction}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
