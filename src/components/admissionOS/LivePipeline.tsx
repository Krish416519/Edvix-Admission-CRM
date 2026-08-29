import { useState, useMemo, useEffect } from 'react';
import { LeadsList } from '../leads/LeadsList';
import { useSmartView } from '../../hooks/useSmartView';
import { SMART_VIEWS, SmartViewId } from '../../constants/smartViews';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { STATUS_COLORS } from '../../constants/pipelineStages';
import type { StageCount } from '../../hooks/useSmartView';

interface SavedViewConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  visible_in_ui: boolean;
  order_index: number;
}

export function LivePipeline() {
  const [activeView, setActiveView] = useState<SmartViewId>('all_leads_overview');
  const [savedConfigs, setSavedConfigs] = useState<Map<string, SavedViewConfig>>(new Map());

  const { leads, totalCount, isLoading, error, stageCounts } = useSmartView(activeView, {
    pageSize: 1000,
    sort: { field: 'createdAt', direction: 'desc' },
  });

  useEffect(() => {
    const loadConfig = async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'smart_views_config')
        .maybeSingle();

      if (!error && data?.value && Array.isArray(data.value)) {
        const configMap = new Map<string, SavedViewConfig>();
        (data.value as SavedViewConfig[]).forEach(v => {
          configMap.set(v.id, v);
        });
        setSavedConfigs(configMap);
      }
    };
    loadConfig();
  }, []);

  const visibleViews = useMemo(() => {
    const filtered = SMART_VIEWS.filter(sv => {
      const cfg = savedConfigs.get(sv.id);
      if (!cfg) return true; // Default to visible if no config
      return cfg.enabled && cfg.visible_in_ui;
    });
    // Sort by order_index from config, fall back to SMART_VIEWS order
    return filtered.sort((a, b) => {
      const aCfg = savedConfigs.get(a.id);
      const bCfg = savedConfigs.get(b.id);
      if (!aCfg && !bCfg) return 0;
      if (!aCfg) return 1;
      if (!bCfg) return -1;
      return aCfg.order_index - bCfg.order_index;
    });
  }, [savedConfigs]);

  const activeViewConfig = useMemo(() => {
    return SMART_VIEWS.find(v => v.id === activeView) || SMART_VIEWS[0];
  }, [activeView]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* View Header */}
      <div className="p-4 border-b border-border/40">
        <h1 className="text-2xl font-bold">Smart View</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-sm text-muted-foreground">
            {activeViewConfig.description}
          </p>
          {totalCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              {totalCount} leads
            </span>
          )}
        </div>
      </div>

      {/* View Tabs - only show visible views from config */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-border/40 scrollbar-hide">
        {visibleViews.map((sv) => (
          <button
            key={sv.id}
            onClick={() => setActiveView(sv.id)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap",
              activeView === sv.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card text-muted-foreground hover:bg-muted border border-border"
            )}
          >
            {sv.name}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 p-4">
        {error && (
          <div className="text-center text-red-500 py-8">
            Error: {error}
          </div>
        )}
        {activeView === 'all_leads_overview' ? (
          <>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Total Summary */}
                <div className="bg-card border border-border rounded-xl p-6 mb-6">
                  <h2 className="text-lg font-semibold text-foreground mb-2">All Leads — Stage Overview</h2>
                  <p className="text-3xl font-bold text-primary">{totalCount.toLocaleString()} Total Leads</p>
                </div>

                {/* Stage Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {stageCounts.map((sc: StageCount) => (
                    <div
                      key={sc.stage}
                      className={cn(
                        "border rounded-xl p-4 flex flex-col items-center justify-center text-center",
                        STATUS_COLORS[sc.stage] || 'bg-card border-border'
                      )}
                    >
                      <span className="text-sm font-semibold mb-1 truncate">{sc.stage}</span>
                      <span className="text-2xl font-bold">{sc.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Leads list for this view if any */}
                {leads.length > 0 && (
                  <LeadsList
                    key={`smart-view-${activeView}-list`}
                    showSmartStages={false}
                    externalLeads={leads}
                    externalTotalCount={totalCount}
                    externalLoading={isLoading}
                  />
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {leads.length === 0 && !isLoading && !error && (
              <div className="text-center text-muted-foreground py-12">
                No leads found
              </div>
            )}
            {leads.length > 0 && (
              <LeadsList
                key={`smart-view-${activeView}`}
                showSmartStages={false}
                externalLeads={leads}
                externalTotalCount={totalCount}
                externalLoading={isLoading}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
