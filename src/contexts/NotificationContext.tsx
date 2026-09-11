import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppNotification, NotificationPriority } from '../types/notification';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { showTaskReminderToast } from '../components/tasks/GlobalTaskReminder';

export type NotificationSoundTone = 'ios_tritone' | 'bubble_pop' | 'crystal_glass' | 'gentle_ding' | 'marimba_chord';

export interface SoundToneOption {
  id: NotificationSoundTone;
  name: string;
  description: string;
  category: string;
  badge: string;
}

export const AVAILABLE_SOUND_TONES: SoundToneOption[] = [
  { 
    id: 'ios_tritone', 
    name: 'iPhone Tri-tone', 
    description: 'Iconic Apple 3-note chime (G5 - B5 - D6)', 
    category: 'Apple iOS',
    badge: 'iPhone'
  },
  { 
    id: 'bubble_pop', 
    name: 'Bubble Pop', 
    description: 'Crisp water bubble pop (WhatsApp & Messages)', 
    category: 'Modern',
    badge: 'Popular'
  },
  { 
    id: 'crystal_glass', 
    name: 'Crystal Glass', 
    description: 'High-frequency dual harmonic ping', 
    category: 'Classic',
    badge: 'Subtle'
  },
  { 
    id: 'gentle_ding', 
    name: 'Gentle Bell', 
    description: 'Soft reassuring single bell chime', 
    category: 'Minimal',
    badge: 'Quiet'
  },
  { 
    id: 'marimba_chord', 
    name: 'Marimba Duo', 
    description: 'Warm acoustic wooden marimba chime', 
    category: 'Android / Pixel',
    badge: 'Android'
  }
];

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  hasHighPriorityUnread: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllRead: () => Promise<void>;
  markMultipleAsRead: (ids: string[]) => Promise<void>;
  markMultipleAsUnread: (ids: string[]) => Promise<void>;
  deleteMultiple: (ids: string[]) => Promise<void>;
  addNotification: (notification: Partial<AppNotification>) => Promise<void>;
  soundEnabled: boolean;
  toggleSound: () => void;
  selectedTone: NotificationSoundTone;
  setSelectedTone: (tone: NotificationSoundTone) => void;
  soundTones: SoundToneOption[];
  playTonePreview: (tone?: NotificationSoundTone) => void;
  playTestChime: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { user } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('edvix_notifications_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [selectedTone, setSelectedToneState] = useState<NotificationSoundTone>(() => {
    const saved = localStorage.getItem('edvix_notifications_sound_tone') as NotificationSoundTone;
    if (saved && AVAILABLE_SOUND_TONES.some(t => t.id === saved)) {
      return saved;
    }
    return 'ios_tritone';
  });

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('edvix_notifications_sound_enabled', String(next));
      toast.info(next ? 'Notification audio enabled' : 'Notification audio muted');
      return next;
    });
  }, []);
  
  // Request browser notification permission and initialize AudioContext on first user interaction
  const audioContextRef = useRef<AudioContext | null>(null);
  
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // Unlock AudioContext on first user interaction (browsers block autoplay)
    const unlockAudio = () => {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          audioContextRef.current = new AudioContext();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .neq('status', 'Deleted')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data.map(n => ({
        id: n.id,
        notificationNumber: n.notification_number,
        recipientId: n.recipient_id,
        module: n.module,
        moduleRecordId: n.module_record_id,
        title: n.title,
        message: n.message,
        channel: n.channel,
        priority: n.priority,
        category: n.category,
        status: n.status,
         readAt: n.read_at,
         expiresAt: n.expires_at,
         dedupeKey: n.dedupe_key,
         metadata: n.metadata,
        createdAt: n.created_at,
        updatedAt: n.updated_at
      })));
    }
  }, [user]);

  // Set of dedupe_keys for notifications that have already triggered a popup in this session
  // Used as a frontend safety net against duplicate popups from realtime events
  const shownPopupKeys = useRef<Set<string>>(new Set());

  // Cross-tab coordination: localStorage key for tracking popups shown across all tabs
  // Keys are permanent for this browser session — once a notification ID has shown a popup,
  // it must NEVER show again (canonical identity: notification.dedupe_key or notification.id)
  const POPUP_TRACKING_KEY = `kilo_notif_popups_${user?.id || 'none'}`;

  // Check if a popup was already shown for this key in ANY tab (no expiry)
  const wasPopupShownInAnyTab = useCallback((key: string): boolean => {
    if (shownPopupKeys.current.has(key)) return true;
    try {
      const stored = localStorage.getItem(POPUP_TRACKING_KEY);
      if (!stored) return false;
      const popupKeys = JSON.parse(stored) as string[];
      return popupKeys.includes(key);
    } catch {
      return false;
    }
  }, [POPUP_TRACKING_KEY]);

  // Record that a popup was shown for this key — permanent for this browser session
  const recordPopupShown = useCallback((key: string) => {
    shownPopupKeys.current.add(key);
    try {
      const stored = localStorage.getItem(POPUP_TRACKING_KEY);
      const popupKeys = stored ? JSON.parse(stored) as string[] : [];
      if (!popupKeys.includes(key)) {
        popupKeys.push(key);
        localStorage.setItem(POPUP_TRACKING_KEY, JSON.stringify(popupKeys));
      }
    } catch {
      // ignore
    }
  }, [POPUP_TRACKING_KEY]);

  // Listen for popup events from other tabs
  useEffect(() => {
    if (!user) return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === POPUP_TRACKING_KEY && e.newValue) {
        try {
          const popupKeys = JSON.parse(e.newValue) as string[];
          popupKeys.forEach(k => shownPopupKeys.current.add(k));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [POPUP_TRACKING_KEY, user]);

  // Generate a stable dedupe_key for task reminder notifications
  // Format: module:module_record_id:category
  const generateDedupeKey = useCallback((newNotif: Partial<AppNotification>): string | null => {
    if (!newNotif.moduleRecordId) return null;
    return `${newNotif.module || 'System'}:${newNotif.moduleRecordId}:${newNotif.category || 'general'}`;
  }, []);

  // Provide a bridge method for UI to inject notifications (with deduplication support)
  const addNotification = useCallback(async (newNotif: Partial<AppNotification>) => {
    if (!user) return;
    try {
      let orgId = user.activeOrganizationId || user.organizations?.[0]?.id;

      // Fallback: If still no orgId (e.g., for Super Admins not in any org), fetch the first available org
      if (!orgId) {
        const { data: orgData, error: orgError } = await supabase.from('organizations').select('id').limit(1).single();
        if (!orgError && orgData) {
          orgId = orgData.id;
        }
      }

      const dedupeKey = generateDedupeKey(newNotif);

      const payload = {
        recipient_id: user.id,
        organization_id: orgId,
        module: newNotif.module || 'System',
        module_record_id: newNotif.moduleRecordId || null,
        title: newNotif.title || 'New Notification',
        message: newNotif.message || '',
        priority: newNotif.priority || 'Low',
        category: newNotif.category || 'general',
        dedupe_key: dedupeKey,
        metadata: newNotif.metadata || {}
      };

      // Use INSERT with ON CONFLICT to be idempotent
      // For task-related categories (task_due_soon, task_due_now, task_overdue),
      // the unique index on (recipient_id, module_record_id, category) prevents duplicates.
      // For other categories, dedupe_key provides the canonical identity.
      if (dedupeKey) {
        // For notifications with a dedupe_key, use upsert to avoid duplicate realtime events
        const { error } = await supabase.from('notifications').insert(payload);
        // 23505 is PostgreSQL unique violation — notification already exists, silently ignore
        if (error && error.code !== '23505') {
          console.error("Failed to add notification:", error);
        }
      } else {
        // Non-dedupe notifications (e.g., one-time events) — insert normally
        const { error } = await supabase.from('notifications').insert(payload);
        if (error) {
          console.error("Failed to add notification:", error);
        }
      }
    } catch (err: any) {
      console.error("Error adding notification:", err);
    }
  }, [user]);

  // Phone Sound Tone Synthesizer using Web Audio API
  const playToneWithAudioContext = useCallback((context: AudioContext, tone: NotificationSoundTone) => {
    try {
      const now = context.currentTime;

      switch (tone) {
        case 'ios_tritone': {
          // Classic iPhone Tri-tone (G5 784Hz -> B5 988Hz -> D6 1175Hz)
          const notes = [
            { freq: 784, start: 0, duration: 0.11 },
            { freq: 988, start: 0.10, duration: 0.11 },
            { freq: 1175, start: 0.20, duration: 0.26 },
          ];
          notes.forEach(({ freq, start, duration }) => {
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + start);

            gain.gain.setValueAtTime(0.38, now + start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

            osc.connect(gain);
            gain.connect(context.destination);

            osc.start(now + start);
            osc.stop(now + start + duration);
          });
          break;
        }

        case 'bubble_pop': {
          // Modern WhatsApp/Messages Water Bubble Pop
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.exponentialRampToValueAtTime(1350, now + 0.08);

          gain.gain.setValueAtTime(0.55, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

          osc.connect(gain);
          gain.connect(context.destination);

          osc.start(now);
          osc.stop(now + 0.09);
          break;
        }

        case 'crystal_glass': {
          // High-frequency dual harmonic crystal ping
          const osc1 = context.createOscillator();
          const osc2 = context.createOscillator();
          const gain = context.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(1760, now); // A6
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(3520, now); // A7 overtone

          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(context.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.35);
          osc2.stop(now + 0.35);
          break;
        }

        case 'gentle_ding': {
          // Soft minimal bell chime
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1046.5, now); // C6

          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

          osc.connect(gain);
          gain.connect(context.destination);

          osc.start(now);
          osc.stop(now + 0.45);
          break;
        }

        case 'marimba_chord': {
          // Warm acoustic wooden marimba strike (Android / Pixel style)
          const notes = [
            { freq: 659.25, start: 0, duration: 0.15 }, // E5
            { freq: 880.00, start: 0.08, duration: 0.24 }, // A5
          ];
          notes.forEach(({ freq, start, duration }) => {
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + start);

            gain.gain.setValueAtTime(0.48, now + start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

            osc.connect(gain);
            gain.connect(context.destination);

            osc.start(now + start);
            osc.stop(now + start + duration);
          });
          break;
        }

        default: {
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.connect(gain);
          gain.connect(context.destination);
          osc.start(now);
          osc.stop(now + 0.1);
        }
      }
    } catch (err) {
      console.debug('Tone synthesizer failed:', err);
    }
  }, []);

  // Sound Flood Protection (3-second cooldown)
  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    const now = Date.now();
    const lastPlayed = parseInt(localStorage.getItem('lastNotifSound') || '0', 10);
    if (now - lastPlayed > 3000) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        let context = audioContextRef.current;
        if (!context) {
          context = new AudioContext();
          audioContextRef.current = context;
        }

        if (context.state === 'suspended') {
          context.resume().then(() => {
            if (context) playToneWithAudioContext(context, selectedTone);
          }).catch(err => {
            console.debug('AudioContext.resume failed:', err);
          });
        } else {
          playToneWithAudioContext(context, selectedTone);
        }

        localStorage.setItem('lastNotifSound', now.toString());
      } catch (err) {
        console.debug('Audio play prevented or unsupported', err);
      }
    }
  }, [soundEnabled, selectedTone, playToneWithAudioContext]);

  // Real-time Subscriptions
  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    const channel = supabase.channel('notifications-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications', 
        filter: `recipient_id=eq.${user.id}` 
      }, (payload) => {
        // Optimistically refetch all
        fetchNotifications();
        
          if (payload.eventType === 'INSERT') {
           const newRow = payload.new;
           
           // Use dedupe_key from DB if available, otherwise compute one
           const popupKey = newRow.dedupe_key 
             || (newRow.module && newRow.module_record_id && newRow.category
               ? `popup:${newRow.module}:${newRow.module_record_id}:${newRow.category}`
               : null);

            // Frontend deduplication: skip popup/sound if this event was already shown
            // in this tab OR in any other tab (cross-tab coordination)
            if (popupKey && (shownPopupKeys.current.has(popupKey) || wasPopupShownInAnyTab(popupKey))) {
              return;
            }
            if (popupKey) {
              recordPopupShown(popupKey);
            }

           // Only high/urgent events generate sounds or browser pushes
           const isHighPriority = ['High', 'Critical', 'Urgent'].includes(newRow.priority);
           
             if (isHighPriority) {
               playSound();
              
                // Trigger UI Toast for Task Reminders
                 if (newRow.module === 'Tasks' && newRow.module_record_id) {
                   // We only show toast for due_soon or due_now to avoid continuous overdue screaming
                   if (newRow.category === 'task_due_soon' || newRow.category === 'task_due_now') {
                     showTaskReminderToast({
                       id: newRow.module_record_id,
                       title: newRow.title,
                       due_date: newRow.message,
                       metadata: newRow.metadata || {}
                     });
                   }
                 }
                 else if (newRow.module?.toLowerCase() === 'leads' && newRow.module_record_id &&
                          newRow.category?.toLowerCase() === 'assignment') {
                   // Lead assignment: show a 5-second in-app toast
                   // Click routing is handled via browser notification onClick and NotificationBell/NotificationsList
                   toast(newRow.title, {
                     description: newRow.message,
                     duration: 5000
                   });
                 }
                
                if ('Notification' in window && Notification.permission === 'granted') {
                  try {
                    const notification = new Notification(newRow.title, {
                      body: newRow.message,
                      icon: '/favicon.ico'
                    });
                    
                    notification.onclick = () => {
                      window.focus();
                      if (newRow.metadata?.link) {
                        window.location.href = newRow.metadata.link;
                      } else if (newRow.module?.toLowerCase() === 'leads' && newRow.module_record_id) {
                        window.location.href = `/all-leads/${newRow.module_record_id}`;
                      } else if (newRow.module?.toLowerCase() === 'tasks' && newRow.module_record_id) {
                        window.location.href = `/tasks?taskId=${newRow.module_record_id}`;
                      } else {
                        window.location.href = '/notifications';
                      }
                    };
                  } catch (e) {
                    console.error('Failed to show browser notification', e);
                  }
                }
              }
         }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    }, [user, fetchNotifications, playSound, POPUP_TRACKING_KEY, wasPopupShownInAnyTab, recordPopupShown, showTaskReminderToast]);

  // Distributed Background Scheduler for Task Due/Overdue Reminders
  useEffect(() => {
    if (!user) return;
    let isChecking = false;

    const checkTasks = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('id, title, due_date, due_time, status')
          .eq('assigned_user', user.id)
          .eq('status', 'Pending');
        
        if (error) {
          toast.error(`Debug Fetch Error: ${error.message}`);
          return;
        }
        
        if (!tasks || tasks.length === 0) {
          return;
        }

        // Fetch existing task notifications (ALL non-Deleted, not just Unread) to prevent duplicates
        const taskIds = tasks.map(t => t.id);
        const { data: existingNotifs, error: notifError } = await supabase
          .from('notifications')
          .select('module_record_id, category')
          .eq('recipient_id', user.id)
          .eq('module', 'Tasks')
          .neq('status', 'Deleted')
          .in('module_record_id', taskIds);

        const existingKeys = new Set<string>();
        if (existingNotifs) {
          existingNotifs.forEach(n => {
            existingKeys.add(`Tasks:${n.module_record_id}:${n.category}`);
          });
        }

        const now = new Date();
        
        for (const task of tasks) {
            if (!task.due_date) continue;
            
            let taskDateStr = task.due_date;
            if (task.due_time) {
              taskDateStr = `${task.due_date}T${task.due_time}`;
            } else {
              taskDateStr = `${task.due_date}T00:00:00`;
            }
            
            const dueDateTime = new Date(taskDateStr);
            const diffMs = dueDateTime.getTime() - now.getTime();
            const diffMinutes = diffMs / 60000;
            
            let category = '';
            let title = '';
            let message = '';
            let priority: NotificationPriority = 'Low';
            
            // Due Soon: between 0 and 5 minutes remaining
            if (diffMinutes <= 5 && diffMinutes > 0) {
              category = 'task_due_soon';
              title = 'Task Due Soon';
              message = `Your task "${task.title}" is due in ${Math.ceil(diffMinutes)} minutes.`;
              priority = 'High';
            }
            // Due Now: just crossed the due time (0 to 5 minutes late)
            else if (diffMinutes <= 0 && diffMinutes > -5) {
              category = 'task_due_now';
              title = 'Task Due Now';
              message = `Your task "${task.title}" is due right now.`;
              priority = 'Medium';
            }
            // No task_overdue category — tasks that remain pending/overdue
            // do NOT generate additional notification events beyond the 2 legitimate ones.
            
            if (category) {
              const dedupeKey = `Tasks:${task.id}:${category}`;
              // Skip if an unread notification already exists for this task+category
               if (existingKeys.has(dedupeKey)) continue;
              
               await addNotification({
                 module: 'Tasks',
                 moduleRecordId: task.id,
                 title,
                 message,
                 priority,
                 category,
                 metadata: { link: `/tasks?taskId=${task.id}` }
               });
            }
        }
      } catch (err: any) {
        console.error("Distributed Task check failed:", err);
      } finally {
        isChecking = false;
      }
    };
    
    // Check initially, then poll every 60 seconds
    checkTasks();
    const interval = setInterval(checkTasks, 60000);
    return () => clearInterval(interval);
  }, [user, addNotification]);

  const unreadCount = notifications.filter(n => n.status === 'Unread').length;
  const hasHighPriorityUnread = notifications.some(n => 
    n.status === 'Unread' && ['High', 'Critical', 'Urgent'].includes(n.priority)
  );

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'Read', readAt: new Date().toISOString() } : n));
    await supabase.from('notifications').update({ status: 'Read', read_at: new Date().toISOString() }).eq('id', id);
  }, [user]);

  const markAsUnread = useCallback(async (id: string) => {
    if (!user) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'Unread', readAt: undefined } : n));
    await supabase.from('notifications').update({ status: 'Unread', read_at: null }).eq('id', id);
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    setNotifications(prev => prev.map(n => ({ ...n, status: 'Read', readAt: now })));
    await supabase.from('notifications').update({ status: 'Read', read_at: now }).eq('recipient_id', user.id).eq('status', 'Unread');
    toast.success('All notifications marked as read');
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!user) return;
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').update({ status: 'Deleted' }).eq('id', id);
    toast.success('Notification dismissed');
  }, [user]);

  const clearAllRead = useCallback(async () => {
    if (!user) return;
    setNotifications(prev => prev.filter(n => n.status !== 'Read'));
    await supabase.from('notifications').update({ status: 'Deleted' }).eq('recipient_id', user.id).eq('status', 'Read');
    toast.success('Cleared all read notifications');
  }, [user]);

  const markMultipleAsRead = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return;
    const now = new Date().toISOString();
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, status: 'Read', readAt: now } : n));
    await supabase.from('notifications').update({ status: 'Read', read_at: now }).in('id', ids);
    toast.success(`Marked ${ids.length} notifications as read`);
  }, [user]);

  const markMultipleAsUnread = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return;
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, status: 'Unread', readAt: undefined } : n));
    await supabase.from('notifications').update({ status: 'Unread', read_at: null }).in('id', ids);
    toast.success(`Marked ${ids.length} notifications as unread`);
  }, [user]);

  const deleteMultiple = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return;
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
    await supabase.from('notifications').update({ status: 'Deleted' }).in('id', ids);
    toast.success(`Deleted ${ids.length} notifications`);
  }, [user]);

  const playTonePreview = useCallback((toneToPlay?: NotificationSoundTone) => {
    try {
      const tone = toneToPlay || selectedTone;
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        toast.info('Audio not supported in this browser');
        return;
      }
      let context = audioContextRef.current;
      if (!context) {
        context = new AudioContext();
        audioContextRef.current = context;
      }
      if (context.state === 'suspended') {
        context.resume().then(() => {
          if (context) playToneWithAudioContext(context, tone);
        });
      } else {
        playToneWithAudioContext(context, tone);
      }
    } catch (err) {
      console.debug('Failed to play tone preview:', err);
    }
  }, [selectedTone, playToneWithAudioContext]);

  const setSelectedTone = useCallback((tone: NotificationSoundTone) => {
    setSelectedToneState(tone);
    localStorage.setItem('edvix_notifications_sound_tone', tone);
    playTonePreview(tone);
    const found = AVAILABLE_SOUND_TONES.find(t => t.id === tone);
    toast.success(`Notification sound set to: ${found?.name || tone}`);
  }, [playTonePreview]);

  const playTestChime = useCallback(() => {
    playTonePreview(selectedTone);
    const found = AVAILABLE_SOUND_TONES.find(t => t.id === selectedTone);
    toast.success(`Testing ${found?.name || 'sound tone'}`);
  }, [playTonePreview, selectedTone]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      hasHighPriorityUnread,
      markAsRead,
      markAsUnread,
      markAllAsRead,
      deleteNotification,
      clearAllRead,
      markMultipleAsRead,
      markMultipleAsUnread,
      deleteMultiple,
      addNotification,
      soundEnabled,
      toggleSound,
      selectedTone,
      setSelectedTone,
      soundTones: AVAILABLE_SOUND_TONES,
      playTonePreview,
      playTestChime,
      refreshNotifications: fetchNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
