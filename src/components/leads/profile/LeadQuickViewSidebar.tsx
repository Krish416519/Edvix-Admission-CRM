import { useState } from 'react';
import { Lead, LeadActivity } from '../../../types/schema';
import { FileText, Plus, Sparkles, Hash, Target, User, ChevronDown, ChevronUp, Phone, MessageSquare, Mail, ShieldAlert, ArrowRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { mockActivities } from '../../../data/mockActivities';

export function LeadQuickViewSidebar({ 
  lead, 
  activities = [], 
  setActivities 
}: { 
  lead: Lead, 
  activities?: LeadActivity[], 
  setActivities?: (activities: LeadActivity[]) => void 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isNotesMinimized, setIsNotesMinimized] = useState(true);
  const [isAiInsightsMinimized, setIsAiInsightsMinimized] = useState(false);
  const [aiModalTab, setAiModalTab] = useState<'script' | 'whatsapp' | 'email' | 'objection' | null>(null);
  
  // Derive notes from activities
  const notesList = activities
    .filter(a => a.type === 'note')
    // Ensure no duplicates by ID (in case of double clicks or state issues)
    .filter((a, index, self) => index === self.findIndex((t) => t.id === a.id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    
    const newNoteActivity: LeadActivity = {
      id: `NOTE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      leadId: lead.id,
      type: 'note',
      content: noteText,
      date: new Date().toISOString(),
      author: 'Current User' // Can be replaced with actual user context later
    };

    if (setActivities) {
      setActivities([newNoteActivity, ...activities]);
    }
    
    setNoteText('');
    setIsModalOpen(false);
    toast.success('Note added');
  };

  // Next Best Action Logic
  const getNextAction = (lead: Lead) => {
    const status = (lead.leadStatus || lead.status || 'New');
    const hasAcademic = !!(lead.graduationDegree || lead.graduationPercentage);
    const hasCourse = !!lead.course;
    const lastContactDate = lead.lastFollowUp ? new Date(lead.lastFollowUp) : null;
    const daysSinceContact = lastContactDate ? Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    if (status === 'Inquiry') return { label: 'Call Student Now', desc: 'First contact — no call recorded yet.', cta: 'Add Activity' };
    if (status === 'Not Connected') return { label: 'Retry Call / WhatsApp', desc: 'Student not reached. Try again or send a WhatsApp.', cta: 'Try Again' };
    if (status === 'Cold') return { label: 'Warm Up Lead', desc: 'Previously unconnected. Re-engage with WhatsApp or email.', cta: 'Warm Up' };
    if ((status === 'Warm' || status === 'Hot') && !hasAcademic) return { label: 'Verify Eligibility', desc: "Connected but academic history isn't captured. Fill the 360° profile.", cta: 'Update Profile' };
    if ((status === 'Warm' || status === 'Hot') && !hasCourse) return { label: 'Recommend Programs', desc: 'Student eligible but no program shortlisted. Recommend courses.', cta: 'Match Courses' };
    if (daysSinceContact > 14 && status !== 'Rejected' && status !== 'Admitted' && status !== 'Closed') return { label: 'Start Re-engagement', desc: 'No response for over 14 days. Reach out again.', cta: 'Re-engage' };
    if (status === 'Hot' || status === 'Qualified') return { label: 'Schedule Follow-up', desc: 'Student is interested. Lock in a follow-up time now.', cta: 'Schedule' };
    if (status === 'Application' || status === 'Docs Pending') return { label: 'Request Missing Documents', desc: 'Application in progress. Chase pending documents.', cta: 'Request Docs' };
    if (status === 'Admitted') return { label: 'Confirm Payment Received', desc: 'Admission confirmed. Verify payment and update records.', cta: 'Verify Payment' };
    if (status === 'Rejected' || status === 'Lost') return { label: 'Schedule Re-engagement', desc: 'Lost lead. Re-engage after 30 days with updated offers.', cta: 'Set Reminder' };
    return { label: 'Review Lead Profile', desc: 'Review and update the student profile to proceed.', cta: 'Review' };
  };

  const action = getNextAction(lead);

  return (
    <div className="w-full xl:w-72 shrink-0 flex flex-col sm:flex-row xl:flex-col gap-2 sm:gap-3 xl:gap-4 min-h-0 pb-2 xl:pb-6">
      
      {/* Notes Widget */}
      <div className={cn(
        "bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm flex flex-col transition-all duration-300 sm:flex-1 xl:flex-none",
        !isNotesMinimized ? "min-h-[160px] sm:min-h-[200px] max-h-[300px] sm:max-h-[400px]" : "h-auto"
      )}>
        <div className={cn("flex items-center justify-between", !isNotesMinimized && "mb-3 sm:mb-4")}>
          <div 
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer flex-1"
            onClick={() => setIsNotesMinimized(!isNotesMinimized)}
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground text-xs sm:text-sm select-none">Notes {notesList.length > 0 && `(${notesList.length})`}</h3>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button 
              onClick={() => setIsNotesMinimized(!isNotesMinimized)}
              className="p-0.5 sm:p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
            >
              {isNotesMinimized ? <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-0.5 sm:p-1 text-primary hover:text-primary/80 transition-colors rounded-md hover:bg-primary/10"
              title="Add Note"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
        
        {!isNotesMinimized && (
          <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 pr-1">
            {notesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-20 sm:h-32 text-center text-muted-foreground animate-in fade-in duration-300">
                <p className="text-[10px] sm:text-xs">No notes added yet.</p>
                <p className="text-[9px] sm:text-[10px] mt-1">Click the <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mx-0.5" /> icon to add one.</p>
              </div>
            ) : (
              notesList.map((n) => (
                <div key={n.id} className="bg-muted/30 border border-border/50 rounded-lg p-2 sm:p-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-[11px] sm:text-xs text-foreground leading-relaxed">{n.content}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1.5 sm:mt-2 text-right">{format(new Date(n.date), 'dd MMM, hh:mm a')}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* AI Insights Card */}
      <div className="bg-gradient-to-br from-primary/5 via-primary/5 to-transparent border border-primary/20 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm relative overflow-hidden transition-all duration-300 sm:flex-1 xl:flex-none">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
        
        <div className="flex items-center justify-between mb-2 sm:mb-3 relative z-10">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-xs sm:text-sm">AI Insights</h3>
          </div>
          <button 
            onClick={() => setIsAiInsightsMinimized(!isAiInsightsMinimized)}
            className="p-0.5 sm:p-1 hover:bg-primary/10 rounded-md transition-colors text-muted-foreground"
          >
            {isAiInsightsMinimized ? <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>

        {!isAiInsightsMinimized && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="relative z-10">
              <h4 className="text-xs sm:text-sm font-bold text-foreground">{action.label}</h4>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 sm:mt-1.5 leading-relaxed">{action.desc}</p>
              <button className="mt-2 sm:mt-3 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-primary text-primary-foreground text-[11px] sm:text-xs font-semibold rounded-lg flex items-center gap-1 sm:gap-1.5 hover:bg-primary/90 transition-colors shadow-sm active:scale-95 touch-manipulation">
                {action.cta} <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
            </div>
            
            {lead.aiObjectionDetected && (
              <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-primary/10 relative z-10">
                 <h4 className="text-[11px] sm:text-xs font-bold text-amber-600 dark:text-amber-400">Objection Detected: {lead.aiObjectionDetected}</h4>
                 <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">Consider discussing flexible payment options, EMI plans, and potential scholarships to alleviate concerns.</p>
              </div>
            )}

            {/* AI Quick Action Floaters */}
            <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-primary/10 relative z-10 flex flex-wrap gap-1.5 sm:gap-2">
              <button 
                onClick={() => setAiModalTab('script')}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400 rounded-full flex items-center gap-0.5 sm:gap-1 hover:bg-green-500/20 transition-colors active:scale-95 touch-manipulation"
              >
                <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> Script
              </button>
              <button 
                onClick={() => setAiModalTab('whatsapp')}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-0.5 sm:gap-1 hover:bg-emerald-500/20 transition-colors active:scale-95 touch-manipulation"
              >
                <MessageSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> WhatsApp
              </button>
              <button 
                onClick={() => setAiModalTab('email')}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full flex items-center gap-0.5 sm:gap-1 hover:bg-blue-500/20 transition-colors active:scale-95 touch-manipulation"
              >
                <Mail className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> Email
              </button>
              <button 
                onClick={() => setAiModalTab('objection')}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full flex items-center gap-0.5 sm:gap-1 hover:bg-rose-500/20 transition-colors active:scale-95 touch-manipulation"
              >
                <ShieldAlert className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> Objections
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      {isModalOpen && (
        <>
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-md bg-card rounded-xl border border-border shadow-2xl z-50 animate-in zoom-in-95 duration-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4">Add a Note</h3>
            
            <textarea 
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type a new note here..."
              className="w-full bg-background border border-border rounded-lg p-2.5 sm:p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none min-h-[100px] sm:min-h-[120px] shadow-sm transition-all mb-3 sm:mb-4"
              autoFocus
            />
            
            <div className="flex items-center justify-end gap-2 sm:gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 touch-manipulation"
              >
                Save Note
              </button>
            </div>
          </div>
        </>
      )}

      {/* AI Counselor Modal */}
      {aiModalTab && (
        <>
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in duration-200"
            onClick={() => setAiModalTab(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-lg bg-card rounded-xl border border-border shadow-2xl z-50 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-3 sm:p-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 text-primary font-semibold text-sm sm:text-base">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                AI Counselor Suggestion
              </div>
              <button 
                onClick={() => setAiModalTab(null)}
                className="text-muted-foreground hover:text-foreground text-xs sm:text-sm font-medium"
              >
                Close
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto">
              {aiModalTab === 'script' && (
                <div>
                  <h4 className="text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-green-600"><Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> Call Script</h4>
                  <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 bg-muted/30 p-3 sm:p-4 rounded-lg border border-border/50">
                    "Hi {lead.name.split(' ')[0]}, this is your counselor from Edvix. I saw you were looking into {lead.course ? `the ${lead.course} program` : 'our programs'}. I just wanted to check if you had any questions regarding the curriculum or the fee structure? We have some great EMI options available right now."
                  </p>
                </div>
              )}
              {aiModalTab === 'whatsapp' && (
                <div>
                  <h4 className="text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-emerald-600"><MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> WhatsApp Draft</h4>
                  <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 bg-muted/30 p-3 sm:p-4 rounded-lg border border-border/50 whitespace-pre-wrap">
                    Hi {lead.name.split(' ')[0]} 👋,{'\n\n'}Here are the details for the {lead.course || 'programs'} you inquired about.{'\n\n'}✅ Duration: 2 Years{'\n'}✅ Fee: Reach out for best offers{'\n'}✅ Easy EMI available{'\n\n'}Let me know if you want to hop on a quick call! 📞
                  </p>
                </div>
              )}
              {aiModalTab === 'email' && (
                <div>
                  <h4 className="text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-blue-600"><Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> Email Draft</h4>
                  <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 bg-muted/30 p-3 sm:p-4 rounded-lg border border-border/50 whitespace-pre-wrap">
                    Subject: Your Admission Inquiry{'\n\n'}Dear {lead.name.split(' ')[0]},{'\n\n'}Thank you for exploring programs with Edvix.{'\n\n'}To proceed with your application, we would need you to upload your academic documents on our portal. Once uploaded, we can process your admission within 48 hours.{'\n\n'}Best Regards,{'\n'}Edvix Admissions Team
                  </p>
                </div>
              )}
              {aiModalTab === 'objection' && (
                <div>
                  <h4 className="text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-rose-600"><ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> Objection Handling</h4>
                  <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 bg-muted/30 p-3 sm:p-4 rounded-lg border border-border/50 whitespace-pre-wrap">
                    <strong className="text-foreground block mb-1">If they say "It's too expensive":</strong>
                    "I understand it's a significant investment, {lead.name.split(' ')[0]}. However, we offer no-cost EMI options starting at just ₹5,000/month. Additionally, this degree typically increases salary prospects by 30-40%."
                  </p>
                </div>
              )}
              <div className="mt-4 sm:mt-6 flex justify-end">
                 <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-primary-foreground rounded-lg text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors active:scale-95 touch-manipulation">
                   Copy to Clipboard
                 </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
