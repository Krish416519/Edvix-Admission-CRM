import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';

interface MasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  type: 'universities' | 'courses';
  universities?: any[]; // Passed in when type is 'courses'
}

export function MasterDataModal({ isOpen, onClose, onSubmit, initialData, type, universities }: MasterDataModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (type === 'universities') {
        setFormData({
          name: initialData?.name || '',
          code: initialData?.code || '',
          country: initialData?.country || '',
          status: initialData?.status || 'Active'
        });
      } else {
        setFormData({
          name: initialData?.name || '',
          code: initialData?.code || '',
          university_id: initialData?.university_id || '',
          level: initialData?.level || '',
          fee: initialData?.fee || 0,
          status: initialData?.status || 'Active'
        });
      }
    }
  }, [isOpen, initialData, type]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error: any) {
      toast.error(error.message || `Failed to save ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground capitalize">
            {initialData ? `Edit ${type.slice(0, -1)}` : `Add ${type.slice(0, -1)}`}
          </h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Code</label>
            <input
              type="text"
              required
              value={formData.code || ''}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {type === 'universities' ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Country</label>
              <input
                type="text"
                required
                value={formData.country || ''}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">University</label>
                <select
                  required
                  value={formData.university_id || ''}
                  onChange={e => setFormData({ ...formData, university_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select a university...</option>
                  {universities?.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Level</label>
                <input
                  type="text"
                  required
                  value={formData.level || ''}
                  onChange={e => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g., UG, PG"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Fee</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.fee || ''}
                  onChange={e => setFormData({ ...formData, fee: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
            <select
              required
              value={formData.status || 'Active'}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
