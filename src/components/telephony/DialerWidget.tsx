import React, { useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, UserPlus, X, Save, Calendar, Tag, ChevronDown } from 'lucide-react';
import { useTelephony } from '../../contexts/TelephonyContext';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { CALL_OUTCOMES, CALL_TAGS, CallOutcome, CallTag } from '../../types/telephony';
import { useAuth } from '../../contexts/AuthContext';

export function DialerWidget() {
  const { activeCall, isDialerOpen, setIsDialerOpen, isMuted, toggleMute, isOnHold, toggleHold, callDuration, endCall, makeCall } = useTelephony();
  
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<CallTag[]>([]);
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [manualNumber, setManualNumber] = useState('');
  const { user } = useAuth();

  if (!isDialerOpen && !activeCall) return null;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (activeCall?.status === 'in-progress' || activeCall?.status === 'ringing' || activeCall?.status === 'initiated') {
      endCall(); // Will trigger outcome form
    } else {
      setIsDialerOpen(false); // Just close if already completed
    }
  };

  const handleSaveOutcome = async () => {
    if (!outcome) {
      toast.error('Please select a call outcome');
      return;
    }
    await endCall(outcome, notes, selectedTags, nextFollowUp ? new Date(nextFollowUp).toISOString() : undefined);
    toast.success('Call logged successfully');
    
    // Reset state
    setOutcome('');
    setNotes('');
    setSelectedTags([]);
    setNextFollowUp('');
  };

  const toggleTag = (tag: CallTag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Get initials for avatar
  const initials = activeCall?.leadName 
    ? activeCall.leadName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'L';

  const handleManualCall = () => {
    if (!manualNumber) return;
    if (user) {
      makeCall({
        to: manualNumber,
        counselorId: user.id
      });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-card border border-border shadow-2xl rounded-2xl z-50 overflow-visible flex flex-col animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className={cn(
        "px-4 py-3 flex justify-between items-center text-white rounded-t-2xl",
        activeCall?.status === 'in-progress' ? "bg-emerald-600" :
        activeCall?.status === 'ringing_counselor' || activeCall?.status === 'ringing_lead' || activeCall?.status === 'ringing' || activeCall?.status === 'initiated' ? "bg-blue-600 animate-pulse" :
        activeCall?.status === 'failed' ? "bg-red-600" :
        "bg-primary"
      )}>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" />
          <span className="font-semibold text-sm">
            {activeCall?.status === 'in-progress' ? 'Active Call' : 
             activeCall?.status === 'ringing_counselor' ? 'Ringing Your Phone...' :
             activeCall?.status === 'ringing_lead' ? 'Connecting to Lead...' :
             activeCall?.status === 'ringing' || activeCall?.status === 'initiated' ? 'Calling...' : 
             activeCall?.status === 'completed' || activeCall?.status === 'missed' ? 'Call Ended' : 'Dialer'}
          </span>
        </div>
        <button onClick={() => setIsDialerOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col items-center">
        {!activeCall ? (
          <div className="w-full flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border-2 border-primary/20">
              <Phone className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-4">Manual Dialer</h3>
            <div className="w-full space-y-3">
              <input 
                type="tel" 
                placeholder="Enter phone number..." 
                value={manualNumber}
                onChange={e => setManualNumber(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button 
                onClick={handleManualCall}
                disabled={!manualNumber}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                <Phone className="w-5 h-5 fill-current" />
                Call Number
              </button>
            </div>
          </div>
        ) : activeCall.status !== 'completed' && activeCall.status !== 'missed' && activeCall.status !== 'failed' ? (
          <>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3 border-2 border-primary/20">
              <span className="text-xl font-bold text-primary">
                {initials}
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1 text-center truncate w-full">
              {activeCall.leadName || 'Unknown Lead'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4 font-medium">
              {activeCall.leadPhone || 'Unknown Number'}
            </p>
            
            <p className="text-muted-foreground font-mono text-xl mb-6 bg-muted px-4 py-1.5 rounded-full font-semibold">
              {formatDuration(callDuration)}
            </p>
            
            {/* Call Controls */}
            <div className="flex gap-4 mb-6">
              <button 
                onClick={toggleMute}
                title="Mute"
                className={cn("p-4 rounded-full transition-colors", isMuted ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-muted text-foreground hover:bg-muted/80")}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={handleEndCall}
                title="End Call"
                className="p-5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md shadow-red-500/20"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button 
                onClick={toggleHold}
                title="Hold"
                className={cn("p-4 rounded-full transition-colors", isOnHold ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30" : "bg-muted text-foreground hover:bg-muted/80")}
              >
                {isOnHold ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="w-full pt-4 border-t border-border flex justify-around">
              <button className="text-xs font-medium flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                <div className="p-2 rounded-lg bg-muted"><UserPlus className="w-4 h-4" /></div>
                Transfer
              </button>
            </div>
          </>
        ) : (
          <div className="w-full space-y-4">
            <div className="text-center mb-2">
              <h3 className="font-semibold text-foreground">Log Call Outcome</h3>
              <p className="text-xs text-muted-foreground font-mono">Duration: {formatDuration(callDuration)}</p>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground"/> Outcome *</label>
              <select 
                value={outcome}
                onChange={e => setOutcome(e.target.value as CallOutcome)}
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                required
              >
                <option value="">Select Outcome...</option>
                {CALL_OUTCOMES.map(o => (
                   <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 relative">
              <label className="text-xs font-medium text-foreground flex justify-between items-center">
                 <span className="flex items-center gap-1"><Tag className="w-3 h-3 text-muted-foreground"/> Tags</span>
                 <button type="button" onClick={() => setShowTagsDropdown(!showTagsDropdown)} className="text-[10px] text-primary flex items-center">
                   {selectedTags.length} selected <ChevronDown className="w-3 h-3 ml-0.5" />
                 </button>
              </label>
              
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedTags.map(tag => (
                    <span key={tag} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                      {tag} <X className="w-3 h-3 cursor-pointer" onClick={() => toggleTag(tag)} />
                    </span>
                  ))}
                </div>
              )}

              {showTagsDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border shadow-lg rounded-md z-10 max-h-40 overflow-y-auto p-1">
                  {CALL_TAGS.map(tag => (
                    <div 
                      key={tag} 
                      onClick={() => {toggleTag(tag); setShowTagsDropdown(false);}}
                      className={cn("text-xs px-2 py-1.5 rounded cursor-pointer hover:bg-muted", selectedTags.includes(tag) ? "bg-primary/5 text-primary font-medium" : "text-foreground")}
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground flex items-center gap-1"><Calendar className="w-3 h-3 text-muted-foreground"/> Next Follow-up</label>
              <input 
                type="datetime-local" 
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Notes</label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Key takeaways..."
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary h-20 resize-none"
              />
            </div>

            <button 
              onClick={handleSaveOutcome}
              className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-md shadow-sm hover:bg-primary/90 flex justify-center items-center gap-2 transition-colors mt-2"
            >
              <Save className="w-4 h-4" /> Save Log
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
