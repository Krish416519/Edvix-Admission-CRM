import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Users, User, ChevronDown, Check, Search, X, Sparkles, UserCheck,
  GraduationCap, ShieldCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { CounselorUser } from '../../types/callFilter';

interface CounselorSelectProps {
  value: string; // 'all' | 'me' | userId
  onChange: (value: string) => void;
  counselors: CounselorUser[];
  className?: string;
  placeholder?: string;
  currentUserId?: string;
}

export const CounselorSelect: React.FC<CounselorSelectProps> = ({
  value,
  onChange,
  counselors,
  className,
  placeholder = 'All Counselors',
  currentUserId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedItem = useMemo(() => {
    if (value === 'all' || value === 'me') return null;
    return counselors.find(c => c.id === value);
  }, [value, counselors]);

  const filteredCounselors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return counselors;
    return counselors.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.designationName && c.designationName.toLowerCase().includes(q)) ||
      (c.roleName && c.roleName.toLowerCase().includes(q))
    );
  }, [counselors, searchQuery]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name.slice(0, 2) || 'U').toUpperCase();
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('all');
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-testid="counselor-select-trigger"
        className={cn(
          "group flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border transition-all duration-200 outline-none select-none",
          value !== 'all'
            ? "bg-primary/10 border-primary/40 text-primary shadow-xs font-semibold"
            : "bg-card hover:bg-muted/60 border-border text-foreground hover:border-border/80 shadow-xs",
          isOpen && "ring-2 ring-primary/30 border-primary shadow-md"
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {value === 'me' ? (
            <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
              Me
            </div>
          ) : value !== 'all' && selectedItem ? (
            <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
              {getInitials(selectedItem.name)}
            </div>
          ) : (
            <Users className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          )}

          <span className="truncate max-w-[150px] text-left">
            {value === 'me'
              ? 'My Calls (Me)'
              : value !== 'all' && selectedItem
              ? selectedItem.name
              : placeholder}
          </span>
        </div>

        {/* Clear icon or chevron */}
        {value !== 'all' ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-primary/20 text-primary transition-colors ml-0.5"
            title="Clear counselor filter"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0",
              isOpen && "rotate-180 text-primary"
            )}
          />
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          data-testid="counselor-dropdown-popover"
          className="absolute z-50 mt-1.5 w-72 sm:w-80 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[380px]"
        >
          {/* Header & Search */}
          <div className="p-2.5 border-b border-border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" /> Filter by Counselor
              </span>
              {value !== 'all' && (
                <button
                  type="button"
                  onClick={() => handleSelect('all')}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background/80 border border-border/70 rounded-lg pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* List Options */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {!searchQuery && (
              <>
                {/* Option: All Counselors */}
                <button
                  type="button"
                  onClick={() => handleSelect('all')}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left",
                    value === 'all'
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-foreground hover:bg-muted/70"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1 rounded-lg",
                      value === 'all' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span>All Counselors</span>
                  </div>
                  {value === 'all' && <Check className="w-4 h-4 shrink-0" />}
                </button>

                {/* Option: My Calls (Me) */}
                <button
                  type="button"
                  onClick={() => handleSelect('me')}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left",
                    value === 'me'
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-foreground hover:bg-muted/70"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1 rounded-lg",
                      value === 'me' ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                    )}>
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold">My Calls Only</span>
                      <span className="text-[10px] opacity-80 block">Logged-in counselor</span>
                    </div>
                  </div>
                  {value === 'me' && <Check className="w-4 h-4 shrink-0" />}
                </button>

                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mt-1 border-t border-border/50 pt-2">
                  Individual Team Members
                </div>
              </>
            )}

            {/* Empty State */}
            {filteredCounselors.length === 0 && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p className="font-medium">No counselors found</p>
                <p className="text-[11px] mt-0.5">Try a different search term</p>
              </div>
            )}

            {/* Counselors list */}
            {filteredCounselors.map((c) => {
              const isSelected = value === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all text-left group/item",
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                      : "text-foreground hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted group-hover/item:bg-primary/10 group-hover/item:text-primary text-foreground"
                    )}>
                      {getInitials(c.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{c.name}</span>
                        {c.designationName && (
                          <span className="text-[9px] bg-muted/80 text-muted-foreground px-1.5 py-0.2 rounded shrink-0">
                            {c.designationName}
                          </span>
                        )}
                      </div>
                      {c.email && (
                        <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
