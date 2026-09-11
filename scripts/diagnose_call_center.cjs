const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDatabaseAndRoute() {
  console.log('=== 1. Checking Database Tables & RPCs ===');
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  // Check calls table
  const { data: calls, error: callsErr, count: callsCount } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .limit(5);
  console.log('Calls query:', { count: callsCount, error: callsErr?.message, sampleCount: calls?.length });

  // Check telephony_providers
  const { data: providers, error: provErr } = await supabase
    .from('telephony_providers')
    .select('*');
  console.log('Telephony providers:', { error: provErr?.message, count: providers?.length, providers });

  // Check RPCs
  const { data: stats, error: statsErr } = await supabase.rpc('get_call_center_stats');
  console.log('RPC get_call_center_stats:', { data: stats, error: statsErr?.message });

  const fromStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const toStr = new Date().toISOString();

  const { data: cStats, error: cStatsErr } = await supabase.rpc('get_counselor_call_stats', {
    p_date_from: fromStr,
    p_date_to: toStr
  });
  console.log('RPC get_counselor_call_stats:', { data: cStats, error: cStatsErr?.message });

  const { data: repData, error: repErr } = await supabase.rpc('get_call_reports', {
    p_date_from: fromStr,
    p_date_to: toStr
  });
  console.log('RPC get_call_reports:', { data: repData, error: repErr?.message });

  // Check realtime publication for calls
  const { data: pubTables, error: pubErr } = await supabase.rpc('get_publication_tables', { pub_name: 'supabase_realtime' });
  if (pubErr) {
    // If RPC doesn't exist, query via postgres / raw check
    console.log('Pub check fallback');
  } else {
    console.log('Publication tables:', pubTables);
  }

  console.log('\n=== 2. Testing Browser Navigation to /call-center ===');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const pageErrors = [];
  const consoleLogs = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') consoleLogs.push(msg.text());
  });

  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  await page.goto('http://localhost:3000/call-center');
  await page.waitForTimeout(3000);

  const url = page.url();
  const headings = await page.evaluate(() => Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({ tag: h.tagName, text: h.innerText })));
  console.log('URL:', url);
  console.log('Headings:', headings);
  console.log('Page Errors:', pageErrors);
  console.log('Console Errors:', consoleLogs);

  await browser.close();
}

checkDatabaseAndRoute().catch(console.error);
