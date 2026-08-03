import React, { useState, useMemo, useEffect } from 'react';
import { mockAuditLogs, subscribeAuditLogs } from '../../data/mockAuditLogs';
import { ActivityTimeline } from '../shared/ActivityTimeline';
import { AuditLogDetailPanel } from '../shared/AuditLogDetailPanel';
import { AuditLog } from '../../types/audit';
import { 
  Activity, Search, Filter, Download, 
  Users, UserCheck, Edit3, ShieldAlert 
} from 'lucide-react';
import { format, isToday } from 'date-fns';

export function AuditDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('All');
  const [selectedLog, setSelectedLog] = useState<AuditLog | undefined>();
  const [logs, setLogs] = useState<AuditLog[]>(mockAuditLogs);

  useEffect(() => {
    const unsubscribe = subscribeAuditLogs((newLogs) => {
      setLogs([...newLogs]);
    });
    return unsubscribe;
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.entityId && log.entityId.toLowerCase().includes(searchTerm.toLowerCase()));
        
      const matchesEntity = entityFilter === 'All' || log.entityType === entityFilter;
      
      return matchesSearch && matchesEntity;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [searchTerm, entityFilter, logs]);

  // Analytics
  const todayLogs = logs.filter(log => isToday(new Date(log.timestamp)));
  const loginsToday = todayLogs.filter(log => log.action === 'Login').length;
  const updatesToday = todayLogs.filter(log => log.action === 'Updated').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 h-[calc(100vh-4rem)] overflow-y-auto">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Global Activity Log</h1>
          <p className="text-muted-foreground mt-1">Monitor all system actions and user activities in real-time.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-muted/50 text-foreground rounded-lg hover:bg-muted transition-colors font-medium border border-border">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-foreground">Activities Today</h3>
          </div>
          <p className="text-2xl font-bold">{todayLogs.length}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-foreground">Logins Today</h3>
          </div>
          <p className="text-2xl font-bold">{loginsToday}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <Edit3 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-foreground">Records Updated</h3>
          </div>
          <p className="text-2xl font-bold">{updatesToday}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-foreground">Security Events</h3>
          </div>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
        
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between bg-muted/5">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search by name, action, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select 
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="bg-transparent text-sm focus:outline-none"
              >
                <option value="All">All Entities</option>
                <option value="Lead">Leads</option>
                <option value="Admission">Admissions</option>
                <option value="User">Users</option>
                <option value="Task">Tasks</option>
                <option value="Settings">Settings</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-background">
          <ActivityTimeline logs={filteredLogs} onLogClick={setSelectedLog} />
        </div>
      </div>

      {selectedLog && (
        <AuditLogDetailPanel 
          log={selectedLog} 
          isOpen={!!selectedLog} 
          onClose={() => setSelectedLog(undefined)} 
        />
      )}

    </div>
  );
}
