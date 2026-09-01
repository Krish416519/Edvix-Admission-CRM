import { useState } from 'react';
import { useUniversityResponses } from '../../hooks/useUniversityOps';
import { Inbox, CheckCircle2, Clock, AlertTriangle, Search, MessageSquare, Mail, Terminal, Link, Building2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/Skeleton';

import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export function UniversityResponseInbox() {
  const { responses, isLoading, markActioned } = useUniversityResponses();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Unread');
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);

  const getSourceIcon = (source: string) => {
    switch(source) {
      case 'Email': return <Mail className="w-4 h-4" />;
      case 'API': return <Terminal className="w-4 h-4" />;
      case 'Webhook': return <Link className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'Urgent': return 'text-red-600 bg-red-100 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/20';
      case 'High': return 'text-orange-600 bg-orange-100 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/20';
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-500/20 dark:text-slate-400 border-slate-200 dark:border-slate-500/20';
    }
  };

  const filteredResponses = responses.filter(r => {
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesSearch = !searchTerm || 
      r.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.universityName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleMarkActioned = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markActioned(id);
      toast.success('Marked as actioned');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">University Responses</h1>
          <p className="text-muted-foreground mt-1 text-sm">Review and action updates from university partners</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search subject or university..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-3 pr-8 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all appearance-none text-foreground"
          >
            <option value="All">All</option>
            <option value="Unread">Unread</option>
            <option value="Read">Read</option>
            <option value="In Progress">In Progress</option>
            <option value="Actioned">Actioned</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Inbox List */}
        <div className="w-full md:w-1/3 border-r border-border overflow-y-auto max-h-[600px]">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground text-sm">No responses found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredResponses.map(response => (
                <div 
                  key={response.id}
                  onClick={() => setSelectedResponse(response.id)}
                  className={cn(
                    "p-4 cursor-pointer hover:bg-muted/50 transition-colors border-l-2",
                    selectedResponse === response.id 
                      ? "bg-primary/5 border-primary" 
                      : response.status === 'Unread' 
                        ? "bg-background border-blue-500" 
                        : "bg-background border-transparent"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-primary truncate pr-2">
                      {response.universityName}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(response.receivedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <h4 className={cn("text-sm mb-1 line-clamp-1", response.status === 'Unread' ? 'font-bold text-foreground' : 'font-medium text-foreground/80')}>
                    {response.subject || 'No Subject'}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium flex items-center gap-1", getPriorityColor(response.priority))}>
                      {response.priority}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {getSourceIcon(response.source)} {response.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail View */}
        <div className="w-full md:w-2/3 bg-background flex flex-col">
          {selectedResponse ? (
            (() => {
              const r = responses.find(x => x.id === selectedResponse);
              if (!r) return null;
              
              return (
                <div className="flex flex-col h-full animate-in fade-in">
                  <div className="p-6 border-b border-border bg-card">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-foreground">{r.subject || 'No Subject'}</h2>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", getPriorityColor(r.priority))}>
                          {r.priority}
                        </span>
                      </div>
                      {r.status !== 'Actioned' && (
                        <button 
                          onClick={(e) => handleMarkActioned(r.id, e)}
                          className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Mark Actioned
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-4 h-4" /> 
                        <span className="font-medium text-foreground">{r.universityName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {getSourceIcon(r.source)}
                        <span>Received via {r.source}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(r.receivedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 overflow-y-auto whitespace-pre-wrap text-sm text-foreground/90 bg-background">
                    {r.body || <span className="text-muted-foreground italic">No content provided in this response.</span>}
                  </div>
                  
                  {r.requiredAction && (
                    <div className="p-4 m-6 mt-0 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-lg">
                      <h4 className="text-sm font-bold text-orange-800 dark:text-orange-400 flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" /> Action Required
                      </h4>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        {r.requiredAction}
                        {r.actionDeadline && (
                          <span className="block mt-1 font-medium">
                            Due by: {new Date(r.actionDeadline).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
              <Inbox className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a response to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
