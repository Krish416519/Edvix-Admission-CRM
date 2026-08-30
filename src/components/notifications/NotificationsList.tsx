import { useState } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { Bell, CheckCircle2, UserPlus, FileText, IndianRupee, Clock, Check } from 'lucide-react';
import { AppNotification } from '../../types/notification';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export function NotificationsList() {
  const { notifications, markAllAsRead, markAsRead } = useNotifications();
  const navigate = useNavigate();

  const getIcon = (module: string) => {
    switch (module?.toLowerCase()) {
      case 'leads': return <UserPlus className="w-5 h-5 text-primary" />;
      case 'finance': return <IndianRupee className="w-5 h-5 text-green-500" />;
      case 'system': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'admissions': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'tasks': return <FileText className="w-5 h-5 text-blue-500" />;
      default: return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    if (notification.metadata?.link) {
      navigate(notification.metadata.link);
      return;
    }
    
    // Direct routing for Leads
    if (notification.module?.toLowerCase() === 'leads' && notification.moduleRecordId) {
      navigate(`/all-leads/${notification.moduleRecordId}`);
      return;
    }

    // Direct routing for Tasks
    if (notification.module?.toLowerCase() === 'tasks' && notification.moduleRecordId) {
      navigate(`/tasks?taskId=${notification.moduleRecordId}`);
      return;
    }
  };

  const timeFormat = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const urgentNotifications = notifications.filter(n => n.status === 'Unread' && ['High', 'Critical', 'Urgent'].includes(n.priority || ''));
  const recentNotifications = notifications.filter(n => !urgentNotifications.includes(n));

  const renderNotificationItem = (notification: AppNotification) => (
    <div 
      key={notification.id} 
      className={cn(
        "p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group flex gap-4",
        notification.status === 'Unread' ? "bg-primary/5" : ""
      )}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className={cn(
        "mt-1 shrink-0 w-10 h-10 rounded-full flex items-center justify-center border shadow-sm",
        notification.status === 'Unread' ? "bg-background border-primary/20" : "bg-muted border-border"
      )}>
      {getIcon(notification.module)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <p className={cn(
            "text-base font-medium truncate flex items-center gap-2",
            notification.status === 'Unread' ? "text-foreground" : "text-muted-foreground"
          )}>
            {notification.title}
            {['High', 'Critical', 'Urgent'].includes(notification.priority || '') && (
              <span className="bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                {notification.priority}
              </span>
            )}
          </p>
          <span className="shrink-0 text-sm text-muted-foreground whitespace-nowrap">
            {timeFormat(notification.createdAt || new Date().toISOString())}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {notification.message}
        </p>
      </div>
      {notification.status === 'Unread' && (
        <div className="shrink-0 flex items-center justify-center pl-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-4xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications History</h1>
          <p className="text-sm text-muted-foreground mt-1">View all past and recent notifications.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg font-semibold transition-all text-sm shadow-sm"
          >
            <Check className="w-4 h-4" />
            Mark all as read
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-2">
          {notifications.length > 0 ? (
            <div className="space-y-6">
              
              {urgentNotifications.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider px-2 border-b border-border/50 pb-2">
                    Action Required
                  </h3>
                  <div className="space-y-1">
                    {urgentNotifications.map(renderNotificationItem)}
                  </div>
                </div>
              )}

              {recentNotifications.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2 border-b border-border/50 pb-2">
                    Recent
                  </h3>
                  <div className="space-y-1">
                    {recentNotifications.map(renderNotificationItem)}
                  </div>
                </div>
              )}
              
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">No notifications</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                You're all caught up! You don't have any notifications right now.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
