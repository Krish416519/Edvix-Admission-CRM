import { useState } from 'react';
import { useStudentSupportTickets } from '../../hooks/useStudentSuccess';
import { LifeBuoy, Search, AlertTriangle, Clock, CheckCircle, User } from 'lucide-react';
import { cn } from '../../lib/utils';

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: 'bg-red-500/10 text-red-600 border-red-200',
  High: 'bg-orange-500/10 text-orange-600 border-orange-200',
  Normal: 'bg-blue-500/10 text-blue-600 border-blue-200',
  Low: 'bg-gray-500/10 text-gray-600 border-gray-200',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-blue-500/10 text-blue-600',
  Assigned: 'bg-purple-500/10 text-purple-600',
  'In Progress': 'bg-amber-500/10 text-amber-600',
  'Waiting for Student': 'bg-yellow-500/10 text-yellow-600',
  'Waiting for University': 'bg-orange-500/10 text-orange-600',
  Resolved: 'bg-emerald-500/10 text-emerald-600',
  Closed: 'bg-gray-500/10 text-gray-500',
  Escalated: 'bg-red-500/10 text-red-600',
};

const ALL_STATUSES = ['Open','Assigned','In Progress','Waiting for Student','Waiting for University','Resolved','Closed','Escalated'];

export function SupportDesk() {
  const { tickets, isLoading, updateTicketStatus } = useStudentSupportTickets();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filtered = tickets.filter(t => {
    const matchSearch = !searchTerm ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'active'
        ? !['Resolved','Closed'].includes(t.status)
        : t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const openCount = tickets.filter(t => !['Resolved','Closed'].includes(t.status)).length;
  const urgentCount = tickets.filter(t => t.priority === 'Urgent' && !['Resolved','Closed'].includes(t.status)).length;

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support Desk</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {openCount} open tickets · {urgentCount} urgent
          </p>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'All Active', value: 'active', count: openCount },
          { label: 'Open', value: 'Open', count: tickets.filter(t => t.status === 'Open').length },
          { label: 'In Progress', value: 'In Progress', count: tickets.filter(t => t.status === 'In Progress').length },
          { label: 'Escalated', value: 'Escalated', count: tickets.filter(t => t.status === 'Escalated').length },
          { label: 'Resolved', value: 'Resolved', count: tickets.filter(t => t.status === 'Resolved').length },
        ].map(b => (
          <button
            key={b.value}
            onClick={() => setStatusFilter(b.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
              statusFilter === b.value
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {b.label} ({b.count})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-2 bg-background border border-input rounded-lg text-sm">
          <option value="all">All Priorities</option>
          {['Urgent','High','Normal','Low'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Tickets */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="p-4 bg-card border border-border rounded-xl animate-pulse">
              <div className="h-4 bg-muted rounded w-64 mb-2" />
              <div className="h-3 bg-muted rounded w-80" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl">
          <LifeBuoy className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-foreground font-medium">No tickets found</p>
          <p className="text-muted-foreground text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ticket => (
            <div key={ticket.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-all">
              <div className="flex items-start gap-3">
                <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", {
                  'bg-red-500': ticket.priority === 'Urgent',
                  'bg-orange-500': ticket.priority === 'High',
                  'bg-blue-500': ticket.priority === 'Normal',
                  'bg-muted-foreground': ticket.priority === 'Low',
                })} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[ticket.status] || 'bg-muted text-muted-foreground')}>
                          {ticket.status}
                        </span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", PRIORITY_COLORS[ticket.priority])}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="font-semibold text-foreground text-sm">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ticket.category} · {new Date(ticket.createdAt).toLocaleDateString()}</p>
                      {ticket.assignee && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" /> {ticket.assignee.full_name}
                        </p>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-1 shrink-0">
                      {!['Resolved','Closed'].includes(ticket.status) && (
                        <>
                          <button
                            onClick={() => updateTicketStatus(ticket.id, 'In Progress')}
                            className="px-2 py-1 text-xs bg-amber-500/10 text-amber-600 rounded-lg hover:bg-amber-500/20 transition-colors"
                          >
                            In Progress
                          </button>
                          <button
                            onClick={() => updateTicketStatus(ticket.id, 'Resolved')}
                            className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20 transition-colors"
                          >
                            Resolve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
