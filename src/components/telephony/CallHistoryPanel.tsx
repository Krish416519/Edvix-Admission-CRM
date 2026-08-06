import React, { useState } from 'react';
import { Call } from '../../types/telephony';
import { Phone, Clock, FileText, CheckCircle, XCircle, Sparkles, Play, Search, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CallDetailModal } from './CallDetailModal';
import { format } from 'date-fns';

interface CallHistoryPanelProps {
  calls: Call[];
  isLoading?: boolean;
}

export function CallHistoryPanel({ calls, isLoading = false }: CallHistoryPanelProps) {
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'missed': 
      case 'no-answer': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-orange-500" />;
      default: return <Phone className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    if (!sentiment) return null;
    const s = sentiment.toLowerCase();
    if (s === 'positive') return <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 text-[10px] px-2 py-0.5 rounded-full font-medium border border-emerald-200">Positive</span>;
    if (s === 'negative') return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 text-[10px] px-2 py-0.5 rounded-full font-medium border border-red-200">Negative</span>;
    return <span className="bg-gray-100 text-gray-700 dark:bg-gray-800 text-[10px] px-2 py-0.5 rounded-full font-medium border border-gray-200">Neutral</span>;
  };

  const filteredCalls = calls.filter(c => 
    c.leadName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.counselorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.outcome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" /> Call History
        </h2>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search calls..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary"
            />
          </div>
          <button className="p-2 border border-border rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-40 text-muted-foreground">
            <Phone className="w-10 h-10 mb-2 opacity-20" />
            <p>No calls found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredCalls.map((call) => (
              <div 
                key={call.id} 
                className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => setSelectedCall(call)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="mt-0.5">
                      {getStatusIcon(call.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{call.leadName || 'Unknown Lead'}</span>
                        <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {call.direction}
                        </span>
                        {getSentimentBadge(call.aiSentiment)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {format(new Date(call.createdAt), 'MMM d, yyyy h:mm a')}</span>
                        <span>•</span>
                        <span>{formatDuration(call.durationSeconds)}</span>
                        <span>•</span>
                        <span>By {call.counselorName}</span>
                      </div>
                    </div>
                  </div>
                  
                  {call.recordingUrl && (
                    <button className="text-primary bg-primary/10 hover:bg-primary/20 p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100" title="Play Recording">
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="ml-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {call.outcome && (
                    <div className="text-sm">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Outcome</span>
                      <span className="text-foreground">{call.outcome}</span>
                      {call.tags && call.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {call.tags.map(tag => (
                            <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(call.aiSummary || call.notes) && (
                    <div className="text-sm">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1 flex items-center gap-1">
                        {call.aiSummary ? <><Sparkles className="w-3 h-3 text-purple-500"/> AI Summary</> : <><FileText className="w-3 h-3"/> Notes</>}
                      </span>
                      <p className="text-muted-foreground line-clamp-2 text-sm">{call.aiSummary || call.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCall && (
        <CallDetailModal call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  );
}
