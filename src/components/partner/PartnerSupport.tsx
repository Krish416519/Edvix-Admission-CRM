import { useState, useEffect } from 'react';
import { LifeBuoy, Plus, MessageSquare, Clock, CheckCircle2, ChevronDown, Headset, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export function PartnerSupport() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  
  // New ticket state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('General Query');
  const [priority, setPriority] = useState('Normal');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  async function loadTickets() {
    try {
      const { data, error } = await supabase
        .from('partner_support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Failed to load tickets', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      const { data: ticket, error: ticketError } = await supabase
        .from('partner_support_tickets')
        .insert([{
          partner_id: user.id,
          subject,
          category,
          priority,
          status: 'Open'
        }])
        .select()
        .single();

      if (ticketError) throw ticketError;

      const { error: msgError } = await supabase
        .from('partner_support_messages')
        .insert([{
          ticket_id: ticket.id,
          sender_id: user.id,
          message
        }]);

      if (msgError) throw msgError;

      setShowNewTicket(false);
      setSubject('');
      setMessage('');
      await loadTickets();
      toast.success('Ticket submitted successfully.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to submit ticket';
      toast.error(`Failed to submit ticket: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Closed':
      case 'Resolved':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'In Progress':
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <MessageSquare className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Closed':
      case 'Resolved':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
      case 'In Progress':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
      default:
        return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="relative">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-ping"></div>
          <div className="relative animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-900/40 via-indigo-900/40 to-background border border-border p-8">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Headset className="w-64 h-64 text-primary" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Partner Support Hub</h1>
            <p className="text-muted-foreground mt-2 max-w-xl text-lg">
              Get priority assistance with leads, commission payouts, or technical queries.
            </p>
          </div>
          <button 
            onClick={() => setShowNewTicket(!showNewTicket)} 
            className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            {showNewTicket ? 'Cancel Ticket' : <><Plus className="w-5 h-5" /> New Ticket</>}
          </button>
        </div>
      </div>

      {showNewTicket && (
        <div className="bg-card/40 backdrop-blur-2xl border border-border/50 rounded-2xl animate-in slide-in-from-top-4 overflow-hidden shadow-xl shadow-black/5">
          <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground">Submit a New Request</h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Category</label>
                  <div className="relative">
                    <select 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full appearance-none bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-500/30 transition-colors cursor-pointer"
                    >
                      <option>Commission & Payouts</option>
                      <option>Lead Query</option>
                      <option>Technical Support</option>
                      <option>Account & KYC</option>
                      <option>General Query</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Priority Level</label>
                  <div className="relative">
                    <select 
                      value={priority} 
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full appearance-none bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-500/30 transition-colors cursor-pointer"
                    >
                      <option>Normal</option>
                      <option>High</option>
                      <option>Urgent</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Subject</label>
                <input 
                  type="text" 
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-500/30 transition-colors placeholder:text-muted-foreground/50"
                  placeholder="Brief description of the issue..."
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Detailed Message</label>
                <textarea 
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:border-indigo-500/30 transition-colors placeholder:text-muted-foreground/50 custom-scrollbar"
                  placeholder="Please provide as much information as possible so our team can assist you quickly..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Submitting...</>
                  ) : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-6">
          <Search className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-xl font-semibold tracking-tight">Your Support Tickets</h3>
        </div>
        
        {tickets.length === 0 ? (
          <div className="border-2 border-dashed border-border/60 rounded-3xl bg-card/20 p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <LifeBuoy className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground tracking-tight">No support tickets</h3>
            <p className="text-muted-foreground mt-2 max-w-sm text-lg">
              You haven't created any support tickets yet. If you need help, feel free to open a new one.
            </p>
            <button 
              onClick={() => setShowNewTicket(true)} 
              className="mt-8 px-6 py-2.5 bg-background border border-border/50 text-foreground font-medium rounded-xl shadow-sm hover:border-indigo-500/50 hover:text-indigo-500 transition-colors"
            >
              Open a Ticket
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {tickets.map((ticket) => (
              <div 
                key={ticket.id} 
                className="group border border-border/50 rounded-2xl hover:border-indigo-500/50 transition-all bg-card/40 backdrop-blur-2xl cursor-pointer overflow-hidden shadow-sm hover:shadow-md hover:shadow-indigo-500/5"
              >
                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("mt-1 p-3 rounded-xl border shadow-sm", getStatusBg(ticket.status))}>
                      {getStatusIcon(ticket.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-mono font-bold text-muted-foreground bg-background px-2 py-1 rounded-md border border-border/50">
                          {ticket.ticket_number || `#${ticket.id.split('-')[0]}`}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                          {ticket.category}
                        </span>
                        {ticket.priority !== 'Normal' && (
                          <span className={cn(
                            "text-xs font-semibold px-2.5 py-1 rounded-full border",
                            ticket.priority === 'Urgent' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          )}>
                            {ticket.priority} Priority
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-semibold text-foreground group-hover:text-indigo-500 transition-colors">{ticket.subject}</h4>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">
                        Status: <span className={cn("font-bold", getStatusBg(ticket.status).split(' ')[2])}>{ticket.status}</span> • 
                        Created {new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 border border-border/50 text-sm font-semibold rounded-xl group-hover:bg-indigo-500/10 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-all bg-background w-full sm:w-auto">
                    View Thread
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
