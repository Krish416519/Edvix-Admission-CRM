import { useState } from 'react';
import { X, AlertTriangle, ExternalLink } from 'lucide-react';
import { Lead, LeadStatus, LeadPriority } from '../../types/schema';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Lead>) => void;
  initialData?: Lead;
}

export function LeadFormModal({ isOpen, onClose, onSubmit, initialData }: LeadFormModalProps) {
  const [formData, setFormData] = useState<Partial<Lead>>(
    initialData || {
      name: '',
      phone: '',
      email: '',
      state: '',
      city: '',
      course: '',
      university: '',
      budget: '',
      source: 'Organic',
      priority: 'Medium' as LeadPriority,
      status: 'New' as LeadStatus,
      score: 50,
    }
  );
  
  const [isChecking, setIsChecking] = useState(false);
  const [duplicates, setDuplicates] = useState<Lead[]>([]);
  const [showConflict, setShowConflict] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const performSubmit = () => {
    onSubmit(formData);
    toast.success(initialData ? 'Lead updated successfully' : 'Lead created successfully');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.email) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!initialData && !showConflict) {
      setIsChecking(true);
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .or(`email.eq.${formData.email},phone.eq.${formData.phone}`);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setDuplicates(data as unknown as Lead[]);
          setShowConflict(true);
          setIsChecking(false);
          return;
        }
      } catch (err: any) {
        console.error('Error checking duplicates:', err);
      }
      setIsChecking(false);
    }
    
    performSubmit();
  };

  if (showConflict) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Duplicate Leads Found
            </h2>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-sm text-foreground">
              We found {duplicates.length} existing lead(s) with the same email or phone number. 
              Please review them before proceeding.
            </p>
            
            <div className="space-y-3">
              {duplicates.map((dup) => (
                <div key={dup.id} className="p-4 border border-border rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{dup.name} <span className="text-muted-foreground text-xs font-normal">({dup.leadNumber || dup.id?.slice(0,8)})</span></p>
                    <p className="text-sm text-muted-foreground">{dup.email} • {dup.phone}</p>
                    <p className="text-xs text-muted-foreground mt-1">Status: {dup.status || dup.leadStatus}</p>
                  </div>
                  <a
                    href={`/all-leads/${dup.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 transition-colors"
                  >
                    Open <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/10">
            <button
              type="button"
              onClick={() => setShowConflict(false)}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Back to Form
            </button>
            <button
              type="button"
              onClick={performSubmit}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create Anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">{initialData ? 'Edit Lead' : 'Add New Lead'}</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="+91 9876543210"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">State & City</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  name="state"
                  value={formData.state || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  placeholder="State"
                />
                <input
                  type="text"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  placeholder="City"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Program</label>
              <input
                type="text"
                name="course"
                value={formData.course || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="e.g. MBA"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target University</label>
              <input
                type="text"
                name="university"
                value={formData.university || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="University"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Source</label>
              <select
                name="source"
                value={formData.source || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              >
                <option value="Organic">Organic</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Referral">Referral</option>
                <option value="Website">Website</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <select
                name="priority"
                value={formData.priority || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isChecking}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isChecking ? 'Checking...' : initialData ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
