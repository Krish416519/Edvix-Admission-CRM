import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download } from 'lucide-react';

interface AIReportProps {
  report: {
    report_id: string;
    type: 'bar_chart' | 'line_chart' | 'table';
    title: string;
    data: any[];
  }
}

export function AIReportRenderer({ report }: AIReportProps) {
  
  if (!report || !report.data) return null;

  return (
    <div className="w-full bg-card border border-border rounded-xl p-4 mt-2 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-foreground">{report.title}</h4>
        <button className="flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 text-muted-foreground px-2 py-1 rounded transition-colors">
          <Download className="w-3.5 h-3.5" /> Export PDF
        </button>
      </div>

      <div className="h-64 w-full">
        {report.type === 'bar_chart' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.5)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="conversions" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {report.type === 'line_chart' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={report.data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.5)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={3} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {report.type === 'table' && (
           <div className="overflow-x-auto w-full h-full">
             <table className="w-full text-sm text-left">
               <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                 <tr>
                   {Object.keys(report.data[0] || {}).map(key => (
                     <th key={key} className="px-4 py-2">{key}</th>
                   ))}
                 </tr>
               </thead>
               <tbody>
                 {report.data.map((row, i) => (
                   <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="px-4 py-2 text-foreground">{String(val)}</td>
                      ))}
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}
      </div>
    </div>
  );
}
