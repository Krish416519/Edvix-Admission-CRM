import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppNotification } from '../types/notification';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Partial<AppNotification>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { user } = useAuth();
  
  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
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
      // Map DB names to camelCase for UI if needed, but AppNotification has standard keys in our rewrite
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
        metadata: n.metadata,
        createdAt: n.created_at,
        updatedAt: n.updated_at
      })));
    }
  }, [user]);

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
        // Optimistically update or refetch
        fetchNotifications();
        
        // If it's a new INSERT, trigger browser push notification
        if (payload.eventType === 'INSERT' && 'Notification' in window && Notification.permission === 'granted') {
           const newRow = payload.new;
           try {
             new Notification(newRow.title, {
               body: newRow.message,
               icon: '/favicon.ico'
             });
           } catch (e) {
             console.error('Failed to show browser notification', e);
           }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const unreadCount = notifications.filter(n => n.status === 'Unread').length;

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;
    
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, status: 'Read', readAt: new Date().toISOString() } : n)
    );

    await supabase
      .from('notifications')
      .update({ status: 'Read', read_at: new Date().toISOString() })
      .eq('id', id);
      
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, status: 'Read', readAt: new Date().toISOString() })));

    await supabase
      .from('notifications')
      .update({ status: 'Read', read_at: new Date().toISOString() })
      .eq('recipient_id', user.id)
      .eq('status', 'Unread');
      
  }, [user]);

  // Provide a bridge method for UI to inject notifications (though most come from triggers now)
  const addNotification = useCallback(async (newNotif: Partial<AppNotification>) => {
    if (!user) return;
    
    await supabase.from('notifications').insert({
      recipient_id: user.id,
      module: newNotif.module || 'System',
      title: newNotif.title || 'New Notification',
      message: newNotif.message || '',
      priority: newNotif.priority || 'Low',
      category: newNotif.category || 'general'
    });
    
  }, [user]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification }}>
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
