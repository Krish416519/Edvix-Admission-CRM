
import { CallReportData } from '../../types/telephony';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface CallReportsPanelProps {
  data: CallReportData | null;
  isLoading?: boolean;
}

const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6'];

export function CallReportsPanel({ data, isLoading }: CallReportsPanelProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-muted-foreground">No report data available for this period.</div>;

  // Format Sentiment Data
  const sentimentData = Object.keys(data.sentimentDistribution).map(key => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: data.sentimentDistribution[key]
  }));

  // Format Outcome Data
  const outcomeData = Object.keys(data.outcomeDistribution).map(key => ({
    name: key,
    value: data.outcomeDistribution[key]
  })).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Call Volume */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Daily Call Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyCallVolume}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} tick={{fontSize: 12, fill: '#71717a'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#71717a'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  labelFormatter={(val) => new Date(val).toLocaleDateString()}
                />
                <Line type="monotone" dataKey="count" stroke="#E53935" strokeWidth={3} dot={{r: 4, fill: '#E53935'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Sentiment Analysis */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col">
          <h3 className="font-semibold text-foreground mb-4">AI Sentiment Analysis</h3>
          {sentimentData.length > 0 ? (
            <div className="h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.name.toLowerCase() === 'positive' ? '#10b981' :
                        entry.name.toLowerCase() === 'negative' ? '#f43f5e' : '#3b82f6'
                      } />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '8px'}} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {sentimentData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: entry.name.toLowerCase() === 'positive' ? '#10b981' : entry.name.toLowerCase() === 'negative' ? '#f43f5e' : '#3b82f6'}}></div>
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">No sentiment data</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Outcomes */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Top Call Outcomes</h3>
          {outcomeData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outcomeData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                  <XAxis type="number" tick={{fontSize: 12, fill: '#71717a'}} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{fontSize: 11, fill: '#3f3f46'}} width={100} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{borderRadius: '8px'}} />
                  <Bar dataKey="value" fill="#E53935" radius={[0, 4, 4, 0]}>
                    {outcomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No outcome data</div>
          )}
        </div>

        {/* Funnel Metrics */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Funnel Metrics</h3>
          <div className="space-y-6 pt-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Total Dials</span>
                <span className="font-semibold text-foreground">{data.totalCalls}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Connected Calls</span>
                <span className="font-semibold text-foreground">{data.completedCalls} ({data.connectionRate}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${data.connectionRate}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Missed / Failed</span>
                <span className="font-semibold text-foreground">{data.missedCalls + data.failedCalls}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: `${data.totalCalls ? ((data.missedCalls + data.failedCalls) / data.totalCalls) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
