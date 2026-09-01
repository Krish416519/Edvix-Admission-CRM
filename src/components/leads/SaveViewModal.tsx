import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useSavedViews, ViewVisibility } from '../../hooks/useSavedViews';
import { FilterState } from '../../types/filter';
import { useAuth } from '../../contexts/AuthContext';

interface SaveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterState: FilterState;
}

export function SaveViewModal({ isOpen, onClose, filterState }: SaveViewModalProps) {
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<ViewVisibility>('private');
  const [isSaving, setIsSaving] = useState(false);
  const { saveView } = useSavedViews();
  const { hasRole, user } = useAuth();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    
    const crmContext = user?.organizations?.find(o => o.id === user.activeOrganizationId)?.crm_context;
    
    const filtersToSave = {
      ...filterState,
      crmContext
    };
    
    const { success } = await saveView(name, filtersToSave, visibility);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  const canShareTeam = hasRole('Manager') || hasRole('Team Leader') || hasRole('Admin') || hasRole('Super Admin');
  const canShareOrg = hasRole('Admin') || hasRole('Super Admin');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Save as View</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">View Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hot IT Leads"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ViewVisibility)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="private">Private (Only Me)</option>
              {canShareTeam && <option value="team">Team (Counselors & Managers)</option>}
              {canShareOrg && <option value="organization">Organization (Everyone)</option>}
            </select>
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save View'}
          </button>
        </div>
      </div>
    </div>
  );
}
