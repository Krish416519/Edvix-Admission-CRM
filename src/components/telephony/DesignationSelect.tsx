import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  GraduationCap, ShieldCheck, Users, Briefcase, ChevronDown, Check,
  Search, X, Sparkles, Building2, User
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { DesignationOption } from '../../types/callFilter';

interface DesignationSelectProps {
  value: string; // 'all' | designationId
  onChange: (value: string) => void;
  designations: DesignationOption[];
  className?: string;
  placeholder?: string;
}

export const DesignationSelect: React.FC<DesignationSelectProps> = ({
  value,
  onChange,
  designations,
  className,
  placeholder = 'All Designations'
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
      // Auto-focus search input when opened
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

  // Selected item
  const selectedItem = useMemo(() => {
    if (value === 'all') return null;
    return designations.find(d => d.id === value);
  }, [value, designations]);

  // Categorize designations into clean sections
  const categorized = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = designations.filter(d => d.name.toLowerCase().includes(q));

    const admissions = filtered.filter(d => {
      const n = d.name.toLowerCase();
      return n.includes('admission') || n.includes('counselor') || n.includes('academic') || n.includes('team leader');
    });

    const management = filtered.filter(d => {
      const n = d.name.toLowerCase();
      return (n.includes('admin') || n.includes('manager')) && !admissions.includes(d);
    });

    const other = filtered.filter(d => !admissions.includes(d) && !management.includes(d));

    return { admissions, management, other, total: filtered.length };
  }, [designations, searchQuery]);

  const getDesignationIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('counselor') || n.includes('academic')) {
      return <GraduationCap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    }
    if (n.includes('team leader') || n.includes('leader')) {
      return <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    }
    if (n.includes('manager')) {
      return <Briefcase className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
    if (n.includes('admin')) {
      return <ShieldCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
    }
    return <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
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
        data-testid="designation-select-trigger"
        className={cn(
          "group flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border transition-all duration-200 outline-none select-none",
          value !== 'all'
            ? "bg-primary/10 border-primary/40 text-primary shadow-xs font-semibold"
            : "bg-card hover:bg-muted/60 border-border text-foreground hover:border-border/80 shadow-xs",
          isOpen && "ring-2 ring-primary/30 border-primary shadow-md"
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {value !== 'all' && selectedItem ? (
            getDesignationIcon(selectedItem.name)
          ) : (
            <Building2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          )}
          <span className="truncate max-w-[150px] text-left">
            {value !== 'all' && selectedItem ? selectedItem.name : placeholder}
          </span>
        </div>

        {/* Clear (X) icon if active */}
        {value !== 'all' ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-primary/20 text-primary transition-colors ml-0.5"
            title="Clear designation filter"
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
          data-testid="designation-dropdown-popover"
          className="absolute z-50 mt-1.5 w-72 sm:w-80 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[380px]"
        >
          {/* Header & Search */}
          <div className="p-2.5 border-b border-border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Filter by Designation
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
                placeholder="Search designations..."
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

          {/* Options List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {/* "All Designations" default item */}
            {!searchQuery && (
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
                  <span>All Designations</span>
                </div>
                {value === 'all' && <Check className="w-4 h-4 shrink-0" />}
              </button>
            )}

            {/* Empty State */}
            {categorized.total === 0 && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p className="font-medium">No designations found</p>
                <p className="text-[11px] mt-0.5">Try searching with another keyword</p>
              </div>
            )}

            {/* Group 1: Admissions & Counseling */}
            {categorized.admissions.length > 0 && (
              <div className="pt-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1">
                  <span>Admissions & Counseling</span>
                </div>
                <div className="space-y-0.5">
                  {categorized.admissions.map((desig) => {
                    const isSelected = value === desig.id;
                    return (
                      <button
                        key={desig.id}
                        type="button"
                        onClick={() => handleSelect(desig.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all text-left group/item",
                          isSelected
                            ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                            : "text-foreground hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn(
                            "p-1 rounded-lg transition-colors",
                            isSelected ? "bg-primary/20" : "bg-muted/60 group-hover/item:bg-muted"
                          )}>
                            {getDesignationIcon(desig.name)}
                          </div>
                          <span className="truncate">{desig.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {desig.level !== undefined && (
                            <span className="text-[10px] text-muted-foreground/70 font-mono">
                              L{desig.level}
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Group 2: Management & Executive */}
            {categorized.management.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1">
                  <span>Leadership & Management</span>
                </div>
                <div className="space-y-0.5">
                  {categorized.management.map((desig) => {
                    const isSelected = value === desig.id;
                    return (
                      <button
                        key={desig.id}
                        type="button"
                        onClick={() => handleSelect(desig.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all text-left group/item",
                          isSelected
                            ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                            : "text-foreground hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn(
                            "p-1 rounded-lg transition-colors",
                            isSelected ? "bg-primary/20" : "bg-muted/60 group-hover/item:bg-muted"
                          )}>
                            {getDesignationIcon(desig.name)}
                          </div>
                          <span className="truncate">{desig.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {desig.level !== undefined && (
                            <span className="text-[10px] text-muted-foreground/70 font-mono">
                              L{desig.level}
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Group 3: Other Departments */}
            {categorized.other.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1">
                  <span>Other Departments</span>
                </div>
                <div className="space-y-0.5">
                  {categorized.other.map((desig) => {
                    const isSelected = value === desig.id;
                    return (
                      <button
                        key={desig.id}
                        type="button"
                        onClick={() => handleSelect(desig.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all text-left group/item",
                          isSelected
                            ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                            : "text-foreground hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn(
                            "p-1 rounded-lg transition-colors",
                            isSelected ? "bg-primary/20" : "bg-muted/60 group-hover/item:bg-muted"
                          )}>
                            {getDesignationIcon(desig.name)}
                          </div>
                          <span className="truncate">{desig.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
