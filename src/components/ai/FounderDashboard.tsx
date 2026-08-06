import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  Sparkles, TrendingUp, AlertOctagon, LineChart, 
  Target, Users, ShieldAlert
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line
} from 'recharts';

export function FounderDashboard() {
  const { user } = useAuth();
  
  if (user?.role !== 'Super Admin' && user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  // Mock data for charts since we need timeseries aggregation
  const revenueData = [
    { name: 'Jan', revenue: 400000 },
    { name: 'Feb', revenue: 300000 },
    { name: 'Mar', revenue: 550000 },
    { name: 'Apr', revenue: 450000 },
    { name: 'May', revenue: 700000 },
    { name: 'Jun', revenue: 850000 },
  ];

  const conversionData = [
    { name: 'Week 1', rate: 12 },
    { name: 'Week 2', rate: 15 },
    { name: 'Week 3', rate: 14 },
    { name: 'Week 4', rate: 18 },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center">
            <LineChart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Founder Briefing</h1>
            <p className="text-muted-foreground">Executive AI analysis of business health and revenue forecasts.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-lg font-medium text-sm">
          <Sparkles className="w-4 h-4" /> AI Snapshot Current as of Today
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Revenue Forecast
          </h3>
          <p className="text-3xl font-bold">₹24.5M</p>
          <p className="text-xs text-emerald-500 mt-2 font-medium">+15% expected this month</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Lead Quality Score
          </h3>
          <p className="text-3xl font-bold">84/100</p>
          <p className="text-xs text-primary mt-2 font-medium">Marketing ROI is optimizing</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Expected Admissions
          </h3>
          <p className="text-3xl font-bold">142</p>
          <p className="text-xs text-muted-foreground mt-2">Pipeline probability &gt; 70%</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4" /> Critical Risk Alerts
          </h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">3</p>
          <p className="text-xs text-red-500/80 mt-2">Admissions pending payment &gt; 14 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold mb-6">Revenue Trajectory</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="name" stroke="currentColor" className="opacity-50 text-xs" />
                  <YAxis stroke="currentColor" className="opacity-50 text-xs" />
                  <RechartsTooltip 
                    cursor={{fill: 'var(--primary)', opacity: 0.1}}
                    contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.5rem'}} 
                  />
                  <Bar dataKey="revenue" fill="currentColor" className="fill-primary" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold mb-6">Conversion Rate Trends (%)</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="name" stroke="currentColor" className="opacity-50 text-xs" />
                  <YAxis stroke="currentColor" className="opacity-50 text-xs" />
                  <RechartsTooltip 
                    contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.5rem'}} 
                  />
                  <Line type="monotone" dataKey="rate" stroke="var(--primary)" strokeWidth={3} dot={{r: 6, fill: 'var(--primary)'}} />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" /> Executive AI Advice
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-amber-500">
                  <ShieldAlert className="w-4 h-4" /> Action Required
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Counselor "Priya" is currently overloaded with 85 active leads, leading to a 14% drop in response speed. 
                  Recommend redistributing 20 leads to "Rahul" who has high conversion rates this week.
                </p>
                <button className="mt-3 text-xs bg-amber-500 text-white px-3 py-1.5 rounded hover:bg-amber-600 transition-colors">
                  Approve Reassignment
                </button>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-emerald-500">
                  <TrendingUp className="w-4 h-4" /> Growth Opportunity
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Leads from "Facebook Ads - MBA Campaign" are showing a 40% higher conversion probability than average.
                  Consider increasing budget allocation by 15% for the next 7 days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
