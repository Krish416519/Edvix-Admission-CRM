import React, { createContext, useContext, useState, ReactNode } from 'react';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns';

export type DateRangePreset = 
  | 'Today' 
  | 'Yesterday' 
  | 'Last 7 Days' 
  | 'Last 30 Days' 
  | 'Last 90 Days' 
  | 'This Month' 
  | 'Last Month' 
  | 'This Quarter' 
  | 'This Year' 
  | 'Custom';

export type ComparisonPreset = 
  | 'Previous Period' 
  | 'Previous Month' 
  | 'Previous Quarter' 
  | 'Previous Year' 
  | 'None';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface BIContextType {
  datePreset: DateRangePreset;
  setDatePreset: (preset: DateRangePreset) => void;
  customDateRange: DateRange | null;
  setCustomDateRange: (range: DateRange) => void;
  comparisonPreset: ComparisonPreset;
  setComparisonPreset: (preset: ComparisonPreset) => void;
  
  // Computed values
  currentRange: DateRange;
  previousRange: DateRange | null;
}

const BIContext = createContext<BIContextType | undefined>(undefined);

export function BIProvider({ children }: { children: ReactNode }) {
  const [datePreset, setDatePreset] = useState<DateRangePreset>('Last 30 Days');
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(null);
  const [comparisonPreset, setComparisonPreset] = useState<ComparisonPreset>('Previous Period');

  const getCurrentRange = (): DateRange => {
    const today = new Date();
    switch (datePreset) {
      case 'Today':
        return { startDate: startOfDay(today), endDate: endOfDay(today) };
      case 'Yesterday':
        return { startDate: startOfDay(subDays(today, 1)), endDate: endOfDay(subDays(today, 1)) };
      case 'Last 7 Days':
        return { startDate: startOfDay(subDays(today, 7)), endDate: endOfDay(today) };
      case 'Last 30 Days':
        return { startDate: startOfDay(subDays(today, 30)), endDate: endOfDay(today) };
      case 'Last 90 Days':
        return { startDate: startOfDay(subDays(today, 90)), endDate: endOfDay(today) };
      case 'This Month':
        return { startDate: startOfMonth(today), endDate: endOfMonth(today) };
      case 'Last Month':
        return { startDate: startOfMonth(subMonths(today, 1)), endDate: endOfMonth(subMonths(today, 1)) };
      case 'This Quarter':
        return { startDate: startOfQuarter(today), endDate: endOfQuarter(today) };
      case 'This Year':
        return { startDate: startOfYear(today), endDate: endOfYear(today) };
      case 'Custom':
        return customDateRange || { startDate: startOfDay(subDays(today, 30)), endDate: endOfDay(today) };
      default:
        return { startDate: startOfDay(subDays(today, 30)), endDate: endOfDay(today) };
    }
  };

  const getPreviousRange = (curr: DateRange): DateRange | null => {
    if (comparisonPreset === 'None') return null;
    
    const duration = curr.endDate.getTime() - curr.startDate.getTime();
    
    switch (comparisonPreset) {
      case 'Previous Period':
        return {
          startDate: new Date(curr.startDate.getTime() - duration),
          endDate: new Date(curr.endDate.getTime() - duration)
        };
      case 'Previous Month':
        return {
          startDate: subMonths(curr.startDate, 1),
          endDate: subMonths(curr.endDate, 1)
        };
      case 'Previous Quarter':
        return {
          startDate: subQuarters(curr.startDate, 1),
          endDate: subQuarters(curr.endDate, 1)
        };
      case 'Previous Year':
        return {
          startDate: subYears(curr.startDate, 1),
          endDate: subYears(curr.endDate, 1)
        };
      default:
        return null;
    }
  };

  const currentRange = getCurrentRange();
  const previousRange = getPreviousRange(currentRange);

  return (
    <BIContext.Provider
      value={{
        datePreset,
        setDatePreset,
        customDateRange,
        setCustomDateRange,
        comparisonPreset,
        setComparisonPreset,
        currentRange,
        previousRange,
      }}
    >
      {children}
    </BIContext.Provider>
  );
}

export function useBI() {
  const context = useContext(BIContext);
  if (context === undefined) {
    throw new Error('useBI must be used within a BIProvider');
  }
  return context;
}
