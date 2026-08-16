import React, { useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Lead } from '../../../types/schema';
import { cn } from '../../../lib/utils';

interface LeadSortSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sortField: keyof Lead;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof Lead, direction: 'asc' | 'desc') => void;
}

const SORT_OPTIONS: { label: string; field: keyof Lead; direction: 'asc' | 'desc' }[] = [
  { label: 'Newest First', field: 'createdAt', direction: 'desc' },
  { label: 'Oldest First', field: 'createdAt', direction: 'asc' },
  { label: 'Highest Score', field: 'score', direction: 'desc' },
  { label: 'Lowest Score', field: 'score', direction: 'asc' },
  { label: 'Name (A-Z)', field: 'name', direction: 'asc' },
  { label: 'Name (Z-A)', field: 'name', direction: 'desc' },
];

export function LeadSortSheet({
  isOpen, onClose, sortField, sortDirection, onSort
}: LeadSortSheetProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative bg-card w-full h-[60vh] rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <div className="px-4 pb-4 pt-2 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-black text-foreground">Sort Leads</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-8">
          <div className="space-y-2">
            {SORT_OPTIONS.map(option => {
              const isActive = sortField === option.field && sortDirection === option.direction;
              return (
                <button
                  key={option.label}
                  onClick={() => {
                    onSort(option.field, option.direction);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors active:scale-[0.99]",
                    isActive 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-border bg-card hover:bg-muted/50 text-foreground"
                  )}
                >
                  <span className="font-bold">{option.label}</span>
                  {isActive && <Check className="w-5 h-5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
