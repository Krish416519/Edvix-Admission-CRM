import { useState } from 'react';
import { Search, Filter, Plus, Megaphone, MoreHorizontal, Play, Pause, Trash2, Copy, Loader2 } from 'lucide-react';
import { useMarketing } from '../../hooks/useMarketing';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../lib/utils';

export function CampaignsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const { campaigns, loading } = useMarketing();
  
  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.platform.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Manage all your ad campaigns, email blasts, and organic channels.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-180px)]">
        <div className="p-4 border-b border-border flex gap-4 bg-muted/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search campaigns by name or platform..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          <button className="px-4 py-2 bg-background border border-border text-foreground font-medium rounded-lg shadow-sm hover:bg-muted transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCampaigns.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">Campaign Name</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium text-right">Spend</th>
                  <th className="px-6 py-3 font-medium text-right">Leads</th>
                  <th className="px-6 py-3 font-medium text-right">CPL</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCampaigns.map((camp) => {
                  const cpl = camp.metrics.leadsGenerated > 0 ? (camp.spend / camp.metrics.leadsGenerated).toFixed(0) : '0';
                  
                  return (
                    <tr key={camp.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                            camp.platform === 'Meta Ads' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                            camp.platform === 'Google Ads' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                            "bg-primary/10 text-primary border-primary/20"
                          )}>
                            <Megaphone className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{camp.name}</div>
                            <div className="text-xs text-muted-foreground">{camp.platform}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                          camp.status === 'Active' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          camp.status === 'Paused' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          "bg-muted text-muted-foreground border-border"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            camp.status === 'Active' ? "bg-emerald-500" :
                            camp.status === 'Paused' ? "bg-amber-500" : "bg-muted-foreground"
                          )} />
                          {camp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {camp.type}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-medium text-foreground">₹{camp.spend.toLocaleString('en-IN')}</div>
                        <div className="text-xs text-muted-foreground">/ ₹{camp.budget.toLocaleString('en-IN')}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-500">
                        {camp.metrics.leadsGenerated.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-foreground">
                        ₹{cpl}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {camp.status === 'Active' ? (
                            <button className="p-1.5 text-muted-foreground hover:text-amber-500 rounded-md hover:bg-amber-500/10" title="Pause">
                              <Pause className="w-4 h-4" />
                            </button>
                          ) : (
                            <button className="p-1.5 text-muted-foreground hover:text-emerald-500 rounded-md hover:bg-emerald-500/10" title="Activate">
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10" title="Duplicate">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted" title="More">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState 
                icon={Megaphone}
                title="No campaigns found"
                description={searchTerm ? "Try adjusting your search filters." : "Create your first marketing campaign to get started."}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
