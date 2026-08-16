import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Target, Users, PhoneCall, CheckCircle } from 'lucide-react';

const funnelData = [
  { name: 'New Leads', value: 1000 },
  { name: 'Attempted', value: 850 },
  { name: 'Connected', value: 600 },
  { name: 'Interested', value: 300 },
  { name: 'Qualified', value: 150 },
  { name: 'Converted', value: 50 },
];

const dispositionOutcomes = [
  { name: 'Call Back Requested', value: 400, color: '#3b82f6' },
  { name: 'Not Interested', value: 300, color: '#ef4444' },
  { name: 'Invalid Number', value: 100, color: '#6b7280' },
  { name: 'Already Enrolled', value: 50, color: '#f59e0b' },
];

export function DispositionAnalytics() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <Target className="w-5 h-5 text-blue-500" />
            <span className="font-medium">Total Leads</span>
          </div>
          <div className="text-2xl font-bold">1,000</div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <PhoneCall className="w-5 h-5 text-amber-500" />
            <span className="font-medium">Attempted</span>
          </div>
          <div className="text-2xl font-bold">850 <span className="text-sm font-normal text-muted-foreground">(85%)</span></div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <Users className="w-5 h-5 text-purple-500" />
            <span className="font-medium">Connected</span>
          </div>
          <div className="text-2xl font-bold">600 <span className="text-sm font-normal text-muted-foreground">(70%)</span></div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-muted-foreground">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-medium">Converted</span>
          </div>
          <div className="text-2xl font-bold">50 <span className="text-sm font-normal text-muted-foreground">(5%)</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h3 className="font-bold text-lg mb-6">Disposition Funnel</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <RechartsTooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h3 className="font-bold text-lg mb-6">Disposition Outcomes</h3>
          <div className="h-80 flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dispositionOutcomes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dispositionOutcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {dispositionOutcomes.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
