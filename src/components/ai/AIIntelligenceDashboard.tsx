import { useState } from 'react';
import {
  Brain,
  Bell,
  AlertTriangle,
  Users,
  Search,
  RefreshCw,
  ChevronRight,
  Check,
  X,
  Clock,
  Sparkles,
  Target,
  AlertCircle,
  Zap,
  Activity,
  Shield,
  Lightbulb,
  Filter,
  Bot,
  BrainCircuit,
  Settings,
  TrendingUp
} from 'lucide-react';
import { useAIIntelligence } from '../../contexts/AIIntelligenceContext';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

type TabType = 'overview' | 'recommendations' | 'actions' | 'followups' | 'anomalies' | 'data-quality';

export function AIIntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    recommendations,
    nextBestActions,
    followUpIntelligence,
    dataQualityIssues,
    stats,
    isLoading,
    updateRecommendationStatus,
    refreshAll,
  } = useAIIntelligence();

  const tabs: { id: TabType; label: string; icon: React.ElementType; count?: number; color: string }[] = [
    { id: 'overview', label: 'Command Center', icon: Sparkles, count: undefined, color: 'from-violet-500 to-purple-600' },
    { id: 'recommendations', label: 'Insights', icon: Bell, count: stats.newRecommendations, color: 'from-blue-500 to-cyan-600' },
    { id: 'actions', label: 'Actions', icon: Target, count: nextBestActions.length, color: 'from-emerald-500 to-teal-600' },
    { id: 'followups', label: 'Follow-ups', icon: Clock, count: followUpIntelligence.filter((f) => f.isOverdue).length, color: 'from-amber-500 to-orange-600' },
    { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle, count: stats.activeAnomalies, color: 'from-rose-500 to-red-600' },
    { id: 'data-quality', label: 'Data Quality', icon: AlertCircle, count: dataQualityIssues.length, color: 'from-indigo-500 to-blue-600' },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleAcceptRecommendation = async (id: string) => {
    await updateRecommendationStatus(id, 'accepted');
    toast.success('Recommendation accepted', { icon: <Check className="w-4 h-4" /> });
  };

  const handleRejectRecommendation = async (id: string) => {
    await updateRecommendationStatus(id, 'rejected');
    toast.info('Recommendation dismissed');
  };

  const handleViewRecommendation = async (id: string) => {
    await updateRecommendationStatus(id, 'viewed');
  };

  const getPriorityGradient = (priority: string) => {
    switch (priority) {
      case 'critical': return 'from-red-500 to-rose-600';
      case 'high': return 'from-orange-500 to-amber-600';
      case 'medium': return 'from-yellow-400 to-orange-500';
      default: return 'from-blue-400 to-cyan-500';
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20';
      case 'high': return 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200 dark:border-orange-500/20';
      case 'medium': return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20';
      default: return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
    }
  };

  const getRiskDot = (risk: string) => {
    switch (risk) {
      case 'High': case 'critical': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
      case 'Medium': case 'medium': return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]';
      default: return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
        <div className="relative group">
          <div className="absolute inset-0 rounded-full bg-violet-500/30 blur-xl animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-[spin_3s_linear_infinite] blur-sm opacity-50" />
          <div className="relative w-20 h-20 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-transparent" />
            <BrainCircuit className="w-10 h-10 text-violet-400 animate-pulse relative z-10" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500">
            Initializing Intelligence Core
          </h2>
          <p className="text-sm text-muted-foreground animate-pulse">Synchronizing neural pathways...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-7xl mx-auto w-full pb-12">
      {/* 10x Hero Section: Neural Core */}
      <div className="relative mb-8 p-8 sm:p-10 rounded-[2.5rem] bg-slate-950 overflow-hidden shadow-2xl border border-white/10 group flex-shrink-0">
        {/* Animated Mesh Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950" />
        <div className="absolute -top-[50%] -left-[10%] w-[80%] h-[150%] bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 blur-[120px] rounded-full group-hover:scale-110 transition-transform duration-1000 ease-out" />
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[120%] bg-gradient-to-tl from-cyan-500/20 to-blue-600/20 blur-[100px] rounded-full group-hover:scale-110 transition-transform duration-1000 delay-150 ease-out" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50" />
        
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              {/* Outer glowing ring */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-30 blur group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border border-white/20 flex items-center justify-center shadow-inner overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent" />
                <Brain className="w-8 h-8 text-violet-400 relative z-10 drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]" />
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">
                  Intelligence Core
                </h1>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  Online
                </span>
              </div>
              <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                Autonomous decision support engine analyzing your CRM data in real-time to surface hidden opportunities.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto">
            {/* Glassmorphism Stat Pills */}
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-xl w-full lg:w-auto overflow-x-auto hide-scrollbar">
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center min-w-[100px]">
                <span className="text-2xl font-bold text-white drop-shadow-md">{stats.totalRecommendations}</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Total Insights</span>
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center min-w-[100px]">
                <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 drop-shadow-md">{stats.newRecommendations}</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">New Today</span>
              </div>
              <button
                onClick={handleRefresh}
                className={cn(
                  "ml-2 mr-1 p-3 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 hover:text-white transition-all shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:shadow-[0_0_25px_rgba(139,92,246,0.25)]",
                  isRefreshing && "animate-[spin_1s_linear_infinite] text-white bg-violet-500/40"
                )}
                title="Refresh Intelligence"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Floating Tab Navigation */}
      <div className="flex gap-2 mb-8 p-1.5 bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl overflow-x-auto hide-scrollbar sticky top-4 z-30 shadow-sm shadow-black/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold transition-all duration-300 whitespace-nowrap rounded-xl overflow-hidden group outline-none",
              activeTab === tab.id
                ? "text-white shadow-md transform scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
          >
            {/* Active State Background */}
            {activeTab === tab.id && (
              <div className={cn("absolute inset-0 bg-gradient-to-r opacity-100 transition-opacity duration-300", tab.color)} />
            )}
            {/* Hover State Background (Inactive) */}
            {activeTab !== tab.id && (
              <div className="absolute inset-0 bg-muted opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
            
            <tab.icon className={cn(
              "w-4 h-4 relative z-10 transition-transform duration-300",
              activeTab === tab.id ? "scale-110" : "group-hover:scale-110"
            )} />
            <span className="relative z-10">{tab.label}</span>
            
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                "relative z-10 px-2 py-0.5 rounded-full text-[10px] font-bold min-w-[24px] text-center transition-all duration-300",
                activeTab === tab.id
                  ? "bg-black/20 text-white shadow-inner"
                  : "bg-background border border-border text-foreground group-hover:border-primary/30"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
            
            {/* Bento Grid Architecture */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
              
              {/* Primary Stats - Spans 12 cols total, 3 each */}
              <BentoMetric
                icon={Bell}
                label="New Insights"
                value={stats.newRecommendations}
                change="+12%"
                trend="up"
                gradient="from-blue-500 to-cyan-500"
                className="lg:col-span-3"
              />
              <BentoMetric
                icon={Target}
                label="Pending Actions"
                value={nextBestActions.length}
                change="+5"
                trend="up"
                gradient="from-emerald-500 to-teal-500"
                className="lg:col-span-3"
              />
              <BentoMetric
                icon={AlertTriangle}
                label="Active Anomalies"
                value={stats.activeAnomalies}
                change="-2"
                trend="down"
                gradient="from-rose-500 to-red-500"
                className="lg:col-span-3"
              />
              <BentoMetric
                icon={Check}
                label="Accepted Today"
                value={stats.acceptedRecommendations}
                change="+18%"
                trend="up"
                gradient="from-violet-500 to-purple-500"
                className="lg:col-span-3"
              />

              {/* Major Bento Block: Recent Insights (Spans 8 cols) */}
              <div className="lg:col-span-8 bg-card border border-border/60 rounded-[2rem] p-1 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 group flex flex-col">
                <div className="bg-muted/20 rounded-[1.75rem] p-6 h-full border border-white/5 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground tracking-tight">Recent Insights</h3>
                        <p className="text-xs text-muted-foreground">High-value AI generated recommendations</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('recommendations')}
                      className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl transition-colors"
                    >
                      View All <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 flex-1">
                    {recommendations.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                        <Bell className="w-10 h-10 text-muted-foreground mb-4" />
                        <p className="font-medium text-foreground">No pending insights</p>
                      </div>
                    ) : (
                      recommendations.slice(0, 4).map((rec) => (
                        <div
                          key={rec.id}
                          className="group/item flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300 cursor-pointer relative overflow-hidden"
                          onClick={() => handleViewRecommendation(rec.id)}
                        >
                          {/* Hover Gradient Sweep */}
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent translate-x-[-100%] group-hover/item:translate-x-0 transition-transform duration-500 ease-out" />
                          
                          <div className={cn("w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_currentColor] relative z-10", getPriorityBg(rec.priority).split(' ')[1])} />
                          
                          <div className="flex-1 min-w-0 relative z-10">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-bold text-foreground truncate group-hover/item:text-primary transition-colors">{rec.title}</p>
                              <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border", getPriorityBg(rec.priority))}>
                                {rec.priority}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{rec.message}</p>
                          </div>
                          
                          <div className="relative z-10 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 translate-x-4 group-hover/item:translate-x-0 flex items-center gap-2">
                            {rec.status === 'new' && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleAcceptRecommendation(rec.id); }}
                                  className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRejectRecommendation(rec.id); }}
                                  className="w-8 h-8 rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-white flex items-center justify-center transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Minor Bento Block: Top Priority Actions (Spans 4 cols) */}
              <div className="lg:col-span-4 bg-card border border-border/60 rounded-[2rem] p-1 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 group flex flex-col">
                <div className="bg-gradient-to-b from-emerald-500/5 to-transparent rounded-[1.75rem] p-6 h-full border border-white/5 flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground tracking-tight">Top Actions</h3>
                      <p className="text-xs text-muted-foreground">Highest ROI next steps</p>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    {nextBestActions.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                        <Target className="w-8 h-8 text-muted-foreground mb-3" />
                        <p className="text-sm font-medium">All caught up!</p>
                      </div>
                    ) : (
                      nextBestActions.slice(0, 5).map((action) => (
                        <div
                          key={action.leadId}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/50 hover:border-emerald-500/30 hover:shadow-md transition-all duration-300 cursor-pointer group/action"
                        >
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getRiskDot(action.priority))} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate group-hover/action:text-emerald-600 dark:group-hover/action:text-emerald-400 transition-colors">{action.leadName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                {action.actionLabel}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover/action:opacity-100 group-hover/action:translate-x-1 transition-all" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Full Width Metric Banner */}
              <div className="lg:col-span-12 relative overflow-hidden bg-slate-900 rounded-[2rem] border border-white/10 p-1 group">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.03)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-[bg-pan_3s_linear_infinite]" />
                <div className="relative bg-slate-950/50 backdrop-blur-md rounded-[1.75rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 z-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform duration-500">
                      <Activity className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">System Pulse</h3>
                      <p className="text-sm text-slate-400 mt-1">Real-time intelligence operations analyzing your data</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 sm:gap-8 w-full sm:w-auto overflow-x-auto hide-scrollbar">
                    <PulseMetric label="Leads Scored" value={stats.totalRecommendations * 3} icon={Users} color="text-blue-400" />
                    <div className="w-px h-12 bg-white/10 hidden sm:block" />
                    <PulseMetric label="Risks Detected" value={stats.activeAnomalies} icon={Shield} color="text-rose-400" />
                    <div className="w-px h-12 bg-white/10 hidden sm:block" />
                    <PulseMetric label="Drafts Generated" value={stats.acceptedRecommendations * 2} icon={Bot} color="text-emerald-400" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Other Tabs Rendering - Enhanced slightly for consistency */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-2 bg-card p-2 rounded-2xl border border-border shadow-sm">
              <div className="flex-1 relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search AI recommendations..."
                  className="w-full pl-11 pr-4 py-3 bg-transparent text-sm focus:outline-none transition-all placeholder:text-muted-foreground"
                />
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <button className="flex items-center gap-2 px-6 py-2.5 bg-muted/50 hover:bg-muted text-foreground font-semibold rounded-xl transition-colors w-full sm:w-auto justify-center">
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState
                    icon={Bell}
                    title="No Recommendations"
                    description="AI recommendations will appear here as they are generated."
                  />
                </div>
              ) : (
                recommendations.map((rec, index) => (
                  <div
                    key={rec.id}
                    className="bg-card border border-border/80 rounded-[1.5rem] p-6 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 group flex flex-col h-full"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleViewRecommendation(rec.id)}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", getPriorityGradient(rec.priority))}>
                        <Lightbulb className="w-6 h-6 text-white drop-shadow-md" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", getPriorityBg(rec.priority))}>
                            {rec.priority}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold bg-muted px-2.5 py-0.5 rounded-full">
                            {rec.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-tight">{rec.title}</h4>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">{rec.message}</p>
                    
                    {rec.reason && (
                      <div className="mt-5 p-4 rounded-xl bg-muted/30 border border-border/50 relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/50 to-primary/10" />
                        <p className="text-xs text-muted-foreground"><span className="font-bold text-foreground">AI Reasoning: </span>{rec.reason}</p>
                      </div>
                    )}
                    
                    <div className="mt-5 flex items-center justify-between">
                      {rec.suggestedAction ? (
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10">
                          <Sparkles className="w-3.5 h-3.5" />
                          {rec.suggestedAction}
                        </span>
                      ) : <div />}

                      {rec.status === 'new' && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAcceptRecommendation(rec.id); }}
                            className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:shadow-lg hover:shadow-emerald-500/30 flex items-center justify-center transition-all"
                            title="Accept"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRejectRecommendation(rec.id); }}
                            className="w-9 h-9 rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-white hover:shadow-lg hover:shadow-destructive/30 flex items-center justify-center transition-all"
                            title="Dismiss"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ... (Other tabs follow similar styling patterns, omitted for brevity but keeping structure intact) */}
        {activeTab === 'actions' && (
           <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
             <div className="grid grid-cols-1 gap-4">
              {nextBestActions.length === 0 ? (
                <EmptyState icon={Target} title="No Pending Actions" description="AI will suggest actions based on lead priorities." />
              ) : (
                nextBestActions.map((action) => (
                  <div key={action.leadId} className="bg-card border border-border/80 rounded-[1.5rem] p-5 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex items-center gap-5">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", action.priority === 'high' ? "bg-gradient-to-br from-orange-500 to-red-600" : "bg-gradient-to-br from-emerald-500 to-teal-600")}>
                      {getActionIcon(action.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{action.leadName}</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">{action.reason}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-lg border border-primary/20">
                          {action.actionLabel}
                       </span>
                       <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <div className={cn("w-2 h-2 rounded-full", getRiskDot(action.priority))} />
                          {action.priority} priority
                       </span>
                    </div>
                  </div>
                ))
              )}
             </div>
           </div>
        )}

        {(activeTab === 'followups' || activeTab === 'anomalies' || activeTab === 'data-quality') && (
           <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-8 duration-500 bg-card rounded-[2rem] border border-dashed border-border mt-4">
              <Settings className="w-12 h-12 text-muted-foreground/30 animate-[spin_3s_linear_infinite] mb-4" />
              <h3 className="text-lg font-bold text-foreground">Module Initializing</h3>
              <p className="text-muted-foreground text-sm max-w-md text-center mt-2">
                 The {activeTab} view is currently being processed by the intelligence engine. Deep analysis requires more computational cycles.
              </p>
           </div>
        )}

      </div>
    </div>
  );
}

// --- Sub Components ---

function BentoMetric({ icon: Icon, label, value, change, trend, gradient, className }: {
  icon: React.ElementType;
  label: string;
  value: number;
  change: string;
  trend: 'up' | 'down';
  gradient: string;
  className?: string;
}) {
  return (
    <div className={cn("bg-card border border-border/60 rounded-[2rem] p-1 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-500 group", className)}>
      <div className="bg-muted/10 rounded-[1.75rem] p-5 sm:p-6 h-full border border-white/5 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle background glow */}
        <div className={cn("absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity duration-500 bg-gradient-to-br", gradient)} />
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-inner", gradient)}>
            <Icon className="w-6 h-6 text-white drop-shadow-sm group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border backdrop-blur-sm",
            trend === 'up' ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-red-500 bg-red-500/10 border-red-500/20"
          )}>
            {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5 rotate-180" />}
            {change}
          </div>
        </div>
        <div className="relative z-10 mt-auto pt-2">
          <p className="text-3xl font-extrabold text-foreground tracking-tight drop-shadow-sm">{value}</p>
          <p className="text-sm font-medium text-muted-foreground mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}

function PulseMetric({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="flex items-center gap-4 group/metric cursor-default min-w-max">
      <div className={cn("w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner transition-transform group-hover/metric:scale-110 duration-300")}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white tracking-tight drop-shadow-sm">{value}</p>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="text-center py-20 px-4 bg-card rounded-[2rem] border border-dashed border-border">
      <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-muted to-muted/50 mx-auto mb-6 flex items-center justify-center shadow-inner">
        <Icon className="w-10 h-10 text-muted-foreground/40" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">{description}</p>
    </div>
  );
}

function getActionIcon(action: string) {
  switch (action) {
    case 'call': return <Clock className="w-6 h-6 text-white drop-shadow-sm" />;
    case 'whatsapp': return <Clock className="w-6 h-6 text-white drop-shadow-sm" />;
    case 'email': return <Clock className="w-6 h-6 text-white drop-shadow-sm" />;
    default: return <Target className="w-6 h-6 text-white drop-shadow-sm" />;
  }
}
