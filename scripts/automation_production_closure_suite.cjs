// automation_production_closure_suite.cjs
// Validates automation architecture correctness without modifying production data.

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Read env from .env file
const envContent = fs.readFileSync(".env", "utf8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const [key, ...val] = line.split("=");
  if (key && key.trim()) envVars[key.trim()] = val.join("=").trim().replace(/^"(.*)"$/, "$1");
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const SUPABASE_KEY = envVars.VITE_SUPABASE_ANON_KEY || envVars.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("FAIL: Cannot find Supabase URL or key in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const results = [];
function PASS(name, detail) { results.push({ name, status: "PASS", detail }); console.log(`  PASS  ${name}: ${detail}`); }
function FAIL(name, detail) { results.push({ name, status: "FAIL", detail }); console.error(`  FAIL  ${name}: ${detail}`); }

async function run() {
  console.log("\n=== AUTOMATION PRODUCTION CLOSURE SUITE ===\n");

  // --- BLOCKER 1: automation_triggers table exists ---
  console.log("--- Blocker 1: automation_triggers ---");
  try {
    const { data, error } = await supabase.from("automation_triggers").select("id, event_name, is_active").limit(5);
    if (error) FAIL("automation_triggers.exists", error.message);
    else if (data && data.length > 0) PASS("automation_triggers.exists", `Table exists, ${data.length}+ rows found`);
    else PASS("automation_triggers.exists", "Table exists (empty)");
  } catch (e) { FAIL("automation_triggers.exists", e.message); }

  // --- BLOCKER 2: leads table - assigned_counselor column ---
  console.log("--- Blocker 2: Assign Counselor field ---");
  try {
    const { data, error } = await supabase.from("leads").select("id, assigned_counselor").limit(1);
    if (error) FAIL("leads.assigned_counselor.column", error.message);
    else PASS("leads.assigned_counselor.column", "assigned_counselor column exists on leads table");
  } catch (e) { FAIL("leads.assigned_counselor.column", e.message); }

  // --- lead_assignments table exists ---
  try {
    const { data, error } = await supabase.from("lead_assignments").select("id, assignee_id, is_active").limit(1);
    if (error) FAIL("lead_assignments.exists", error.message);
    else PASS("lead_assignments.exists", "lead_assignments table exists");
  } catch (e) { FAIL("lead_assignments.exists", e.message); }

  // --- BLOCKER 3: automation_workflows has organization_id ---
  console.log("--- Blocker 3: Organization isolation ---");
  try {
    const { data, error } = await supabase.from("automation_workflows").select("id, organization_id").limit(1);
    if (error) FAIL("automation_workflows.org_id.column", error.message);
    else PASS("automation_workflows.org_id.column", "organization_id column exists on automation_workflows");
  } catch (e) { FAIL("automation_workflows.org_id.column", e.message); }

  // --- RLS: unauthenticated cannot access automation_workflows ---
  console.log("--- RLS: automation_workflows tenant isolation ---");
  try {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await anonClient.from("automation_workflows").select("id").limit(1);
    if (error && (error.code === "PGRST301" || error.code === "42501" || error.message.includes("permission"))) {
      PASS("automation_workflows.rls.unauth", "RLS blocks unauthenticated access");
    } else if (data && data.length === 0) {
      PASS("automation_workflows.rls.unauth", "No data returned for unauthenticated (RLS effective)");
    } else {
      FAIL("automation_workflows.rls.unauth", `Unauthenticated returned ${data?.length} rows — RLS may not be enforced`);
    }
  } catch (e) { FAIL("automation_workflows.rls.unauth", e.message); }

  // --- execution_logs table ---
  console.log("--- Execution Logs ---");
  try {
    const { data, error } = await supabase.from("automation_execution_logs").select("id, workflow_id, status, execution_time_ms").limit(5);
    if (error) FAIL("automation_execution_logs.exists", error.message);
    else PASS("automation_execution_logs.exists", `Table exists, ${data?.length} recent entries`);
  } catch (e) { FAIL("automation_execution_logs.exists", e.message); }

  // --- WhatsApp templates table ---
  console.log("--- WhatsApp template validation ---");
  try {
    const { data, error } = await supabase.from("whatsapp_templates").select("id, organization_id").limit(1);
    if (error) FAIL("whatsapp_templates.exists", error.message);
    else PASS("whatsapp_templates.exists", "whatsapp_templates table exists for template validation");
  } catch (e) { FAIL("whatsapp_templates.exists", e.message); }

  // --- email_templates table ---
  try {
    const { data, error } = await supabase.from("email_templates").select("id").limit(1);
    if (error) FAIL("email_templates.exists", error.message);
    else PASS("email_templates.exists", "email_templates table exists for email action");
  } catch (e) { FAIL("email_templates.exists", e.message); }

  // --- users table active counselors ---
  console.log("--- Counselor availability for Assign Counselor ---");
  try {
    const { data, error } = await supabase.from("users").select("id, is_active").eq("is_active", true).limit(5);
    if (error) FAIL("users.active.exists", error.message);
    else if (data && data.length > 0) PASS("users.active.exists", `${data.length} active users found for assignment`);
    else FAIL("users.active.exists", "No active users found — Assign Counselor would fail");
  } catch (e) { FAIL("users.active.exists", e.message); }

  // --- automation_runs table ---
  try {
    const { data, error } = await supabase.from("automation_runs").select("id, status").limit(1);
    if (error) FAIL("automation_runs.exists", error.message);
    else PASS("automation_runs.exists", "automation_runs table exists");
  } catch (e) { FAIL("automation_runs.exists", e.message); }

  // --- Summary ---
  console.log("\n=== RESULTS ===");
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`PASS: ${passed}  FAIL: ${failed}  TOTAL: ${results.length}`);

  if (failed === 0) {
    console.log("\nALL GATES PASS");
  } else {
    console.log("\nSOME GATES FAILED — see above");
  }
}

run().catch(e => { console.error("Suite error:", e.message); process.exit(1); });
