import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppNotification, NotificationPriority } from '../types/notification';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { showTaskReminderToast } from '../components/tasks/GlobalTaskReminder';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  hasHighPriorityUnread: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Partial<AppNotification>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { user } = useAuth();
  
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
  const POPUP_TRACKING_KEY = `kilo_notif_popups_${user?.id || 'none'}`;

  // Check if a popup was recently shown for this key in ANY tab
  const wasPopupShownInAnyTab = useCallback((key: string): boolean => {
    try {
      const stored = localStorage.getItem(POPUP_TRACKING_KEY);
      if (!stored) return false;
      const map = JSON.parse(stored) as Record<string, number>;
      const ts = map[key];
      if (!ts) return false;
      // Expire after 10 seconds — allows the same key to popup again if a genuinely new event
      // occurs more than 10 seconds later (e.g., task rescheduled and triggered again)
      return Date.now() - ts < 10000;
    } catch {
      return false;
    }
  }, [POPUP_TRACKING_KEY]);

  // Record that a popup was shown for this key in this tab
  const recordPopupShown = useCallback((key: string) => {
    shownPopupKeys.current.add(key);
    try {
      const stored = localStorage.getItem(POPUP_TRACKING_KEY);
      const map = stored ? JSON.parse(stored) as Record<string, number> : {};
      map[key] = Date.now();
      localStorage.setItem(POPUP_TRACKING_KEY, JSON.stringify(map));
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
          const map = JSON.parse(e.newValue) as Record<string, number>;
          Object.keys(map).forEach(k => shownPopupKeys.current.add(k));
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

  // Sound Flood Protection (3-second cooldown)
  const playSound = useCallback(() => {
    const now = Date.now();
    const lastPlayed = parseInt(localStorage.getItem('lastNotifSound') || '0', 10);
    if (now - lastPlayed > 3000) {
      console.log('[NotificationSound] playSound called, context state:', audioContextRef.current?.state || 'not initialized');
      try {
        // Reuse a shared AudioContext (created on first user interaction)
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        let context = audioContextRef.current;
        if (!context) {
          context = new AudioContext();
          audioContextRef.current = context;
        }

        // Resume the context if suspended (browser autoplay policy)
        if (context.state === 'suspended') {
          context.resume().then(() => {
            if (context) playSoundWithOscillator(context);
          }).catch(err => {
            console.debug('AudioContext.resume failed:', err);
          });
        } else {
          playSoundWithOscillator(context);
        }

        localStorage.setItem('lastNotifSound', now.toString());
      } catch (err) {
        console.debug('Audio play prevented or unsupported', err);
      }
    }
  }, []);

  // Helper to play the pop sound with an oscillator
  const playSoundWithOscillator = useCallback((context: AudioContext) => {
    try {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(150, context.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.5, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.start();
      oscillator.stop(context.currentTime + 0.1);
    } catch (err) {
      console.debug('Oscillator play failed:', err);
    }
  }, []);

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
              console.log('[NotificationSound] Triggering sound for high-priority notification:', newRow.title);
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

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, status: 'Read', readAt: new Date().toISOString() })));
    await supabase.from('notifications').update({ status: 'Read', read_at: new Date().toISOString() }).eq('recipient_id', user.id).eq('status', 'Unread');
  }, [user]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, hasHighPriorityUnread, markAsRead, markAllAsRead, addNotification }}>
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
