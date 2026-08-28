import { useState, useEffect } from 'react';
import { Settings, Save, Building2, Globe, Clock, IndianRupee, Image as ImageIcon, GripVertical, Plus, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export function SystemSettings() {
  const [activeSection, setActiveSection] = useState('profile');
  const [config, setConfig] = useState<any>({
    profile: { companyName: '', supportEmail: '', phone: '', website: '', address: '' },
    localization: { timezone: '', dateFormat: '' },
    branding: { primaryColor: '#4f46e5' },
    business: {},
    financial: { currency: 'INR (₹)', taxRate: 18 }
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) throw error;
      
      const newConfig = { ...config };
      data?.forEach(setting => {
        if (newConfig[setting.key] !== undefined) {
          newConfig[setting.key] = setting.value;
        }
      });
      setConfig(newConfig);
    } catch (err: any) {
      toast.error('Failed to load settings');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updates = Object.keys(config).map(key => ({
        key,
        value: config[key]
      }));
      
      const { error } = await supabase.from('system_settings').upsert(updates);
      if (error) throw error;
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          System Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Configure global application parameters, branding, and localization.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation */}
        <div className="w-full md:w-56 shrink-0 space-y-1">
          {[
            { id: 'profile', label: 'Company Profile', icon: Building2 },
            { id: 'localization', label: 'Localization', icon: Globe },
            { id: 'branding', label: 'Branding', icon: ImageIcon },
            { id: 'business', label: 'Business Hours', icon: Clock },
            { id: 'financial', label: 'Financial', icon: IndianRupee },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeSection === item.id 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`w-4 h-4 ${activeSection === item.id ? 'text-primary' : 'text-muted-foreground'}`} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 bg-card border border-border rounded-xl shadow-sm p-6">
          <form onSubmit={handleSave} className="space-y-6">
            
            {activeSection === 'profile' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="font-semibold text-lg border-b border-border pb-2">Company Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company Name</label>
                    <input type="text" value={config.profile?.companyName || ''} onChange={e => setConfig({...config, profile: {...config.profile, companyName: e.target.value}})} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Support Email</label>
                    <input type="email" value={config.profile?.supportEmail || ''} onChange={e => setConfig({...config, profile: {...config.profile, supportEmail: e.target.value}})} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number</label>
                    <input type="tel" value={config.profile?.phone || ''} onChange={e => setConfig({...config, profile: {...config.profile, phone: e.target.value}})} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Website</label>
                    <input type="url" value={config.profile?.website || ''} onChange={e => setConfig({...config, profile: {...config.profile, website: e.target.value}})} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Headquarters Address</label>
                    <textarea rows={3} value={config.profile?.address || ''} onChange={e => setConfig({...config, profile: {...config.profile, address: e.target.value}})} className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none" />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'localization' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="font-semibold text-lg border-b border-border pb-2">Localization</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time Zone</label>
                    <select value={config.localization?.timezone || ''} onChange={e => setConfig({...config, localization: {...config.localization, timezone: e.target.value}})} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                      <option>Asia/Kolkata (IST)</option>
                      <option>UTC</option>
                      <option>America/New_York (EST)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Format</label>
                    <select value={config.localization?.dateFormat || ''} onChange={e => setConfig({...config, localization: {...config.localization, dateFormat: e.target.value}})} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'branding' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="font-semibold text-lg border-b border-border pb-2">Branding</h3>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium block">Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-xl text-primary">
                        E
                      </div>
                      <button type="button" className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                        Upload Logo
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium block">Primary Brand Color</label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg shadow-sm border border-border" style={{ backgroundColor: config.branding?.primaryColor || '#4f46e5' }}></div>
                      <input type="text" value={config.branding?.primaryColor || ''} onChange={e => setConfig({...config, branding: {...config.branding, primaryColor: e.target.value}})} className="px-3 py-2 border border-border rounded-lg bg-background w-32 font-mono text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'business' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="font-semibold text-lg border-b border-border pb-2">Business Hours</h3>
                <p className="text-sm text-muted-foreground">Used for SLA calculations and auto-responders.</p>
                <div className="space-y-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                    <div key={day} className="flex items-center justify-between gap-4 max-w-md">
                      <span className="text-sm font-medium w-24">{day}</span>
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" defaultValue="09:00" className="w-full px-3 py-1.5 border border-border rounded-md bg-background text-sm" />
                        <span className="text-muted-foreground">to</span>
                        <input type="time" defaultValue="18:00" className="w-full px-3 py-1.5 border border-border rounded-md bg-background text-sm" />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4 max-w-md opacity-50">
                    <span className="text-sm font-medium w-24">Saturday</span>
                    <div className="flex items-center gap-2 flex-1">
                      <input type="time" disabled className="w-full px-3 py-1.5 border border-border rounded-md bg-muted text-sm cursor-not-allowed" />
                      <span className="text-muted-foreground">to</span>
                      <input type="time" disabled className="w-full px-3 py-1.5 border border-border rounded-md bg-muted text-sm cursor-not-allowed" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'financial' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="font-semibold text-lg border-b border-border pb-2">Financial Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Currency</label>
                    <select value={config.financial?.currency || ''} onChange={e => setConfig({...config, financial: {...config.financial, currency: e.target.value}})} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                      <option>INR (₹)</option>
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tax Rate (%)</label>
                    <input type="number" value={config.financial?.taxRate || ''} onChange={e => setConfig({...config, financial: {...config.financial, taxRate: parseFloat(e.target.value)}})} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-border">
              <button 
                type="submit"
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
