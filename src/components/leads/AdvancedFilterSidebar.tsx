import { useEffect, useState } from 'react';
import { FilterField, FilterCondition, FilterGroup, FilterState, FilterOperator } from '../../types/filter';
import { FILTER_FIELDS, FILTER_FIELD_MAP } from '../../lib/filterQueryBuilder';
import { X, Plus, Search, Filter, Bookmark } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDispositions } from '../../hooks/useDispositions';
import { DispositionCategory, Disposition } from '../../types/disposition';
import { useAuth } from '../../contexts/AuthContext';
import { SaveViewModal } from './SaveViewModal';

interface AdvancedFilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filterState: FilterState;
  onFilterChange: (state: FilterState) => void;
  onApply: () => void;
  onClear: () => void;
}

const INTENT_OPTIONS = ['HOT', 'WARM', 'COLD'];
const OPERATOR_LABELS: Record<string, string> = {
  '=': 'Equals',
  '!=': 'Not Equals',
  '>': 'Greater Than',
  '<': 'Less Than',
  '>=': 'Greater Or Equal',
  '<=': 'Less Or Equal',
  'contains': 'Contains',
  'not_contains': 'Not Contains',
  'starts_with': 'Starts With',
  'ends_with': 'Ends With',
  'in': 'In List',
  'not_in': 'Not In List',
  'between': 'Between',
  'before': 'Before',
  'after': 'After',
  'relative_date': 'Relative Date',
  'is_null': 'Is Null',
  'is_not_null': 'Is Not Null',
  'today': 'Today',
  'yesterday': 'Yesterday',
  'this_week': 'This Week',
  'last_week': 'Last Week',
  'this_month': 'This Month',
  'last_month': 'Last Month',
};

const RELATIVE_DATE_OPTIONS = [
  { value: 'last_24_hours', label: 'Last 24 Hours' },
  { value: 'last_3_days', label: 'Last 3 Days' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_15_days', label: 'Last 15 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'last_180_days', label: 'Last 180 Days' },
  { value: 'last_365_days', label: 'Last 365 Days' },
];

const inputClasses = "w-full bg-background border border-border rounded-md px-3 py-1.5 text-[12px] text-foreground font-medium outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60 shadow-sm appearance-none";

export function AdvancedFilterSidebar({
  isOpen,
  onClose,
  filterState,
  onFilterChange,
  onApply,
}: AdvancedFilterSidebarProps) {
  const { user } = useAuth();
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  
  const crmContext = user?.organizations?.find(o => o.id === user.activeOrganizationId)?.crm_context ?? undefined;
  const { categories, dispositions } = useDispositions(crmContext);

  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';
  const isTeamScope = user?.role === 'Manager' || user?.role === 'Team Leader';

  const visibleFilterFields = FILTER_FIELDS.filter((f) => {
    if (isAdmin) return true;
    if (isTeamScope) {
      return !['assigned_counselor', 'task_assigned_to_me'].includes(f.id);
    }
    return !['assigned_counselor', 'task_assigned_to_me', 'has_pending_task', 'task_due_today', 'task_overdue'].includes(f.id);
  });

  const rootGroup = filterState.rootGroup;

  if (!isOpen) return null;

  const handleConditionChange = (condId: string, fieldId: string, operator: FilterOperator, value: any, value2?: any) => {
    const newCond: FilterCondition = {
      id: condId,
      fieldId,
      operator,
      value,
      ...(value2 !== undefined ? { value2 } : {}),
    };
    const newConditions = rootGroup.conditions?.map(c => (c.id === condId ? newCond : c)) || [];
    onFilterChange({ rootGroup: { ...rootGroup, conditions: newConditions } });
  };

  const handleAddCondition = () => {
    const newCond: FilterCondition = {
      id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fieldId: visibleFilterFields[0]?.id || 'lead_status',
      operator: '=',
      value: '',
    };
    onFilterChange({ rootGroup: { ...rootGroup, conditions: [...(rootGroup.conditions || []), newCond] } });
  };

  const handleRemoveCondition = (condId: string) => {
    const newConditions = rootGroup.conditions?.filter(c => c.id !== condId) || [];
    onFilterChange({ rootGroup: { ...rootGroup, conditions: newConditions } });
  };

  const handleGroupLogicChange = (logic: 'AND' | 'OR') => {
    onFilterChange({ rootGroup: { ...rootGroup, logic } });
  };

  const renderValueSelect = (field: FilterField, operator: FilterOperator, value: any, onChange: (val: any) => void) => {
    const isMulti = operator === 'in' || operator === 'not_in';
    const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);

    return (
      <div className="relative">
        <select
          multiple={isMulti}
          value={isMulti ? selectedValues : [value || '']}
          onChange={(e) => {
            if (isMulti) {
              const options = Array.from(e.target.selectedOptions, (o: any) => o.value);
              onChange(options);
            } else {
              onChange(e.target.value);
            }
          }}
          className={cn(inputClasses, isMulti ? "h-20 py-1 pr-4" : "pr-8")}
        >
          <option value="">Select Value...</option>
          {field.id === 'intent' && INTENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {!isMulti && (
           <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-muted-foreground">
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
           </div>
        )}
      </div>
    );
  };

  const renderDispositionCategorySelect = (value: any, onChange: (val: any) => void) => {
    return (
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || '')}
          className={cn(inputClasses, "pr-8")}
        >
          <option value="">All Categories</option>
          {categories.map((cat: DispositionCategory) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-muted-foreground">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
    );
  };

  const renderDispositionSelect = (value: any, onChange: (val: any) => void, operator: FilterOperator) => {
    const isMulti = operator === 'in' || operator === 'not_in';
    const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);

    return (
      <div className="relative">
        <select
          multiple={isMulti}
          value={isMulti ? selectedValues : (value || '')}
          onChange={(e) => {
            if (isMulti) {
              const options = Array.from(e.target.selectedOptions, (o: any) => o.value);
              onChange(options.length > 0 ? options : []);
            } else {
              onChange(e.target.value);
            }
          }}
          className={cn(inputClasses, isMulti ? "h-20 py-1 pr-4" : "pr-8")}
        >
          {!isMulti && <option value="">Select Disposition...</option>}
          {dispositions.map((disp: Disposition) => (
            <option key={disp.id} value={disp.id}>{disp.name}</option>
          ))}
        </select>
        {!isMulti && (
           <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-muted-foreground">
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
           </div>
        )}
      </div>
    );
  };

  const renderDateSpecialValue = (operator: FilterOperator, onChange: (val: any) => void) => {
    if (operator === 'is_null' || operator === 'is_not_null') return null;
    if (['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'].includes(operator)) {
      return <input type="hidden" value={operator} onChange={() => {}} />;
    }
    return (
      <div className="relative">
        <select
          value=""
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClasses, "pr-8")}
        >
          <option value="">Select Timeframe...</option>
          {RELATIVE_DATE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-muted-foreground">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
    );
  };

  const renderDateRangeValue = (value: any, onChange: (val: any, val2?: any) => void) => {
    const start = value?.[0] || '';
    const end = value?.[1] || '';
    return (
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={start}
          onChange={(e) => onChange([e.target.value, end])}
          className={inputClasses}
        />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">To</span>
        <input
          type="date"
          value={end}
          onChange={(e) => onChange([start, e.target.value])}
          className={inputClasses}
        />
      </div>
    );
  };

  const renderValueInput = (
    field: FilterField,
    operator: FilterOperator,
    value: any,
    _value2: any,
    onChange: (val: any, val2?: any) => void
  ) => {
    const isMulti = operator === 'in' || operator === 'not_in';
    const isRange = operator === 'between';

    if (isRange) return renderDateRangeValue(value, onChange);

    if (field.type === 'date' && (operator === '=' || operator === '!=' || operator === 'before' || operator === 'after')) {
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        />
      );
    }

    if (isMulti) {
      const selectedValues = Array.isArray(value) ? value : [];
      if (field.id === 'lead_status') {
        return (
          <select
            multiple
            value={selectedValues}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions, (o: any) => o.value);
              onChange(options.length > 0 ? options : []);
            }}
            className={cn(inputClasses, "h-24 py-1.5")}
          >
            <option value="New">New</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
            <option value="Qualified">Qualified</option>
            <option value="Application">Application</option>
            <option value="Docs Pending">Docs Pending</option>
            <option value="Admitted">Admitted</option>
            <option value="Rejected">Rejected</option>
            <option value="Not Connected">Not Connected</option>
          </select>
        );
      }
      return (
        <input
          type="text"
          value={selectedValues.join(', ')}
          onChange={(e) => onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          className={inputClasses}
          placeholder="Comma-separated values"
        />
      );
    }

    if (field.id === 'lead_status') {
      return (
        <div className="relative">
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value || (operator === '=' ? '' : null))}
            className={cn(inputClasses, "pr-8")}
          >
            <option value="">Select Status...</option>
            <option value="New">New</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
            <option value="Qualified">Qualified</option>
            <option value="Application">Application</option>
            <option value="Docs Pending">Docs Pending</option>
            <option value="Admitted">Admitted</option>
            <option value="Rejected">Rejected</option>
            <option value="Not Connected">Not Connected</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-muted-foreground">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      );
    }

    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClasses}
        placeholder={field.label}
      />
    );
  };

  const renderCondition = (cond: FilterCondition, index: number) => {
    const field = FILTER_FIELD_MAP[cond.fieldId] || FILTER_FIELDS[0];
    const availableOperators = field?.operators || [];
    const operator = availableOperators.includes(cond.operator || '=')
      ? cond.operator
      : availableOperators[0] || '=';

    return (
      <div key={cond.id} className="relative flex flex-col gap-2.5 p-3.5 bg-card border border-border rounded-xl shadow-sm transition-all hover:border-border/80 hover:shadow-md group">
        {/* Remove Button */}
        {rootGroup.conditions && rootGroup.conditions.length > 1 && (
          <button
            onClick={() => handleRemoveCondition(cond.id)}
            className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-all shadow-sm z-10 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100"
            title="Remove filter"
          >
            <X size={12} />
          </button>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-0.5">Filter By</label>
          <div className="relative">
            <select
              value={field?.id || ''}
              onChange={(e) => handleConditionChange(cond.id, e.target.value, operator, cond.value)}
              className={cn(inputClasses, "pr-8")}
            >
              <option value="" disabled>Select Filter</option>
              {visibleFilterFields.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-muted-foreground">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-0.5">Operator</label>
          <div className="relative">
            <select
              value={operator}
              onChange={(e) => handleConditionChange(cond.id, cond.fieldId, e.target.value as FilterOperator, cond.value)}
              className={cn(inputClasses, "pr-8")}
            >
              <option value="" disabled>Select Operator</option>
              {availableOperators.map((op: FilterOperator) => (
                <option key={op} value={op}>{OPERATOR_LABELS[op] || op}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-muted-foreground">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {field && (
          <div className="flex flex-col gap-1 pt-0.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-0.5">Value</label>
            {(() => {
              if (field.id === 'intent') return renderValueSelect(field, operator, cond.value, (val) => handleConditionChange(cond.id, cond.fieldId, operator, val));
              if (field.id === 'disposition_category') return renderDispositionCategorySelect(cond.value, (val) => handleConditionChange(cond.id, cond.fieldId, operator, val));
              if (field.id === 'latest_disposition_id' || field.id === 'historical_disposition') return renderDispositionSelect(cond.value, (val) => handleConditionChange(cond.id, cond.fieldId, operator, val), operator);
              if (field.type === 'date' && (operator === 'relative_date' || operator === 'is_null' || operator === 'is_not_null' || ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'].includes(operator))) {
                return renderDateSpecialValue(operator, (val) => handleConditionChange(cond.id, cond.fieldId, operator, val));
              }
              if (field.type === 'date' && operator === 'between') return renderDateRangeValue(cond.value, (val) => handleConditionChange(cond.id, cond.fieldId, operator, val));
              return renderValueInput(field, operator, cond.value, cond.value2, (val, val2) => handleConditionChange(cond.id, cond.fieldId, operator, val, val2));
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/10 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-full sm:w-[380px] bg-background shadow-2xl z-50 flex flex-col border-l border-border transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0 border-b border-border/60 bg-card/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Filter size={14} />
            </div>
            <h2 className="text-[15px] font-bold text-foreground tracking-tight">Advanced Filters</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground bg-muted/40 p-1.5 rounded-full border border-border/50 transition-all hover:bg-muted hover:scale-105"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 hide-scrollbar relative bg-gradient-to-b from-background to-background/50">
          
          <div className="flex flex-col gap-4">
            {rootGroup.conditions?.map((cond, index) => renderCondition(cond, index))}
          </div>

          <button
            onClick={handleAddCondition}
            className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[12px] hover:bg-primary/20 transition-colors shadow-sm"
          >
            <Plus size={14} /> Add Filter
          </button>

          <div className="h-px bg-border/60 my-6 w-full" />

          {/* Logic Toggle */}
          <div className="flex flex-col gap-2.5 pb-6">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-0.5">Match Rules</span>
            <div className="flex gap-2 p-1 bg-card border border-border rounded-full shadow-sm">
              <button 
                onClick={() => handleGroupLogicChange('OR')}
                className={cn(
                  "flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all",
                  rootGroup.logic === 'OR' 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Any Criteria
              </button>
              <button 
                onClick={() => handleGroupLogicChange('AND')}
                className={cn(
                  "flex-1 py-1.5 rounded-full text-[12px] font-bold transition-all",
                  rootGroup.logic === 'AND' 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                All Criteria
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/60 bg-card/40 backdrop-blur-md shrink-0 flex gap-3">
          <button
            onClick={() => setIsSaveModalOpen(true)}
            disabled={!rootGroup.conditions?.length}
            className="flex-[1] py-2.5 rounded-full bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-secondary-foreground font-bold text-[13px] flex items-center justify-center gap-1.5 transition-all border border-border shadow-sm active:scale-[0.98]"
            title="Save as a Quick View"
          >
            <Bookmark size={15} /> Save
          </button>
          
          <button 
            onClick={() => {
              onApply();
              onClose();
            }} 
            disabled={!rootGroup.conditions?.length}
            className="flex-[2] py-2.5 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary text-primary-foreground font-bold text-[13px] flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.98]"
          >
            <Search size={16} /> Find Leads
          </button>
        </div>

      </div>

      <SaveViewModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        filterState={filterState}
      />
    </>
  );
}
