import { createClient } from '@supabase/supabase-js';
import { fakerEN_IN as faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to generate unique phone numbers for leads
const usedPhones = new Set<string>();
function getUniquePhone(): string {
  let phone: string;
  do {
    phone = '+91' + faker.string.numeric(10);
  } while (usedPhones.has(phone));
  usedPhones.add(phone);
  return phone;
}

const BATCH_SIZE = 1000;

async function run() {
  console.log("🚀 Starting Massive Data Seed Operation...");
  const startTime = Date.now();

  try {
    await createUniversitiesAndCourses();
    const { counselors } = await createUsers();
    const leads = await createLeads(counselors);
    const admissions = await createAdmissions(leads, counselors);
    await createTasks(leads, counselors);
    await createCommunications(leads, counselors);
    await createActivities(leads, counselors);
    await createPaymentsAndInvoices(admissions);

    console.log(`\n✅ Data Seed Completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  } catch (error) {
    console.error("\n❌ Seeding Failed:", error);
  }
}

// -------------------------------------------------------------
// 1. UNIVERSITIES & COURSES
// -------------------------------------------------------------
let universities: any[] = [];
let courses: any[] = [];

async function createUniversitiesAndCourses() {
  console.log("\n🏫 Seeding 80 Universities & Courses...");

  const uniPayloads = Array.from({ length: 80 }).map((_, i) => ({
    name: `${faker.location.city()} ${faker.helpers.arrayElement(['Institute of Technology', 'University', 'Global Campus', 'Business School', 'College of Arts'])}`,
    code: `UNI-${Date.now()}-${i}`,
    country: 'India',
    status: 'Active'
  }));

  const { data: insertedUnis, error: uniError } = await supabase.from('universities').insert(uniPayloads).select();
  if (uniError) throw uniError;
  universities = insertedUnis;

  const coursePayloads = [];
  const levels = ['UG', 'PG', 'MBA', 'MCA', 'MCom', 'BBA', 'BCA', 'BA', 'MA', 'BCom', 'Executive MBA', 'Diploma', 'Certificate'];

  let courseIdx = 0;
  for (const uni of universities) {
    const numCourses = faker.number.int({ min: 5, max: 10 });
    for (let i = 0; i < numCourses; i++) {
      coursePayloads.push({
        university_id: uni.id,
        name: `${faker.helpers.arrayElement(['Computer Science', 'Business Administration', 'Data Science', 'Mechanical Engineering', 'Digital Marketing'])} ${faker.helpers.arrayElement(['B.Tech', 'B.Sc', 'MBA', 'M.Tech', 'Diploma'])}`,
        code: `CRS-${Date.now()}-${courseIdx++}`,
        level: faker.helpers.arrayElement(levels),
        fee: faker.number.int({ min: 50000, max: 1500000 }),
        status: 'Active'
      });
    }
  }

  for (let i = 0; i < coursePayloads.length; i += BATCH_SIZE) {
    const batch = coursePayloads.slice(i, i + BATCH_SIZE);
    const { data: insertedCourses, error: courseErr } = await supabase.from('courses').insert(batch).select();
    if (courseErr) throw courseErr;
    courses.push(...insertedCourses);
  }

  console.log(`✅ Inserted ${universities.length} universities and ${courses.length} courses.`);
}

// -------------------------------------------------------------
// 2. USERS
// -------------------------------------------------------------
async function createUsers() {
  console.log("\n👥 Seeding Users...");

  const roles = [
    { role: 'super_admin', count: 1 },
    { role: 'admin', count: 3 },
    { role: 'manager', count: 5 },
    { role: 'counselor', count: 25 },
    { role: 'accounts', count: 5 },
    { role: 'marketing', count: 5 },
    { role: 'partner', count: 20 },
    { role: 'viewer', count: 5 },
  ];

  const allUsers = [];
  for (const r of roles) {
    for (let i = 0; i < r.count; i++) {
      const email = `test_${r.role}_${i}@edvix-test.com`;

      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { role: r.role }
      });

      if (authError && (authError.message.includes('already exists') || authError.message.includes('already been registered') || authError.code === 'email_exists')) {
        const { data: existing } = await supabase.from('users').select('*').eq('email', email).single();
        if (existing) allUsers.push({ ...existing, role: r.role });
        continue;
      }
      if (authError) throw authError;

      // Insert profile into public.users with full_name column
      const fullName = faker.person.fullName();
      const { error: insertError } = await supabase.from('users').insert({
        id: authUser.user.id,
        email,
        name: fullName,
        full_name: fullName,
        is_active: true
      });
      if (insertError) throw insertError;

      allUsers.push({ id: authUser.user.id, email, full_name: fullName, role: r.role });
    }
  }

  const counselors = allUsers.filter(u => u.role === 'counselor');
  console.log(`✅ Created ${allUsers.length} users (${counselors.length} counselors).`);
  return { allUsers, counselors };
}

// -------------------------------------------------------------
// 3. LEADS (15,000)
// -------------------------------------------------------------
async function createLeads(counselors: any[]) {
  // Clear any existing leads to avoid duplicate lead_number errors
  await supabase.from('leads').delete();

  const leadStatuses = [
    { s: 'Inquiry', p: 0.20 },
    { s: 'Not Connected', p: 0.15 },
    { s: 'Cold', p: 0.25 },
    { s: 'Warm', p: 0.10 },
    { s: 'Hot', p: 0.10 },
    { s: 'Qualified', p: 0.20 },
    { s: 'Application', p: 0.08 },
    { s: 'Docs Pending', p: 0.05 },
    { s: 'Admitted', p: 0.04 },
    { s: 'Rejected', p: 0.05 },
    { s: 'Not Interested', p: 0.03 }
  ];

  const leadSources = ['Google Ads', 'Facebook', 'Instagram', 'LinkedIn', 'Organic', 'Website', 'Referral', 'Partner', 'Walk-in'];

  const getStatus = () => {
    const r = Math.random();
    let cumulative = 0;
    for (const stat of leadStatuses) {
      cumulative += stat.p;
      if (r <= cumulative) return stat.s;
    }
    return 'New';
  };

  const leads = [];
  const payloads = [];

  for (let i = 0; i < 15000; i++) {
    payloads.push({
      lead_number: `EDX-${Date.now()}-${String(i + 1).padStart(6, '0')}`,
      first_name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: getUniquePhone(),
      state: faker.location.state(),
      city: faker.location.city(),
      budget: faker.helpers.arrayElement(['Low', 'Medium', 'High']),
      lead_source: faker.helpers.arrayElement(leadSources),
      lead_status: getStatus(),
      lead_score: faker.number.int({ min: 10, max: 99 }),
      priority: faker.helpers.arrayElement(['High', 'Medium', 'Low']),
      assigned_counselor: faker.helpers.arrayElement(counselors)?.id || null,
      course_id: faker.helpers.arrayElement(courses)?.id || null,
      university_id: faker.helpers.arrayElement(universities)?.id || null,
      created_at: faker.date.recent({ days: 90 }).toISOString()
    });
  }

  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from('leads').insert(batch).select('id, first_name, email, phone, lead_status, assigned_counselor');
    if (error) throw error;
    leads.push(...data);
    process.stdout.write(`\rInserted ${leads.length} / 15000 leads...`);
  }
  console.log("\n✅ Leads inserted.");
  return leads;
}

// -------------------------------------------------------------
// 4. ADMISSIONS (2,500)
// -------------------------------------------------------------
async function createAdmissions(leads: any[], counselors: any[]) {
  console.log("\n🎓 Seeding 2,500 Admissions...");

  const admittedLeads = faker.helpers.shuffle(leads).slice(0, 2500);
  const payloads = admittedLeads.map((lead, i) => ({
    admission_number: `ADM-${Date.now()}-${i}`,
    lead_id: lead.id,
    university_id: faker.helpers.arrayElement(universities).id,
    course_id: faker.helpers.arrayElement(courses).id,
    assigned_counselor: lead.assigned_counselor || faker.helpers.arrayElement(counselors)?.id || null,
    student_name: lead.first_name,
    email: lead.email,
    phone: lead.phone,
    intake: faker.helpers.arrayElement(['Jan 2026', 'Jul 2026']),
    academic_session: '2025-2026',
    admission_status: faker.helpers.arrayElement(['Active', 'Completed', 'On Hold']),
    current_stage: faker.helpers.arrayElement(['Inquiry', 'Admission Confirmed', 'Payment Received', 'Documents Verified']),
    fee_structure: faker.number.int({ min: 50000, max: 200000 }),
    scholarship_amount: faker.number.int({ min: 0, max: 10000 }),
    created_at: faker.date.recent({ days: 45 }).toISOString()
  }));

  const admissions = [];
  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from('admissions').insert(batch).select('id, lead_id');
    if (error) throw error;
    admissions.push(...data);
    process.stdout.write(`\rInserted ${admissions.length} / 2500 admissions...`);
  }
  console.log("\n✅ Admissions inserted.");
  return admissions;
}

// -------------------------------------------------------------
// 5. TASKS (50,000)
// -------------------------------------------------------------
async function createTasks(leads: any[], counselors: any[]) {
  console.log("\n📋 Seeding 50,000 Tasks...");
  const taskTypes = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Reminder', 'Document Collection', 'Fee Reminder', 'Admission Follow-up'];
  const payloads = [];

  for (let i = 0; i < 50000; i++) {
    const lead = faker.helpers.arrayElement(leads);
    payloads.push({
      task_number: `TSK-${Date.now()}-${i}`,
      lead_id: lead.id,
      assigned_user: lead.assigned_counselor || faker.helpers.arrayElement(counselors)?.id || null,
      title: `${faker.helpers.arrayElement(taskTypes)} Follow-up`,
      description: faker.lorem.sentence(),
      task_type: faker.helpers.arrayElement(taskTypes),
      status: faker.helpers.arrayElement(['Completed', 'Pending', 'In Progress', 'Cancelled', 'Overdue']),
      priority: faker.helpers.arrayElement(['High', 'Medium', 'Low', 'Urgent']),
      due_date: faker.date.recent({ days: 90 }).toISOString(),
      created_at: faker.date.recent({ days: 90 }).toISOString()
    });
  }

  let count = 0;
  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('tasks').insert(batch);
    if (error) throw error;
    count += batch.length;
    process.stdout.write(`\rInserted ${count} / 50000 tasks...`);
  }
  console.log("\n✅ Tasks inserted.");
}

// -------------------------------------------------------------
// 6. COMMUNICATIONS (WhatsApp/Email/Notifications)
// -------------------------------------------------------------
async function createCommunications(leads: any[], counselors: any[]) {
  console.log("\n💬 Seeding Communications...");

  // WhatsApp (100k)
  const waPayloads = [];
  for (let i = 0; i < 100000; i++) {
    waPayloads.push({
      lead_id: faker.helpers.arrayElement(leads).id,
      direction: faker.helpers.arrayElement(['inbound', 'outbound']),
      status: faker.helpers.arrayElement(['delivered', 'read', 'failed', 'sent']),
      content: faker.lorem.sentence(),
      created_at: faker.date.recent({ days: 90 }).toISOString()
    });
  }
  for (let i = 0; i < waPayloads.length; i += BATCH_SIZE) {
    const { error } = await supabase.from('whatsapp_messages').insert(waPayloads.slice(i, i + BATCH_SIZE));
    if (error) console.error("WhatsApp Error:", error.message);
    process.stdout.write(`\rInserted WhatsApp: ${Math.min(i + BATCH_SIZE, 100000)} / 100000...`);
  }

  // Emails (60k)
  console.log("");
  const emailPayloads = [];
  for (let i = 0; i < 60000; i++) {
    const lead = faker.helpers.arrayElement(leads);
    emailPayloads.push({
      lead_id: lead.id,
      sender_id: lead.assigned_counselor || faker.helpers.arrayElement(counselors)?.id || null,
      subject: faker.lorem.words(4),
      body: `<p>${faker.lorem.paragraph()}</p>`,
      recipient_email: lead.email || faker.internet.email(),
      status: faker.helpers.arrayElement(['sent', 'opened', 'clicked', 'bounced']),
      folder: 'Sent',
      created_at: faker.date.recent({ days: 90 }).toISOString()
    });
  }
  for (let i = 0; i < emailPayloads.length; i += BATCH_SIZE) {
    const { error } = await supabase.from('email_messages').insert(emailPayloads.slice(i, i + BATCH_SIZE));
    if (error) console.error("Email Error:", error.message);
    process.stdout.write(`\rInserted Emails: ${Math.min(i + BATCH_SIZE, 60000)} / 60000...`);
  }

  // Notifications (120k)
  console.log("");
  const notifPayloads = [];
  for (let i = 0; i < 120000; i++) {
    notifPayloads.push({
      user_id: faker.helpers.arrayElement(counselors)?.id || null,
      title: faker.lorem.words(3),
      message: faker.lorem.sentence(),
      type: faker.helpers.arrayElement(['alert', 'system', 'message', 'task']),
  
      created_at: faker.date.recent({ days: 90 }).toISOString()
    });
  }
  for (let i = 0; i < notifPayloads.length; i += BATCH_SIZE) {
    const { error } = await supabase.from('notifications').insert(notifPayloads.slice(i, i + BATCH_SIZE));
    if (error) console.error("Notif Error:", error.message);
    process.stdout.write(`\rInserted Notifications: ${Math.min(i + BATCH_SIZE, 120000)} / 120000...`);
  }
  console.log("\n✅ Communications inserted.");
}

// -------------------------------------------------------------
// 7. ACTIVITIES (300,000)
// -------------------------------------------------------------
async function createActivities(leads: any[], counselors: any[]) {
  console.log("\n⏱️ Seeding 300,000 Activities Timeline events...");
  const types = ['lead_created', 'status_change', 'note', 'email', 'whatsapp', 'call'];
  const payloads = [];

  for (let i = 0; i < 300000; i++) {
    const lead = faker.helpers.arrayElement(leads);
    payloads.push({
      lead_id: lead.id,
      created_by: lead.assigned_counselor || faker.helpers.arrayElement(counselors)?.id || null,
      type: faker.helpers.arrayElement(types),
      title: faker.lorem.words(3),
      description: faker.lorem.sentence(),
      created_at: faker.date.recent({ days: 90 }).toISOString()
    });
  }

  let count = 0;
  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('lead_activities').insert(batch);
    if (error) throw error;
    count += batch.length;
    process.stdout.write(`\rInserted ${count} / 300000 activities...`);
  }
  console.log("\n✅ Activities inserted.");
}

// -------------------------------------------------------------
// 8. PAYMENTS & INVOICES (5,000)
// -------------------------------------------------------------
async function createPaymentsAndInvoices(admissions: any[]) {
  console.log("\n💳 Seeding 5,000 Payments...");
  const payloads = [];

  for (let i = 0; i < 5000; i++) {
    const adm = faker.helpers.arrayElement(admissions);
    payloads.push({
      payment_number: `PAY-${Date.now()}-${i}`,
      admission_id: adm.id,
      lead_id: adm.lead_id,
      fee_category: faker.helpers.arrayElement(['Registration Fee', 'Semester Fee', 'Exam Fee']),
      amount: faker.number.int({ min: 10000, max: 200000 }),
      net_amount: faker.number.int({ min: 10000, max: 200000 }),
      payment_method: faker.helpers.arrayElement(['Bank Transfer', 'Credit Card', 'UPI', 'Cash']),
      status: faker.helpers.arrayElement(['Completed', 'Pending', 'Failed', 'Refunded']),
      transaction_id: faker.string.uuid(),
      created_at: faker.date.recent({ days: 90 }).toISOString()
    });
  }

  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const { error } = await supabase.from('payments').insert(payloads.slice(i, i + BATCH_SIZE));
    if (error && !error.message.includes("relation \"public.payments\" does not exist")) {
      console.log("Error inserting payment:", error.message);
    }
    process.stdout.write(`\rInserted Payments: ${Math.min(i + BATCH_SIZE, 5000)} / 5000...`);
  }
  console.log("\n✅ Payments inserted.");
}

run();
