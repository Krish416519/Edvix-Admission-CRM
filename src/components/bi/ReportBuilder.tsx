import { useState } from 'react';
import { useBI } from '../../contexts/BIContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { FileText, Play, Save, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ReportBuilder() {
  const { currentRange } = useBI();
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState('leads'); // leads, admissions, revenue
  const [dimension, setDimension] = useState('lead_source'); // lead_source, state, status, course
  const [results, setResults] = useState<any[]>([]);

  const handleRunReport = async () => {
    setLoading(true);
    try {
      let query;
      
      if (metric === 'leads') {
        query = supabase.from('leads').select(`id, ${dimension}`).gte('created_at', currentRange.startDate.toISOString()).lte('created_at', currentRange.endDate.toISOString());
      } else if (metric === 'admissions') {
        query = supabase.from('admissions').select(`id, ${dimension}`).gte('created_at', currentRange.startDate.toISOString()).lte('created_at', currentRange.endDate.toISOString());
      } else if (metric === 'revenue') {
        // More complex for revenue, joining tables
        toast.info('Revenue custom reports use materialized views, fetching approximate data...');
        query = supabase.from('payments').select('id, net_amount, status').eq('status', 'Paid').gte('payment_date', currentRange.startDate.toISOString()).lte('payment_date', currentRange.endDate.toISOString());
      }

      if (!query) return;

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Simple client-side aggregation for the demo
      if (metric === 'leads' || metric === 'admissions') {
        const counts = (data as any[]).reduce((acc: any, row: any) => {
          const key = row[dimension] || 'Unknown';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        
        const aggregated = Object.entries(counts)
          .map(([k, v]) => ({ dimension: k, value: v }))
          .sort((a: any, b: any) => b.value - a.value);
          
        setResults(aggregated);
      } else {
        // Revenue aggregate dummy
        const total = (data as any[]).reduce((sum, row) => sum + Number(row.net_amount || 0), 0);
        setResults([{ dimension: 'Total Selected', value: total }]);
      }

      toast.success('Report generated successfully');
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!results.length) return;
    const csv = ['Dimension,Value', ...results.map(r => `"${r.dimension}",${r.value}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Report Builder</h2>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            disabled={results.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-outline border border-border text-foreground rounded-lg font-medium hover:bg-muted">
            <Save className="w-4 h-4" /> Save Template
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col lg:flex-row gap-6">
        
        {/* Configuration Sidebar */}
        <div className="w-full lg:w-1/3 space-y-6 border-b lg:border-b-0 lg:border-r border-border pb-6 lg:pb-0 lg:pr-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Metric</label>
            <select 
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
            >
              <option value="leads">Total Leads</option>
              <option value="admissions">Total Admissions</option>
              <option value="revenue">Paid Revenue</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Group By (Dimension)</label>
            <select 
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
              disabled={metric === 'revenue'}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm disabled:opacity-50"
            >
              <option value="lead_source">Lead Source</option>
              <option value="lead_status">Status / Stage</option>
              <option value="state">Geographic State</option>
              <option value="assigned_counselor">Assigned Counselor (ID)</option>
            </select>
            {metric === 'revenue' && <p className="text-xs text-muted-foreground mt-1">Grouping disabled for simple revenue sum.</p>}
          </div>
          
          <button 
            onClick={handleRunReport}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Generate Report
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 min-h-[400px]">
          {results.length > 0 ? (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">Dimension</th>
                    <th className="px-4 py-3 font-medium text-right">Value ({metric})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{r.dimension || 'N/A'}</td>
                      <td className="px-4 py-3 text-right">
                        {metric === 'revenue' ? `₹${r.value.toLocaleString()}` : r.value.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <FileText className="w-16 h-16 opacity-20 mb-4" />
              <p>Configure your report and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
