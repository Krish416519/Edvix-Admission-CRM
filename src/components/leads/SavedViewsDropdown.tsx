import React, { useState, useRef, useEffect } from 'react';
import { Bookmark, ChevronDown, Check, Trash2, Edit2, Share2, Eye, Shield } from 'lucide-react';
import { useSavedViews, SavedView, ViewVisibility } from '../../hooks/useSavedViews';
import { FilterState } from '../../types/filter';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { useConfirm } from '../ConfirmDialog';

interface SavedViewsDropdownProps {
  currentFilterState: FilterState | undefined;
  onSelectView: (view: SavedView) => void;
  onClearView: () => void;
}

export function SavedViewsDropdown({ currentFilterState, onSelectView, onClearView }: SavedViewsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { views, isLoading, deleteView } = useSavedViews();
  const { user, hasRole } = useAuth();
  const { confirm } = useConfirm();

  // We could track "activeViewId" but since filters can be freely modified,
  // it's tricky to know if the current filter EXACTLY matches a view.
  // For now, we just list them.

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = async (e: React.MouseEvent, view: SavedView) => {
    e.stopPropagation();
    if (await confirm({
      title: 'Delete Saved View',
      message: `Are you sure you want to delete "${view.name}"?`,
      confirmLabel: 'Delete',
      variant: 'danger'
    })) {
      await deleteView(view.id);
    }
  };

  const getVisibilityIcon = (visibility: ViewVisibility) => {
    switch (visibility) {
      case 'private': return <Shield className="w-3 h-3 text-gray-400" title="Private" />;
      case 'team': return <Share2 className="w-3 h-3 text-blue-400" title="Team" />;
      case 'organization': return <Eye className="w-3 h-3 text-green-400" title="Organization" />;
      default: return null;
    }
  };

  const myViews = views.filter(v => v.user_id === user?.id);
  const sharedViews = views.filter(v => v.user_id !== user?.id);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <Bookmark className="w-4 h-4 text-primary" />
        <span>Saved Views</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 py-2">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">Loading...</div>
          ) : views.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              No saved views yet. Create one from the Advanced Filter sidebar.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {myViews.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    My Views
                  </div>
                  {myViews.map(view => (
                    <div
                      key={view.id}
                      className="group flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => {
                        onSelectView(view);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{view.name}</span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {getVisibilityIcon(view.visibility)}
                          <span className="capitalize">{view.visibility}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDelete(e, view)}
                          className="p-1 text-muted-foreground hover:text-red-500 rounded"
                          title="Delete view"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sharedViews.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t border-border mt-1 pt-2">
                    Shared With Me
                  </div>
                  {sharedViews.map(view => (
                    <div
                      key={view.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => {
                        onSelectView(view);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{view.name}</span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {getVisibilityIcon(view.visibility)}
                          <span className="capitalize">{view.visibility}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
