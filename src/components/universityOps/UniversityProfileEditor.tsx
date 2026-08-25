import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Save, X, Globe, Mail, MapPin, Link } from 'lucide-react';
import { toast } from 'sonner';

interface UniversityProfileEditorProps {
  universityId: string;
  onClose: () => void;
}

export function UniversityProfileEditor({ universityId, onClose }: UniversityProfileEditorProps) {
  const { userRole } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = userRole === 'Admin' || userRole === 'Super Admin' || userRole === 'University Operations Manager';

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data, error } = await supabase
          .from('universities')
          .select('*')
          .eq('id', universityId)
          .single();
        if (error) throw error;
        setProfile(data);
      } catch (err) {
        toast.error('Failed to load university profile');
        onClose();
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [universityId, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('universities')
        .update({
          brand_name: profile.brand_name,
          official_name: profile.official_name,
          university_type: profile.university_type,
          website: profile.website,
          support_email: profile.support_email,
          admission_email: profile.admission_email,
          application_url: profile.application_url,
          application_method: profile.application_method,
          partner_status: profile.partner_status,
          internal_notes: profile.internal_notes,
          address_line1: profile.address_line1,
          address_city: profile.address_city,
          address_state: profile.address_state,
          address_pincode: profile.address_pincode,
        })
        .eq('id', universityId);

      if (error) throw error;
      toast.success('University profile updated successfully');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-primary/5 border-b border-border p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Edit University Profile</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Update internal operational details
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
        {!canEdit && (
          <div className="mb-6 p-4 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200">
            <strong>Read Only View:</strong> You do not have permission to edit university profiles.
          </div>
        )}

        <div className="space-y-6">
          {/* Identity */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">Identity & Brand</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Brand Name (Display)</label>
                <input
                  type="text"
                  value={profile.brand_name || profile.name || ''}
                  onChange={(e) => setProfile({ ...profile, brand_name: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Official Legal Name</label>
                <input
                  type="text"
                  value={profile.official_name || ''}
                  onChange={(e) => setProfile({ ...profile, official_name: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">University Type</label>
                <select
                  value={profile.university_type || 'Private'}
                  onChange={(e) => setProfile({ ...profile, university_type: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                >
                  <option value="Private">Private</option>
                  <option value="Public">Public / State</option>
                  <option value="Deemed">Deemed</option>
                  <option value="Central">Central</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Partner Status</label>
                <select
                  value={profile.partner_status || 'Active'}
                  onChange={(e) => setProfile({ ...profile, partner_status: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Pending">Pending Setup</option>
                </select>
              </div>
            </div>
          </div>

          {/* Operations */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">Operational Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Primary Application Method</label>
                <select
                  value={profile.application_method || 'Manual Portal'}
                  onChange={(e) => setProfile({ ...profile, application_method: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                >
                  <option value="Manual Portal">Manual Portal (Edvix Ops)</option>
                  <option value="University API">University API</option>
                  <option value="Email">Email</option>
                  <option value="Partner Portal">Partner Portal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Application Portal URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="url"
                    value={profile.application_url || ''}
                    onChange={(e) => setProfile({ ...profile, application_url: e.target.value })}
                    disabled={!canEdit}
                    placeholder="https://..."
                    className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Support Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={profile.support_email || ''}
                    onChange={(e) => setProfile({ ...profile, support_email: e.target.value })}
                    disabled={!canEdit}
                    className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Admission Desk Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={profile.admission_email || ''}
                    onChange={(e) => setProfile({ ...profile, admission_email: e.target.value })}
                    disabled={!canEdit}
                    className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">Internal Notes (Not visible to partners)</h3>
            <textarea
              value={profile.internal_notes || ''}
              onChange={(e) => setProfile({ ...profile, internal_notes: e.target.value })}
              disabled={!canEdit}
              placeholder="Private notes about operational quirks, preferred contact times, etc."
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[80px] disabled:opacity-50"
            />
          </div>
        </div>

        {canEdit && (
          <div className="pt-6 mt-6 border-t border-border flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Profile
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
