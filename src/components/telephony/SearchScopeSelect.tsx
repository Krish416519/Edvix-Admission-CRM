import React, { useState, useRef, useEffect } from 'react';
import { Globe, Phone, User, GraduationCap, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CallSearchField } from '../../types/callFilter';

interface SearchScopeSelectProps {
  value: CallSearchField;
  onChange: (scope: CallSearchField) => void;
  className?: string;
}

const SCOPES: { id: CallSearchField; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'all',
    label: 'All Fields',
    icon: <Globe className="w-3.5 h-3.5 text-indigo-500" />,
    description: 'Name, phone, counselor, notes, transcript'
  },
  {
    id: 'phone',
    label: 'By Number',
    icon: <Phone className="w-3.5 h-3.5 text-emerald-500" />,
    description: 'Direct phone number match'
  },
  {
    id: 'lead',
    label: 'By Person',
    icon: <User className="w-3.5 h-3.5 text-blue-500" />,
    description: 'Student / applicant name'
  },
  {
    id: 'counselor',
    label: 'By Counselor',
    icon: <GraduationCap className="w-3.5 h-3.5 text-amber-500" />,
    description: 'Counselor or agent name'
  }
];

export const SearchScopeSelect: React.FC<SearchScopeSelectProps> = ({
  value,
  onChange,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  const activeScope = SCOPES.find(s => s.id === value) || SCOPES[0];

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="search-scope-select-trigger"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 select-none",
          isOpen
            ? "bg-primary/10 border-primary text-primary shadow-xs ring-2 ring-primary/20"
            : "bg-muted/60 hover:bg-muted border-border text-foreground hover:border-border/80"
        )}
      >
        <span className="shrink-0">{activeScope.icon}</span>
        <span className="whitespace-nowrap">{activeScope.label}</span>
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180 text-primary")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 left-0 w-60 rounded-xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-1.5 animate-in fade-in zoom-in-95 duration-150 space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Search Target Field
          </div>
          {SCOPES.map((scope) => {
            const isSelected = value === scope.id;
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => {
                  onChange(scope.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all text-left group",
                  isSelected
                    ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                    : "text-foreground hover:bg-muted/70"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-muted group-hover:bg-card transition-colors">
                    {scope.icon}
                  </div>
                  <div>
                    <span className="font-medium block">{scope.label}</span>
                    <span className="text-[10px] text-muted-foreground block">{scope.description}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
