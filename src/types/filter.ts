export type FilterOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null'
  | 'between'
  | 'before'
  | 'after'
  | 'relative_date'
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month';

export type FilterFieldType = 'string' | 'number' | 'date' | 'boolean' | 'uuid' | 'array';

export type FilterCategory =
  | 'lead_info'
  | 'date'
  | 'call_activity'
  | 'disposition'
  | 'status'
  | 'assignment'
  | 'analytics'
  | 'academic'
  | 'activity';

export interface FilterField {
  id: string;
  label: string;
  category: FilterCategory;
  type: FilterFieldType;
  dbColumn: string | null;
  requiresJoin?: boolean;
  operators: FilterOperator[];
  defaultValue?: any;
}

export interface FilterCondition {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: any;
  value2?: any;
}

export interface FilterGroup {
  id: string;
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
  groups?: FilterGroup[];
}

export interface FilterState {
  rootGroup: FilterGroup;
  sort?: { field: string; direction: 'asc' | 'desc' } | null;
  crmContext?: string;
}

export interface LeadFilterOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  filters?: FilterState;
  role?: string;
  userId?: string;
  isAdvancedFiltersOpen?: boolean;
}

export interface QuickFilter {
  id: string;
  label: string;
  description: string;
  icon?: string;
  category: FilterCategory;
  roleAccess: string[];
  conditions: FilterCondition[];
}
