import { useState, useRef, useEffect } from 'react';
import { Bell, Check, X, CheckCircle2, UserPlus, FileText, IndianRupee, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { AppNotification } from '../../types/notification';
import { cn } from '../../lib/utils';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getIcon = (module: string) => {
    switch (module) {
      case 'Leads': return <UserPlus className="w-4 h-4 text-primary" />;
      case 'Finance': return <IndianRupee className="w-4 h-4 text-green-500" />;
      case 'System': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Admissions': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Tasks': return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (id: string, link?: string) => {
    markAsRead(id);
    if (link) {
      navigate(link);
      setIsOpen(false);
    }
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button" 
        className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground transition-colors relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="sr-only">View notifications</span>
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary border-2 border-card text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl bg-card border border-border shadow-lg ring-1 ring-black/5 overflow-hidden z-50 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors cursor-pointer group flex gap-3",
                      notification.status === 'Unread' ? "bg-primary/5" : ""
                    )}
                    onClick={() => handleNotificationClick(notification.id, notification.metadata?.link)}
                  >
                    <div className={cn(
                      "mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-sm",
                      notification.status === 'Unread' ? "bg-background border-primary/20" : "bg-muted border-border"
                    )}>
                      {getIcon(notification.module)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          notification.status === 'Unread' ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {notification.title}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                          {timeAgo(notification.createdAt || new Date().toISOString())}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                    {notification.status === 'Unread' && (
                      <div className="shrink-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-border bg-muted/10 text-center">
            <button 
              onClick={() => {
                navigate('/notifications');
                setIsOpen(false);
              }}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
