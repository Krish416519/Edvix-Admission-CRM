import { useState } from 'react';
import { FilterField, FilterCondition, FilterGroup, FilterState, FilterOperator } from '../../types/filter';
import { FILTER_FIELDS, FILTER_FIELD_MAP } from '../../lib/filterQueryBuilder';
import { X, Plus, Trash2 } from 'lucide-react';
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

export function AdvancedFilterSidebar({
  isOpen,
  onClose,
  filterState,
  onFilterChange,
  onApply,
  onClear,
}: AdvancedFilterSidebarProps) {
  const { user } = useAuth();
  // Derive CRM context strictly from the user's active organization.
  // If it cannot be confirmed, pass undefined — never assume Academic or B2B.
  const crmContext = user?.organizations?.find(o => o.id === user.activeOrganizationId)?.crm_context ?? undefined;
  const { categories, dispositions } = useDispositions(crmContext);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';
  const isTeamScope = user?.role === 'Manager' || user?.role === 'Team Leader';

  const visibleFilterFields = FILTER_FIELDS.filter((f) => {
    if (isAdmin) return true;
    if (isTeamScope) {
      return !['assigned_counselor', 'task_assigned_to_me'].includes(f.id);
    }
    return !['assigned_counselor', 'task_assigned_to_me', 'has_pending_task', 'task_due_today', 'task_overdue'].includes(f.id);
  });

  if (!isOpen) return null;

  const rootGroup = filterState.rootGroup;

  const handleConditionChange = (condId: string, fieldId: string, operator: FilterOperator, value: any, value2?: any) => {
    const newCond: FilterCondition = {
      id: condId,
      fieldId,
      operator,
      value,
      ...(value2 !== undefined ? { value2 } : {}),
    };
    const updatedRootGroup = updateConditionInGroup(rootGroup, condId, newCond);
    onFilterChange({ rootGroup: updatedRootGroup });
  };

  const handleAddCondition = (groupId: string) => {
    const newCond: FilterCondition = {
      id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fieldId: 'lead_status',
      operator: '=',
      value: '',
    };
    const updatedRootGroup = addConditionToGroup(rootGroup, groupId, newCond);
    onFilterChange({ rootGroup: updatedRootGroup });
  };

  const handleAddGroup = () => {
    const newGroup: FilterGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      logic: 'AND',
      conditions: [],
    };
    const updatedRootGroup = addSubGroup(rootGroup, newGroup);
    onFilterChange({ rootGroup: updatedRootGroup });
    setExpandedGroup(newGroup.id);
  };

  const handleRemoveCondition = (groupId: string, condId: string) => {
    const updatedRootGroup = removeConditionFromGroup(rootGroup, groupId, condId);
    onFilterChange({ rootGroup: updatedRootGroup });
  };

  const handleRemoveGroup = (groupId: string) => {
    const updatedRootGroup = removeSubGroup(rootGroup, groupId);
    onFilterChange({ rootGroup: updatedRootGroup });
  };

  const handleGroupLogicChange = (groupId: string, logic: 'AND' | 'OR') => {
    const updatedRootGroup = updateGroupLogic(rootGroup, groupId, logic);
    onFilterChange({ rootGroup: updatedRootGroup });
  };

  const handleClear = () => {
    const emptyState: FilterState = {
      rootGroup: {
        id: `group_root_${Date.now()}`,
        logic: 'AND',
        conditions: [],
      },
    };
    onFilterChange(emptyState);
    onClear();
  };

  const renderCondition = (cond: FilterCondition, groupId: string) => {
    const field = FILTER_FIELD_MAP[cond.fieldId] || FILTER_FIELDS[0];
    const availableOperators = field?.operators || [];
    const operator = availableOperators.includes(cond.operator || '=')
      ? cond.operator
      : availableOperators[0] || '=';

    return (
      <div key={cond.id} className="flex items-end gap-2 mb-2">
        <select
          value={field?.id || ''}
          onChange={(e) => handleConditionChange(cond.id, e.target.value, operator, cond.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200"
        >
          {visibleFilterFields.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>

        <select
          value={operator}
          onChange={(e) => handleConditionChange(cond.id, cond.fieldId, e.target.value as FilterOperator, cond.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200"
        >
          {availableOperators.map((op: FilterOperator) => (
            <option key={op} value={op}>{OPERATOR_LABELS[op] || op}</option>
          ))}
        </select>

        {field && (() => {
          if (field.id === 'intent') {
            return renderValueSelect(field, operator, cond.value, (val) =>
              handleConditionChange(cond.id, cond.fieldId, operator, val)
            );
          }
          if (field.id === 'disposition_category') {
            return renderDispositionCategorySelect(cond.value, (val) =>
              handleConditionChange(cond.id, cond.fieldId, operator, val)
            );
          }
          if (field.id === 'latest_disposition_id' || field.id === 'historical_disposition') {
            return renderDispositionSelect(cond.value, (val) =>
              handleConditionChange(cond.id, cond.fieldId, operator, val), operator
            );
          }
          if (field.type === 'date' && (operator === 'relative_date' || operator === 'is_null' || operator === 'is_not_null' || ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'].includes(operator))) {
            return renderDateSpecialValue(operator, (val) =>
              handleConditionChange(cond.id, cond.fieldId, operator, val)
            );
          }
          if (field.type === 'date' && operator === 'between') {
            return renderDateRangeValue(cond.value, (val) =>
              handleConditionChange(cond.id, cond.fieldId, operator, val)
            );
          }
          return renderValueInput(field, operator, cond.value, cond.value2, (val, val2) =>
            handleConditionChange(cond.id, cond.fieldId, operator, val, val2)
          );
        })()}
        <button
          onClick={() => handleRemoveCondition(groupId, cond.id)}
          className="pb-[2px] text-gray-500 hover:text-red-500"
          title="Remove condition"
        >
          <X size={16} />
        </button>
      </div>
    );
  };

  const renderValueSelect = (field: FilterField, operator: FilterOperator, value: any, onChange: (val: any) => void) => {
    const isMulti = operator === 'in' || operator === 'not_in';
    const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);

    return (
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
        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200 min-w-[120px]"
      >
        {field.id === 'intent'
          ? INTENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)
          : null}
      </select>
    );
  };

  const renderDispositionCategorySelect = (value: any, onChange: (val: any) => void) => {
    return (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || '')}
        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200 min-w-[150px]"
      >
        <option value="">All Categories</option>
        {categories.map((cat: DispositionCategory) => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>
    );
  };

  const renderDispositionSelect = (value: any, onChange: (val: any) => void, operator: FilterOperator) => {
    const isMulti = operator === 'in' || operator === 'not_in';
    const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);

    return (
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
        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200 min-w-[140px]"
      >
        {!isMulti && <option value="">Select Disposition...</option>}
        {dispositions.map((disp: Disposition) => (
          <option key={disp.id} value={disp.id}>{disp.name}</option>
        ))}
      </select>
    );
  };

  const renderDateSpecialValue = (operator: FilterOperator, onChange: (val: any) => void) => {
    if (operator === 'is_null' || operator === 'is_not_null') {
      return null;
    }
    if (['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'].includes(operator)) {
      return <input type="hidden" value={operator} onChange={() => {}} />;
    }
    return (
      <select
        value=""
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200 min-w-[140px]"
      >
        {RELATIVE_DATE_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  };

  const renderDateRangeValue = (value: any, onChange: (val: any, val2?: any) => void) => {
    const start = value?.[0] || '';
    const end = value?.[1] || '';
    return (
      <>
        <input
          type="date"
          value={start}
          onChange={(e) => onChange([e.target.value, end])}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200"
        />
        <span className="text-xs text-gray-500">to</span>
        <input
          type="date"
          value={end}
          onChange={(e) => onChange([start, e.target.value])}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200"
        />
      </>
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

    if (isRange) {
      return renderDateRangeValue(value, onChange);
    }

    if (field.type === 'date') {
      if (operator === '=' || operator === '!=') {
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200"
          />
        );
      }
      if (operator === 'before' || operator === 'after') {
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200"
          />
        );
      }
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
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200 min-w-[140px]"
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
      if (field.id === 'lead_source') {
        return (
          <input
            type="text"
            value={selectedValues.join(', ')}
            onChange={(e) => onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200 min-w-[120px]"
            placeholder="Comma-separated"
          />
        );
      }
      return (
        <input
          type="text"
          value={selectedValues.join(', ')}
          onChange={(e) => onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200 min-w-[120px]"
          placeholder="Comma-separated"
        />
      );
    }

    if (field.id === 'lead_status') {
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || (operator === '=' ? '' : null))}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200 min-w-[140px]"
        >
          <option value="">Select...</option>
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
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-800 dark:text-gray-200 min-w-[120px]"
        placeholder={field.label}
      />
    );
  };

  const hasConditions = (): boolean => {
    const checkGroup = (g: FilterGroup): boolean => {
      if (g.conditions && g.conditions.length > 0) return true;
      return g.groups?.some(sg => checkGroup(sg)) ?? false;
    };
    return checkGroup(rootGroup);
  };

  const renderGroup = (group: FilterGroup, isRootGroup: boolean) => {
    const isExpanded = expandedGroup === group.id || (!isRootGroup && !expandedGroup);
    const conditions = group.conditions || [];
    const subGroups = group.groups || [];

    if (!isExpanded) {
      setExpandedGroup(group.id);
    }

    return (
      <div
        key={group.id}
        className={cn(
          "border rounded-lg p-3 mb-2",
          isRootGroup
            ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/30"
            : "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          {!isRootGroup && (
            <select
              value={group.logic}
              onChange={(e) => handleGroupLogicChange(group.id, e.target.value as 'AND' | 'OR')}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          )}
          <div className="flex-1" />
          <button
            onClick={() => handleAddCondition(group.id)}
            className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:bg-blue-900/30 rounded flex items-center gap-1"
            title="Add condition"
          >
            <Plus size={12} /> Condition
          </button>
          {!isRootGroup && (
            <button
              onClick={() => handleRemoveGroup(group.id)}
              className="ml-1 text-xs px-2 py-1 text-red-600 hover:bg-red-100 rounded"
              title="Remove group"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        <div className="space-y-1">
          {conditions.map((cond) => renderCondition(cond, group.id))}
        </div>

        {subGroups.map((sg) => renderGroup(sg, false))}
      </div>
    );
  };

  return (
    <div className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Advanced Filters</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-1 hide-scrollbar">
        {renderGroup(rootGroup, true)}

        {rootGroup.groups && rootGroup.groups.length > 0 && (
          <button
            onClick={handleAddGroup}
            className="w-full text-sm py-2 px-3 border border-dashed border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            + Add Group
          </button>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2 shrink-0 bg-white dark:bg-gray-900">
        <div className="flex gap-2">
          <button
            onClick={onApply}
            disabled={!hasConditions()}
            className={cn(
              "flex-1 py-2 px-3 text-sm rounded bg-blue-600 text-white hover:bg-blue-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Apply
          </button>
          <button
            onClick={handleClear}
            disabled={!hasConditions()}
            className={cn(
              "flex-1 py-2 px-3 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Clear
          </button>
        </div>
        <button
          onClick={() => setIsSaveModalOpen(true)}
          className="w-full py-2 px-3 text-sm font-semibold rounded-lg border border-blue-600 bg-blue-50 text-blue-700 dark:text-blue-300 dark:border-blue-500 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors shadow-sm"
        >
          Save as View
        </button>
      </div>

      <SaveViewModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        filterState={filterState}
      />
    </div>
  );
}

function updateConditionInGroup(group: FilterGroup, condId: string, newCond: FilterCondition): FilterGroup {
  const newConditions = group.conditions?.map(c => (c.id === condId ? newCond : c));
  const newSubGroups = group.groups?.map(sg => updateConditionInGroup(sg, condId, newCond));
  return { ...group, conditions: newConditions, groups: newSubGroups };
}

function addConditionToGroup(group: FilterGroup, targetGroupId: string, cond: FilterCondition): FilterGroup {
  if (group.id === targetGroupId) {
    return { ...group, conditions: [...(group.conditions || []), cond] };
  }
  return { ...group, groups: group.groups?.map(sg => addConditionToGroup(sg, targetGroupId, cond)) };
}

function addSubGroup(group: FilterGroup, newGroup: FilterGroup): FilterGroup {
  return { ...group, groups: [...(group.groups || []), newGroup] };
}

function removeConditionFromGroup(group: FilterGroup, groupId: string, condId: string): FilterGroup {
  if (group.id === groupId) {
    return { ...group, conditions: group.conditions?.filter(c => c.id !== condId) };
  }
  return { ...group, groups: group.groups?.map(sg => removeConditionFromGroup(sg, groupId, condId)) };
}

function removeSubGroup(group: FilterGroup, targetGroupId: string): FilterGroup {
  if (!group.groups) return group;
  if (group.groups.some(g => g.id === targetGroupId)) {
    return { ...group, groups: group.groups.filter(g => g.id !== targetGroupId) };
  }
  return { ...group, groups: group.groups.map(sg => removeSubGroup(sg, targetGroupId)) };
}

function updateGroupLogic(group: FilterGroup, targetGroupId: string, logic: 'AND' | 'OR'): FilterGroup {
  if (group.id === targetGroupId) {
    return { ...group, logic };
  }
  return { ...group, groups: group.groups?.map(sg => updateGroupLogic(sg, targetGroupId, logic)) };
}
