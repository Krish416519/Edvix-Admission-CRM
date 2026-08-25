import React, { useState, useEffect } from 'react';
import { Shield, MessageSquare, Mail, Smartphone } from 'lucide-react';
import { omnichannelService } from '../../lib/omnichannel/OmnichannelService';
import { CommunicationPreference, ChannelType } from '../../types/communication';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface CommunicationPreferencesProps {
  leadId: string;
}

export function CommunicationPreferences({ leadId }: CommunicationPreferencesProps) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<CommunicationPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPrefs();
  }, [leadId]);

  const loadPrefs = async () => {
    try {
      const data = await omnichannelService.getPreferences(leadId);
      setPrefs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const isAllowed = (channel: ChannelType) => {
    const pref = prefs.find(p => p.channel === channel);
    return pref ? pref.is_allowed : true; // default true if not explicitly opted out
  };

  const handleToggle = async (channel: ChannelType, currentAllowed: boolean) => {
    if (!user) return;
    try {
      await omnichannelService.updatePreference(leadId, channel, !currentAllowed, user.id);
      await loadPrefs();
      toast.success(`Updated ${channel} preferences`);
    } catch (e) {
      toast.error('Failed to update preferences');
    }
  };

  if (isLoading) return null;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Communication Preferences</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-foreground">WhatsApp Messages</p>
              <p className="text-xs text-muted-foreground">Allow sending WhatsApp messages to this lead</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isAllowed('whatsapp')}
              onChange={() => handleToggle('whatsapp', isAllowed('whatsapp'))}
            />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Email Communications</p>
              <p className="text-xs text-muted-foreground">Allow sending emails to this lead</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isAllowed('email')}
              onChange={() => handleToggle('email', isAllowed('email'))}
            />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-indigo-500" />
            <div>
              <p className="text-sm font-medium text-foreground">SMS Messages</p>
              <p className="text-xs text-muted-foreground">Allow sending text messages to this lead</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isAllowed('sms')}
              onChange={() => handleToggle('sms', isAllowed('sms'))}
            />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
