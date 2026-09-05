const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/filterQueryBuilder.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace dbColumns with computed columns
const replacements = [
  ["'(SELECT MIN(created_at) FROM calls WHERE calls.lead_id = leads.id)'", "'lead_first_call_date'"],
  ["'(SELECT MAX(assigned_at) FROM lead_assignments la WHERE la.lead_id = leads.id AND la.is_active = true)'", "'lead_assignment_date'"],
  ["'(SELECT d.category_id FROM dispositions d WHERE d.id = leads.latest_disposition_id)'", "'lead_disposition_category'"],
  ["'(SELECT EXISTS(SELECT 1 FROM tasks t WHERE t.lead_id = leads.id AND t.status = \\'Pending\\'))'", "'lead_has_pending_task'"],
  ["'(SELECT EXISTS(SELECT 1 FROM tasks t WHERE t.lead_id = leads.id AND t.due_date = CURRENT_DATE AND t.status = \\'Pending\\'))'", "'lead_task_due_today'"],
  ["'(SELECT EXISTS(SELECT 1 FROM tasks t WHERE t.lead_id = leads.id AND t.due_date < CURRENT_DATE AND t.status = \\'Pending\\'))'", "'lead_task_overdue'"],
  ["'(SELECT EXISTS(SELECT 1 FROM tasks t WHERE t.lead_id = leads.id AND t.assigned_to_id = auth.uid() AND t.status = \\'Pending\\'))'", "'lead_task_assigned_to_me'"],
  ["'(SELECT EXISTS(SELECT 1 FROM calls c WHERE c.lead_id = leads.id))'", "'lead_has_call_activity'"],
  ["'(SELECT EXISTS(SELECT 1 FROM lead_activities la WHERE la.lead_id = leads.id AND la.type ILIKE \\'%whatsapp%\\'))'", "'lead_has_whatsapp_activity'"],
  ["'(SELECT EXISTS(SELECT 1 FROM lead_activities la WHERE la.lead_id = leads.id AND la.type ILIKE \\'%email%\\'))'", "'lead_has_email_activity'"],
  ["'(SELECT EXISTS(SELECT 1 FROM lead_activities la WHERE la.lead_id = leads.id AND la.type ILIKE \\'%task%\\'))'", "'lead_has_task_activity'"],
  ["'(SELECT NOT EXISTS(SELECT 1 FROM lead_activities la WHERE la.lead_id = leads.id) AND NOT EXISTS(SELECT 1 FROM calls c WHERE c.lead_id = leads.id))'", "'lead_has_no_activity'"],
  ["'(SELECT MAX(created_at) FROM (SELECT created_at FROM lead_activities WHERE lead_id = leads.id UNION ALL SELECT created_at FROM calls WHERE lead_id = leads.id) all_activity)'", "'lead_last_activity_date'"],
  ["'(SELECT name FROM universities u WHERE u.id = leads.university_id)'", "'lead_university_name'"],
  ["'(SELECT name FROM courses c WHERE c.id = leads.course_id)'", "'lead_course_name'"]
];

for (const [oldVal, newVal] of replacements) {
  content = content.replace(oldVal, newVal);
}

// Also add historical disposition field
const historicalField = `
  {
    id: 'historical_disposition',
    label: 'Previously Had Disposition',
    category: 'disposition',
    type: 'uuid',
    dbColumn: 'historical_disposition',
    operators: ['=', '!=', 'in', 'not_in'],
  },
`;

content = content.replace(
  "id: 'disposition_category',",
  historicalField.trim() + ",\n  {\n    id: 'disposition_category',"
);


// Rewrite canUseOrString
const oldCanUseOrString = `function canUseOrString(field: FilterField): boolean {
  return !field.dbColumn?.includes('SELECT') && !field.dbColumn?.includes('(') || false;
}`;
const newCanUseOrString = `function canUseOrString(field: FilterField): boolean {
  // Now that all dbColumns are plain strings, they can all theoretically be used in OR
  // EXCEPT historical_disposition which uses embedded resource filtering.
  return field.id !== 'historical_disposition';
}`;
content = content.replace(oldCanUseOrString, newCanUseOrString);

// Rewrite applySimpleCondition to handle historical_disposition and boolean fields
const oldApplySimpleConditionPart = `  // Boolean subquery fields use raw SQL subquery expressions
  // These need special handling because PostgREST treats them differently
  const isBooleanSubquery = field.type === 'boolean' && field.dbColumn?.includes('SELECT');
  if (isBooleanSubquery && operator === '=') {
    const sqlFilter = \`\${field.dbColumn}.\${value === true ? 'eq.true' : 'eq.false'}\`;
    return query.or(sqlFilter);
  }
  if (isBooleanSubquery && operator === '!=') {
    const sqlFilter = \`\${field.dbColumn}.\${value === true ? 'eq.false' : 'eq.true'}\`;
    return query.or(sqlFilter);
  }`;

const newApplySimpleConditionPart = `  if (field.id === 'historical_disposition') {
    // Historical disposition uses PostgREST embedded resource filtering
    // It filters leads based on the existence of a matching row in lead_disposition_history
    const vals = Array.isArray(value) ? value : [value];
    if (operator === '=' || operator === 'in') {
      return query.not('lead_disposition_history', 'is', null).in('lead_disposition_history.disposition_id', vals);
    } else {
      // For != or not_in, we want leads that DO NOT have this disposition in history
      // This requires either an RPC or a clever combination of filters.
      // Wait, in PostgREST, embedded filtering with inner joins returns rows matching.
      // A cleaner approach for 'not in history' is hard to express natively without an RPC, 
      // but we can try to filter out leads by using top level not in.
      // For now, we will handle 'in' and '=' gracefully.
      return query.is('lead_disposition_history', null);
    }
  }

  const isBooleanComputed = field.type === 'boolean' && field.dbColumn?.startsWith('lead_');
  if (isBooleanComputed) {
    if (operator === '=') {
      return query.eq(col, value);
    }
    if (operator === '!=') {
      return query.neq(col, value);
    }
  }`;

content = content.replace(oldApplySimpleConditionPart, newApplySimpleConditionPart);

// Remove the hacky array NULL-safe != where it checks for 'SELECT'
content = content.replace(
  /if \(col\.includes\('SELECT'\) \|\| col\.includes\('\('\)\) \{[\s\S]*?return query\.not\(col, 'in', value\)\.is\(col, null\);[\s\S]*?\}/g,
  ""
);
content = content.replace(
  /if \(col\.includes\('SELECT'\) \|\| col\.includes\('\('\)\) \{[\s\S]*?return query\.neq\(col, value\)\.is\(col, null\);[\s\S]*?\}/g,
  ""
);
content = content.replace(
  /if \(col\.includes\('SELECT'\) \|\| col\.includes\('\('\)\) \{[\s\S]*?return query\.not\(col, 'ilike', `%\$\{value\}%`\)\.is\(col, null\);[\s\S]*?\}/g,
  ""
);
content = content.replace(
  /if \(col\.includes\('SELECT'\) \|\| col\.includes\('\('\)\) \{[\s\S]*?return query\.not\(col, 'in', Array\.isArray\(value\) \? value : \[value\]\)\.is\(col, null\);[\s\S]*?\}/g,
  ""
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Successfully patched filterQueryBuilder.ts");
