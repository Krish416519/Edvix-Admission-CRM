const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'supabase/migrations/00000000000102_university_ops_hub.sql');
let content = fs.readFileSync(filePath, 'utf8');

// Remove organization_id column definitions
content = content.replace(/\s*organization_id\s+UUID\s+REFERENCES\s+public\.organizations\(id\)\s+ON\s+DELETE\s+CASCADE,/g, '');
content = content.replace(/\s*organization_id\s+UUID\s+REFERENCES\s+public\.organizations\(id\)\s+ON\s+DELETE\s+SET\s+NULL,/g, '');
content = content.replace(/\s*organization_id\s+UUID\s+REFERENCES\s+public\.organizations\(id\),/g, '');

// Remove organization_id indexes
content = content.replace(/CREATE INDEX IF NOT EXISTS idx_uni_submissions_org ON public\.university_submissions\(organization_id\);\n/g, '');

// Remove get_current_org_id function
content = content.replace(/-- Helper: get current user's organization_id[\s\S]*?\$\$ LANGUAGE sql SECURITY DEFINER;\n/g, '');

// Remove organization_id checks in RLS policies
content = content.replace(/\s*AND organization_id = public\.get_current_org_id\(\)/g, '');
content = content.replace(/\s*organization_id = public\.get_current_org_id\(\)\s*AND\s*/g, '');
content = content.replace(/organization_id = public\.get_current_org_id\(\)/g, 'true');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed SQL file');
