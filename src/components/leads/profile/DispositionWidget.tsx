import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { dispositionService } from '../../../lib/dispositionService';
import { DispositionCategory, Disposition, SubDisposition, NextAction } from '../../../types/disposition';
import { toast } from 'sonner';
import { Calendar, Clock, FileText, CheckCircle2 } from 'lucide-react';

interface DispositionWidgetProps {
  leadId: string;
  currentStatus: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function DispositionWidget({ leadId, currentStatus, onSaved, onCancel }: DispositionWidgetProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<DispositionCategory[]>([]);
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [subDispositions, setSubDispositions] = useState<SubDisposition[]>([]);
  const [nextActions, setNextActions] = useState<NextAction[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDisposition, setSelectedDisposition] = useState<string>('');
  const [selectedSubDisposition, setSelectedSubDisposition] = useState<string>('');
  const [selectedNextAction, setSelectedNextAction] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [followUpTime, setFollowUpTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [lostReason, setLostReason] = useState<string>('');
  const [competitor, setCompetitor] = useState<string>('');

  const activeDisposition = dispositions.find(d => d.id === selectedDisposition);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await dispositionService.getCategories();
      setCategories(cats);
    } catch (err) {
      toast.error('Failed to load disposition configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = async (catId: string) => {
    setSelectedCategory(catId);
    setSelectedDisposition('');
    setSelectedSubDisposition('');
    setSelectedNextAction('');
    setDispositions([]);
    setSubDispositions([]);
    setNextActions([]);

    if (!catId) return;
    try {
      const disps = await dispositionService.getDispositions(catId);
      setDispositions(disps);
    } catch (err) {
      toast.error('Failed to load dispositions');
    }
  };

  const handleDispositionChange = async (dispId: string) => {
    setSelectedDisposition(dispId);
    setSelectedSubDisposition('');
    setSelectedNextAction('');
    setSubDispositions([]);
    setNextActions([]);

    if (!dispId) return;
    try {
      const [subs, actions] = await Promise.all([
        dispositionService.getSubDispositions(dispId),
        dispositionService.getNextActions(dispId)
      ]);
      setSubDispositions(subs);
      setNextActions(actions);
    } catch (err) {
      toast.error('Failed to load options for this disposition');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selectedDisposition) {
      toast.error('Please select a disposition');
      return;
    }

    if (activeDisposition?.requires_follow_up && (!followUpDate || !followUpTime)) {
      toast.error('Follow-up date and time are required');
      return;
    }

    if (activeDisposition?.requires_note && (!notes || notes.trim() === '')) {
      toast.error('Notes are required for this disposition');
      return;
    }

    if (activeDisposition?.target_status === 'Lost' && (!lostReason || lostReason.trim() === '')) {
      toast.error('Lost Reason is required when marking a lead as Lost');
      return;
    }

    setIsSaving(true);
    try {
      let followUpAt = undefined;
      if (followUpDate && followUpTime) {
        followUpAt = new Date(`${followUpDate}T${followUpTime}`).toISOString();
      }

      await dispositionService.submitDisposition({
        leadId,
        dispositionId: selectedDisposition,
        subDispositionId: selectedSubDisposition || undefined,
        nextActionId: selectedNextAction || undefined,
        notes: notes || undefined,
        followUpAt,
        userId: user.id,
        lostReason: activeDisposition?.target_status === 'Lost' ? lostReason : undefined,
        competitor: activeDisposition?.target_status === 'Lost' ? competitor : undefined
      });

      toast.success('Disposition saved successfully');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save disposition');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Loading...</div>;
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 sm:p-5">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
        <h3 className="font-bold text-lg flex items-center gap-2">
          Update Disposition
        </h3>
        <span className="text-sm px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full font-medium">
          Status: {currentStatus}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Category *</label>
            <select 
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              required
            >
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Disposition *</label>
            <select 
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50"
              value={selectedDisposition}
              onChange={(e) => handleDispositionChange(e.target.value)}
              required
              disabled={!selectedCategory}
            >
              <option value="">Select Disposition</option>
              {dispositions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        {subDispositions.length > 0 && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-sm font-medium text-foreground">Sub-Disposition</label>
            <select 
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              value={selectedSubDisposition}
              onChange={(e) => setSelectedSubDisposition(e.target.value)}
            >
              <option value="">None</option>
              {subDispositions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {nextActions.length > 0 && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-sm font-medium text-foreground">Next Action</label>
            <select 
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              value={selectedNextAction}
              onChange={(e) => setSelectedNextAction(e.target.value)}
              required={activeDisposition?.next_action_required}
            >
              <option value="">None</option>
              {nextActions.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
        )}

        {/* Dynamic Fields based on active disposition */}
        {activeDisposition && (
          <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
            {activeDisposition.requires_follow_up && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-primary/5 p-3 rounded-lg border border-primary/10">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Follow-up Date *
                  </label>
                  <input 
                    type="date"
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Follow-up Time *
                  </label>
                  <input 
                    type="time"
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> 
                Notes {activeDisposition.requires_note && <span className="text-destructive">*</span>}
              </label>
              <textarea 
                className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[80px] resize-y"
                placeholder={activeDisposition.requires_note ? "Please provide details..." : "Add any additional context..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required={activeDisposition.requires_note}
              />
            </div>

            {activeDisposition.target_status === 'Lost' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 bg-destructive/5 p-3 rounded-lg border border-destructive/20">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Lost Reason <span className="text-destructive">*</span></label>
                  <select
                    className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)}
                    required
                  >
                    <option value="">Select Reason</option>
                    <option value="Budget Issue">Budget Issue</option>
                    <option value="Eligibility Issue">Eligibility Issue</option>
                    <option value="Chose Offline Program">Chose Offline Program</option>
                    <option value="Competitor Selected">Competitor Selected</option>
                    <option value="Duplicate Lead">Duplicate Lead</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Competitor (if applicable)</label>
                  <input
                    type="text"
                    className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="E.g., University X"
                    value={competitor}
                    onChange={(e) => setCompetitor(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-border mt-4">
          <button 
            type="button" 
            onClick={onCancel}
            className="flex-1 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={isSaving || !selectedDisposition}
            className="flex-1 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Save Disposition
          </button>
        </div>
      </form>
    </div>
  );
}
