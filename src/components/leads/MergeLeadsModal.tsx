import React, { useState } from 'react';
import { X, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { Lead } from '../../types/schema';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface MergeLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  onMerge: (primaryId: string, secondaryId: string, mergedData: Partial<Lead>) => Promise<{ success: boolean; error?: any }>;
}

export function MergeLeadsModal({ isOpen, onClose, leads, onMerge }: MergeLeadsModalProps) {
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    const lead = leads.find(l => l.id === id);
    if (lead && selectedLeads.length < 2 && !selectedLeads.find(l => l.id === id)) {
      setSelectedLeads([...selectedLeads, lead]);
      if (selectedLeads.length === 0) setPrimaryId(lead.id); // Auto-set first as primary
    }
  };

  const removeSelected = (id: string) => {
    setSelectedLeads(selectedLeads.filter(l => l.id !== id));
    if (primaryId === id) {
      setPrimaryId(selectedLeads.find(l => l.id !== id)?.id || null);
    }
  };

  const handleMerge = async () => {
    if (selectedLeads.length !== 2 || !primaryId) return;
    
    setIsMerging(true);
    const primaryLead = selectedLeads.find(l => l.id === primaryId)!;
    const secondaryLead = selectedLeads.find(l => l.id !== primaryId)!;

    // Build the merged data payload. Taking primary lead's data for missing fields
    // You could expand this to a field-by-field selector UI, but for now we do a simple
    // merge where primary wins.
    const mergedData: Partial<Lead> = {
      firstName: primaryLead.firstName || secondaryLead.firstName,
      lastName: primaryLead.lastName || secondaryLead.lastName,
      email: primaryLead.email || secondaryLead.email,
      phone: primaryLead.phone || secondaryLead.phone,
      alternatePhone: primaryLead.alternatePhone || secondaryLead.alternatePhone,
      city: primaryLead.city || secondaryLead.city,
      state: primaryLead.state || secondaryLead.state,
      leadSource: primaryLead.leadSource || secondaryLead.leadSource,
      leadStatus: primaryLead.leadStatus,
      universityId: primaryLead.universityId || secondaryLead.universityId,
      courseId: primaryLead.courseId || secondaryLead.courseId,
    };

    try {
      await onMerge(primaryId, secondaryLead.id, mergedData);
      toast.success('Leads merged successfully');
      onClose();
      setSelectedLeads([]);
      setPrimaryId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to merge leads');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Merge Duplicate Leads</h2>
            <p className="text-sm text-muted-foreground mt-1">Select two leads to combine into a single record.</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Lead Selector */}
          {selectedLeads.length < 2 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Select Lead {selectedLeads.length + 1}
              </label>
              <select
                className="w-full px-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                onChange={handleSelect}
                value=""
              >
                <option value="" disabled>Search and select a lead...</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id} disabled={selectedLeads.some(sl => sl.id === l.id)}>
                    {l.name} ({l.phone || 'No Phone'}) - {l.leadNumber}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selected Leads */}
          {selectedLeads.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Selected Leads</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedLeads.map((lead) => (
                  <div 
                    key={lead.id}
                    className={cn(
                      "p-4 rounded-xl border relative transition-all cursor-pointer",
                      primaryId === lead.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setPrimaryId(lead.id)}
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeSelected(lead.id); }}
                      className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-red-500 rounded-full hover:bg-red-500/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.leadNumber}</p>
                      </div>
                      {primaryId === lead.id && (
                        <div className="bg-primary/20 text-primary text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Primary
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm mt-3">
                      <p className="text-muted-foreground flex items-center gap-2">
                        <span className="w-16">Phone:</span>
                        <span className="text-foreground">{lead.phone || '-'}</span>
                      </p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <span className="w-16">Email:</span>
                        <span className="text-foreground">{lead.email || '-'}</span>
                      </p>
                    </div>

                    {primaryId !== lead.id && (
                      <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="w-3 h-3 text-orange-500" />
                        This record will be archived.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedLeads.length === 2 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="text-sm text-orange-700 dark:text-orange-400">
                <p className="font-semibold mb-1">Warning: Irreversible Action</p>
                <p>Merging will combine these two leads. The lead not marked as Primary will be soft-deleted. Empty fields on the Primary lead will be filled using data from the secondary lead.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={selectedLeads.length !== 2 || !primaryId || isMerging}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isMerging ? 'Merging...' : 'Merge Leads'}
            {!isMerging && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
