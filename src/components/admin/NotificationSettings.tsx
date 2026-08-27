import { useState, useEffect } from 'react';
import { Bell, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export function NotificationSettings() {
  const [settings, setSettings] = useState<any>({
    systemOutage: true,
    securityThreats: true,
    backupFailures: true,
    newLeadEmail: true,
    newLeadWhatsapp: false
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'notification_settings')
        .single();
        
      if (data && data.value) {
        setSettings(data.value);
      }
    } catch (err: any) {
      console.error('No notification settings found or failed to load');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'notification_settings', value: settings });
        
      if (error) throw error;
      toast.success('Notification settings saved');
    } catch (err: any) {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          Notification Center
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Configure global notification rules for the CRM.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b border-border pb-2">Admin Alerts</h3>
            
            <label className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <div>
                <div className="font-medium">System Outage Alerts</div>
                <div className="text-xs text-muted-foreground">Notify Super Admins immediately when API drops below 99%</div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.systemOutage} 
                onChange={e => setSettings({...settings, systemOutage: e.target.checked})}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4" 
              />
            </label>

            <label className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <div>
                <div className="font-medium">Security Threats</div>
                <div className="text-xs text-muted-foreground">Email when suspicious IPs attempt to login</div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.securityThreats} 
                onChange={e => setSettings({...settings, securityThreats: e.target.checked})}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4" 
              />
            </label>

            <label className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <div>
                <div className="font-medium">Backup Failures</div>
                <div className="text-xs text-muted-foreground">Notify when scheduled backups fail</div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.backupFailures} 
                onChange={e => setSettings({...settings, backupFailures: e.target.checked})}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4" 
              />
            </label>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-semibold text-lg border-b border-border pb-2">User Default Settings</h3>
            
            <label className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <div>
                <div className="font-medium">New Lead Assigned (Email)</div>
                <div className="text-xs text-muted-foreground">Send email to counselors on new assignment</div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.newLeadEmail} 
                onChange={e => setSettings({...settings, newLeadEmail: e.target.checked})}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4" 
              />
            </label>
            
            <label className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <div>
                <div className="font-medium">New Lead Assigned (WhatsApp)</div>
                <div className="text-xs text-muted-foreground">Send WhatsApp message on new assignment</div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.newLeadWhatsapp} 
                onChange={e => setSettings({...settings, newLeadWhatsapp: e.target.checked})}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4" 
              />
            </label>
          </div>

          <div className="flex justify-end pt-4 mt-6 border-t border-border">
            <button 
              type="submit"
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" /> Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
