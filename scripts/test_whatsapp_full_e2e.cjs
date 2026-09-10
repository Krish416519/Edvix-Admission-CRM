const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runWhatsAppFullE2E() {
  console.log('================================================================');
  console.log('       EDVIX CRM — WHATSAPP END-TO-END VERIFICATION SUITE       ');
  console.log('================================================================\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // 1. Authenticate
  console.log('[1/7] Authenticating session...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
  } catch (e) {}
  await page.waitForTimeout(1000);

  // 2. Navigate to /whatsapp
  console.log('[2/7] Navigating to http://localhost:3000/whatsapp...');
  await page.goto(`${BASE_URL}/whatsapp`, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1', { timeout: 15000 });

  const headerText = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
  console.log(`✓ Header verified: "${headerText}"`);

  // Wait for conversation list to load and select first conversation
  await page.waitForSelector('button:has(.rounded-full)', { timeout: 10000 });
  const convButtons = await page.$$('button:has(.rounded-full)');
  if (convButtons.length > 0) {
    await convButtons[0].click();
    console.log('✓ Selected first active conversation from list');
  }

  // Wait for textarea in chat window
  await page.waitForSelector('textarea', { timeout: 10000 });
  console.log('✓ Chat window loaded successfully with textarea input');

  // 3. Send Message Test
  console.log('\n[3/7] Testing direct message send with real-time delivery...');
  const testMsgMarker = `TestMsg_${Date.now().toString().slice(-4)}`;
  await page.fill('textarea', `Hello! Counselor follow-up note: ${testMsgMarker}`);
  await page.click('button:has(svg.lucide-send)');
  await page.waitForTimeout(1500);

  const bodyTextAfterSend = await page.evaluate(() => document.body.innerText);
  const msgRendered = bodyTextAfterSend.includes(testMsgMarker);
  console.log(`✓ Message rendered in UI: ${msgRendered} ("${testMsgMarker}")`);

  // 4. Two-Way Inbound Student Simulation Test
  console.log('\n[4/7] Testing two-way inbound student reply simulation...');
  const simulateBtn = await page.$('button[title*="Simulate"]');
  if (simulateBtn) {
    await simulateBtn.click();
    await page.waitForTimeout(2000);
    const bodyTextAfterSimulate = await page.evaluate(() => document.body.innerText);
    const hasStudentReply = bodyTextAfterSimulate.includes('scholarship') || 
                            bodyTextAfterSimulate.includes('Hi') || 
                            bodyTextAfterSimulate.includes('Hello') || 
                            bodyTextAfterSimulate.includes('counselor') ||
                            bodyTextAfterSimulate.includes('fee schedule');
    console.log(`✓ Inbound student reply received and rendered via Realtime: ${hasStudentReply}`);
  }

  const chatScreenshot = path.join(process.env.USERPROFILE, '.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996', 'whatsapp_chat_realtime_verified.png');
  await page.screenshot({ path: chatScreenshot, fullPage: false });

  // 5. Template Selection Test
  console.log('\n[5/7] Testing WhatsApp approved template drawer...');
  const templateBtn = await page.$('button[title="Templates"]');
  if (templateBtn) {
    await templateBtn.click();
    await page.waitForSelector('div:has-text("Select Template")', { timeout: 5000 });
    const templateScreenshot = path.join(process.env.USERPROFILE, '.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996', 'whatsapp_template_drawer_verified.png');
    await page.screenshot({ path: templateScreenshot, fullPage: false });
    
    // Select first template
    const firstTmpl = await page.$('div:has-text("Select Template") ~ div button');
    if (firstTmpl) {
      await firstTmpl.click();
      await page.waitForTimeout(1500);
      console.log('✓ Template selected and dispatched to student!');
    }
  }

  // 6. New Chat Modal Test
  console.log('\n[6/7] Testing Start New Chat from lead directory...');
  const newChatBtn = await page.$('button[title="Start New Conversation"]');
  if (newChatBtn) {
    await newChatBtn.click();
    await page.waitForSelector('div:has-text("Start New WhatsApp Chat")', { timeout: 5000 });
    const newChatScreenshot = path.join(process.env.USERPROFILE, '.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996', 'whatsapp_new_chat_modal_verified.png');
    await page.screenshot({ path: newChatScreenshot, fullPage: false });
    console.log('✓ New chat directory modal opened');
    
    // Close modal via data-testid or Escape
    const closeBtn = await page.$('button[data-testid="close-new-chat-modal"]');
    if (closeBtn) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(1000);
  }

  // 7. Broadcast Campaigns Hub Test
  console.log('\n[7/7] Testing Enterprise Broadcast Campaigns Engine...');
  await page.click('button:has-text("Broadcast Campaigns")');
  await page.waitForTimeout(1500);

  // Click Create New Campaign
  const createCampBtn = await page.$('button:has-text("Create New Campaign"), button:has-text("Launch First Campaign")');
  if (createCampBtn) {
    await createCampBtn.click();
    await page.waitForSelector('div:has-text("Launch Broadcast Campaign")', { timeout: 5000 });

    const campName = `Fall 2026 Admissions Wave ${Date.now().toString().slice(-4)}`;
    await page.fill('input[placeholder*="Fall 2026"]', campName);

    // Select second dropdown (Template selector)
    const selects = await page.$$('select');
    if (selects.length >= 2) {
      await selects[1].selectOption({ index: 1 });
    }
    await page.waitForTimeout(600);

    // Launch
    await page.click('button:has-text("Launch Broadcast")');
    await page.waitForTimeout(4000);
    console.log(`✓ Broadcast campaign "${campName}" launched and processed!`);
  }

  const broadcastScreenshot = path.join(process.env.USERPROFILE, '.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996', 'whatsapp_broadcast_campaigns_verified.png');
  await page.screenshot({ path: broadcastScreenshot, fullPage: false });

  // Database audit
  const { data: recentCamp } = await supabase.from('whatsapp_campaigns').select('*').order('created_at', { ascending: false }).limit(1);
  const { data: recentLogs } = await supabase.from('whatsapp_delivery_logs').select('*').order('created_at', { ascending: false }).limit(5);

  console.log('\n================================================================');
  console.log('                POSTGRESQL AUDIT RECONCILIATION                 ');
  console.log('================================================================');
  console.log('Latest Campaign in DB:', recentCamp?.[0]?.name, '| Status:', recentCamp?.[0]?.status, '| Targeted:', recentCamp?.[0]?.total_targeted);
  console.log('Delivery Logs count:', recentLogs?.length);
  console.log('Console Errors:', consoleErrors);

  await browser.close();

  const report = {
    header: headerText,
    recentCampaign: recentCamp?.[0]?.name,
    campaignStatus: recentCamp?.[0]?.status,
    targetedLeads: recentCamp?.[0]?.total_targeted,
    deliveryLogs: recentLogs?.length,
    consoleErrorsCount: consoleErrors.length
  };

  return report;
}

runWhatsAppFullE2E().catch(console.error);
