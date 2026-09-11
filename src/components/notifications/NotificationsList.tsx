import { useState, useMemo, useRef, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { 
  Bell, 
  CheckCircle2, 
  UserPlus, 
  FileText, 
  IndianRupee, 
  Clock, 
  Check, 
  CheckCheck,
  Trash2, 
  Volume2, 
  VolumeX, 
  Search, 
  Filter, 
  RefreshCw, 
  Sparkles, 
  ArrowRight, 
  ShieldAlert, 
  AlertCircle, 
  X, 
  GraduationCap,
  Square,
  CheckSquare,
  Eye,
  EyeOff,
  Music,
  Play,
  ChevronDown
} from 'lucide-react';
import { AppNotification, NotificationPriority } from '../../types/notification';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

type CategoryTab = 'all' | 'unread' | 'leads' | 'tasks' | 'admissions' | 'finance' | 'system';

export function NotificationsList() {
  const { 
    notifications, 
    unreadCount, 
    markAllAsRead, 
    markAsRead, 
    markAsUnread, 
    deleteNotification, 
    clearAllRead,
    markMultipleAsRead,
    markMultipleAsUnread,
    deleteMultiple,
    soundEnabled,
    toggleSound,
    selectedTone,
    setSelectedTone,
    soundTones,
    playTonePreview,
    playTestChime,
    refreshNotifications 
  } = useNotifications();

  const navigate = useNavigate();

  // State management
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTonePickerOpen, setIsTonePickerOpen] = useState(false);
  const tonePickerRef = useRef<HTMLDivElement>(null);

  // Close tone picker on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tonePickerRef.current && !tonePickerRef.current.contains(e.target as Node)) {
        setIsTonePickerOpen(false);
      }
    };
    if (isTonePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTonePickerOpen]);

  // Manual refresh trigger
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshNotifications();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Icon resolver with module color accents
  const getModuleConfig = (module?: string, category?: string) => {
    const mod = (module || '').toLowerCase();
    const cat = (category || '').toLowerCase();

    if (mod === 'leads' || cat.includes('lead')) {
      return {
        icon: <UserPlus className="w-5 h-5 text-indigo-500" />,
        bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
        badge: 'Leads'
      };
    }
    if (mod === 'admissions' || cat.includes('admission') || cat.includes('enrollment')) {
      return {
        icon: <GraduationCap className="w-5 h-5 text-purple-500" />,
        bg: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
        badge: 'Admissions'
      };
    }
    if (mod === 'tasks' || cat.includes('task')) {
      return {
        icon: <FileText className="w-5 h-5 text-sky-500" />,
        bg: 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400',
        badge: 'Tasks'
      };
    }
    if (mod === 'finance' || cat.includes('fee') || cat.includes('payment')) {
      return {
        icon: <IndianRupee className="w-5 h-5 text-emerald-500" />,
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        badge: 'Finance'
      };
    }
    if (mod === 'ai' || cat.includes('ai') || cat.includes('insight')) {
      return {
        icon: <Sparkles className="w-5 h-5 text-rose-500" />,
        bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
        badge: 'AI Engine'
      };
    }
    return {
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
      badge: 'System'
    };
  };

  // Priority badge resolver
  const renderPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Critical
          </span>
        );
      case 'High':
      case 'Urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            Low
          </span>
        );
    }
  };

  // Direct action navigation resolver
  const handleActionNavigate = (notification: AppNotification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    markAsRead(notification.id);

    if (notification.metadata?.link) {
      navigate(notification.metadata.link);
      return;
    }
    if (notification.module?.toLowerCase() === 'leads' && notification.moduleRecordId) {
      navigate(`/all-leads/${notification.moduleRecordId}`);
      return;
    }
    if (notification.module?.toLowerCase() === 'tasks' && notification.moduleRecordId) {
      navigate(`/tasks?taskId=${notification.moduleRecordId}`);
      return;
    }
  };

  // Get action label if applicable
  const getActionLabel = (notification: AppNotification) => {
    if (notification.module?.toLowerCase() === 'leads' && notification.moduleRecordId) {
      return 'Open Lead';
    }
    if (notification.module?.toLowerCase() === 'tasks' && notification.moduleRecordId) {
      return 'View Task';
    }
    if (notification.metadata?.link) {
      return 'View Details';
    }
    return null;
  };

  // Relative time helper
  const formatTime = (dateString?: string) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Category counts
  const counts = useMemo(() => {
    const unread = notifications.filter(n => n.status === 'Unread').length;
    const leads = notifications.filter(n => (n.module || '').toLowerCase() === 'leads').length;
    const tasks = notifications.filter(n => (n.module || '').toLowerCase() === 'tasks').length;
    const admissions = notifications.filter(n => (n.module || '').toLowerCase() === 'admissions').length;
    const finance = notifications.filter(n => (n.module || '').toLowerCase() === 'finance').length;
    const system = notifications.filter(n => ['system', 'ai'].includes((n.module || '').toLowerCase())).length;
    const urgent = notifications.filter(n => n.status === 'Unread' && ['High', 'Critical', 'Urgent'].includes(n.priority || '')).length;

    return {
      all: notifications.length,
      unread,
      leads,
      tasks,
      admissions,
      finance,
      system,
      urgent
    };
  }, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Tab filter
      if (activeTab === 'unread' && notification.status !== 'Unread') return false;
      if (activeTab === 'leads' && (notification.module || '').toLowerCase() !== 'leads') return false;
      if (activeTab === 'tasks' && (notification.module || '').toLowerCase() !== 'tasks') return false;
      if (activeTab === 'admissions' && (notification.module || '').toLowerCase() !== 'admissions') return false;
      if (activeTab === 'finance' && (notification.module || '').toLowerCase() !== 'finance') return false;
      if (activeTab === 'system' && !['system', 'ai'].includes((notification.module || '').toLowerCase())) return false;

      // Status filter
      if (statusFilter === 'unread' && notification.status !== 'Unread') return false;
      if (statusFilter === 'read' && notification.status !== 'Read') return false;

      // Priority filter
      if (priorityFilter !== 'all') {
        if (priorityFilter === 'High') {
          if (!['High', 'Urgent'].includes(notification.priority || '')) return false;
        } else if (notification.priority !== priorityFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (notification.title || '').toLowerCase().includes(query);
        const msgMatch = (notification.message || '').toLowerCase().includes(query);
        const modMatch = (notification.module || '').toLowerCase().includes(query);
        const catMatch = (notification.category || '').toLowerCase().includes(query);
        if (!titleMatch && !msgMatch && !modMatch && !catMatch) return false;
      }

      return true;
    });
  }, [notifications, activeTab, statusFilter, priorityFilter, searchQuery]);

  // Bulk selection helpers
  const allFilteredSelected = filteredNotifications.length > 0 && filteredNotifications.every(n => selectedIds.has(n.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkMarkRead = async () => {
    const ids = Array.from(selectedIds);
    await markMultipleAsRead(ids);
    setSelectedIds(new Set());
  };

  const handleBulkMarkUnread = async () => {
    const ids = Array.from(selectedIds);
    await markMultipleAsUnread(ids);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await deleteMultiple(ids);
    setSelectedIds(new Set());
  };

  const resetFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
    setPriorityFilter('all');
    setStatusFilter('all');
  };

  const activeToneOption = soundTones.find(t => t.id === selectedTone) || soundTones[0];

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full px-3 sm:px-6 py-4 space-y-5 animate-in fade-in duration-300">
      
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Notifications & Alerts
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 animate-pulse">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time multi-channel alerts, task due updates, and student activity log.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-card border border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all shadow-xs"
            title="Refresh notifications"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-primary")} />
          </button>

          <button
            onClick={toggleSound}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs",
              soundEnabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
            )}
            title={soundEnabled ? "Audio chime active" : "Audio chime muted"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? 'Chime ON' : 'Chime Muted'}</span>
          </button>

          {/* Phone Sound Selector Dropdown */}
          <div className="relative" ref={tonePickerRef}>
            <button
              onClick={() => setIsTonePickerOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted/60 text-xs font-semibold text-foreground transition-all shadow-xs"
              title="Choose phone ringtone for notifications"
            >
              <Music className="w-3.5 h-3.5 text-primary" />
              <span>{activeToneOption.name}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isTonePickerOpen && "rotate-180")} />
            </button>

            {isTonePickerOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-card border border-border shadow-2xl z-50 p-2.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-2 border-b border-border/60 flex items-center justify-between mb-1.5">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Phone Sound Tone</h4>
                    <p className="text-[11px] text-muted-foreground">Select notification chime like on a phone</p>
                  </div>
                  <button
                    onClick={() => setIsTonePickerOpen(false)}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {soundTones.map(tone => {
                    const isSelected = selectedTone === tone.id;
                    return (
                      <div
                        key={tone.id}
                        onClick={() => {
                          setSelectedTone(tone.id);
                          setIsTonePickerOpen(false);
                        }}
                        className={cn(
                          "p-2 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer transition-colors text-xs group",
                          isSelected
                            ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                            : "hover:bg-muted/60 text-foreground border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playTonePreview(tone.id);
                            }}
                            className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                            title={`Preview ${tone.name}`}
                          >
                            <Play className="w-3 h-3 fill-current ml-0.5" />
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold truncate">{tone.name}</p>
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-bold uppercase tracking-wider">
                                {tone.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">{tone.description}</p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between px-1">
                  <button
                    onClick={toggleSound}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {soundEnabled ? <Volume2 className="w-3 h-3 text-emerald-500" /> : <VolumeX className="w-3 h-3 text-rose-500" />}
                    <span>{soundEnabled ? 'Chime Active' : 'Sound Muted'}</span>
                  </button>
                  <button
                    onClick={() => playTestChime()}
                    className="text-[11px] font-semibold text-primary hover:text-primary-hover flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Test Current</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={playTestChime}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted/60 text-xs font-medium text-foreground transition-all shadow-xs"
            title="Preview alert sound"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Test Chime</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-all"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          )}

          {notifications.some(n => n.status === 'Read') && (
            <button
              onClick={clearAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30 text-xs font-medium text-muted-foreground transition-all shadow-xs"
              title="Delete all read notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Read</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total In Inbox</p>
            <p className="text-2xl font-black tracking-tight text-foreground mt-1">{counts.all}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Bell className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Unread Alerts</p>
            <p className="text-2xl font-black tracking-tight text-primary mt-1">{counts.unread}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Action Required</p>
            <p className="text-2xl font-black tracking-tight text-rose-500 mt-1">{counts.urgent}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => setIsTonePickerOpen(true)}
          className="p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors group"
          title="Click to customize notification sound"
        >
          <div>
            <p className="text-xs font-medium text-muted-foreground">Audio Broadcast</p>
            <p className="text-sm font-bold text-foreground mt-1.5 flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", soundEnabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
              {soundEnabled ? 'Chime Active' : 'Sound Muted'}
            </p>
            <p className="text-[11px] text-primary font-semibold mt-1 flex items-center gap-1 group-hover:underline">
              <Music className="w-3 h-3" />
              <span>{activeToneOption.name} ▾</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform">
            <Volume2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Category Tabs Container */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs font-semibold">
          {[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'unread', label: 'Unread', count: counts.unread },
            { id: 'leads', label: 'Leads', count: counts.leads },
            { id: 'tasks', label: 'Tasks', count: counts.tasks },
            { id: 'admissions', label: 'Admissions', count: counts.admissions },
            { id: 'finance', label: 'Finance', count: counts.finance },
            { id: 'system', label: 'AI & System', count: counts.system },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CategoryTab)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap shadow-2xs shrink-0",
                activeTab === tab.id
                  ? "bg-foreground text-background border-foreground font-bold"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                activeTab === tab.id
                  ? "bg-background text-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Priority Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notifications by title, student, task..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-card border border-border rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-card border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High / Urgent</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Status Filter Toggle */}
            <div className="flex items-center bg-card border border-border rounded-xl p-1 shadow-2xs">
              {(['all', 'unread', 'read'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setStatusFilter(mode)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors",
                    statusFilter === mode
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bulk Actions Bar (When items are selected) */}
      {selectedIds.size > 0 && (
        <div className="p-3 rounded-2xl bg-card border-2 border-primary/40 shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {selectedIds.size}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              Notifications selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkMarkRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium text-foreground transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-primary" />
              <span>Mark Read</span>
            </button>

            <button
              onClick={handleBulkMarkUnread}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium text-foreground transition-all"
            >
              <EyeOff className="w-3.5 h-3.5 text-amber-500" />
              <span>Mark Unread</span>
            </button>

            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Dismiss Selected</span>
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Select All & Summary Info Bar */}
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors"
          >
            {allFilteredSelected ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4 text-muted-foreground" />
            )}
            <span>Select All Filtered ({filteredNotifications.length})</span>
          </button>
        </div>
        <span>Showing {filteredNotifications.length} of {notifications.length} alerts</span>
      </div>

      {/* Notification Items List */}
      <div className="space-y-3 pb-8">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(notification => {
            const config = getModuleConfig(notification.module, notification.category);
            const isSelected = selectedIds.has(notification.id);
            const isUnread = notification.status === 'Unread';
            const actionLabel = getActionLabel(notification);

            return (
              <div
                key={notification.id}
                data-testid="notification-card"
                onClick={() => handleActionNavigate(notification)}
                className={cn(
                  "group relative p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex gap-3 sm:gap-4 shadow-xs",
                  isUnread
                    ? "bg-card border-primary/30 hover:border-primary/50 ring-1 ring-primary/5"
                    : "bg-card/70 hover:bg-card border-border/80 hover:border-border",
                  isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20"
                )}
              >
                {/* Selection Checkbox */}
                <div 
                  className="pt-1 shrink-0"
                  data-testid="notification-checkbox"
                  onClick={(e) => toggleSelect(notification.id, e)}
                >
                  <button
                    type="button"
                    aria-label={`Select notification ${notification.title}`}
                    className="p-1 rounded-md text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                    )}
                  </button>
                </div>

                {/* Module Avatar */}
                <div className={cn(
                  "shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border shadow-xs transition-transform group-hover:scale-105",
                  config.bg
                )}>
                  {config.icon}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Top Metadata & Time Row - Designed to never overlap */}
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {config.badge}
                      </span>
                      {notification.priority && renderPriorityBadge(notification.priority)}
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground shrink-0" title={notification.createdAt}>
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>

                  {/* Notification Title */}
                  <h3 className={cn(
                    "text-sm sm:text-base font-semibold tracking-tight break-words",
                    isUnread ? "text-foreground font-bold" : "text-foreground/90"
                  )}>
                    {notification.title}
                  </h3>

                  {/* Notification Message */}
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words line-clamp-2">
                    {notification.message}
                  </p>

                  {/* Action Bar (Direct Routing & Quick Controls) */}
                  <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                    <div>
                      {actionLabel && (
                        <button
                          onClick={(e) => handleActionNavigate(notification, e)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover transition-colors group/btn py-1"
                        >
                          <span>{actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick Item Action Buttons */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {isUnread ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center gap-1"
                          title="Mark as read"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Mark read</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsUnread(notification.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center gap-1"
                          title="Mark as unread"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Mark unread</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                        title="Dismiss notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* Empty States */
          <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-card border border-border text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground">
              {searchQuery || activeTab !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all' ? (
                <Filter className="w-8 h-8" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {searchQuery || activeTab !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all'
                ? 'No matching notifications'
                : 'All caught up!'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mt-1">
              {searchQuery || activeTab !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all'
                ? 'No notifications matched your active filters or search terms. Try clearing your filters.'
                : 'You have zero unread alerts. You are completely up to date with your CRM pipeline!'}
            </p>

            {(searchQuery || activeTab !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90 transition-all"
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
