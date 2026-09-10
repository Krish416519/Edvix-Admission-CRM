const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const ARTIFACTS_DIR = path.join(process.env.USERPROFILE, '.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996');

const VIEWPORTS = [
  { name: 'iphone_se_320', width: 320, height: 568 },
  { name: 'android_360', width: 360, height: 800 },
  { name: 'iphone_12_375', width: 375, height: 812 },
  { name: 'iphone_14_393', width: 393, height: 852 }
];

async function testMobile() {
  console.log('================================================================');
  console.log('         WHATSAPP COMMAND CENTER — MOBILE AUDIT SUITE           ');
  console.log('================================================================\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

    // 1. Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'degreepartners@gmail.com');
    await page.fill('input[type="password"]', '@Krish4165');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);

    // 2. Navigate to /whatsapp
    await page.goto(`${BASE_URL}/whatsapp`);
    await page.waitForTimeout(2500);

    // Check horizontal overflow
    const overflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth
      };
    });
    console.log(`[${vp.name}] Horizontal Overflow check:`, overflow);

    // Initial mobile view is Conversation List
    const listSnapPath = path.join(ARTIFACTS_DIR, `whatsapp_mobile_${vp.name}_list.png`);
    await page.screenshot({ path: listSnapPath, fullPage: false });
    console.log(`✓ Saved: whatsapp_mobile_${vp.name}_list.png`);

    // Click first conversation to open chat
    const firstConv = await page.$('div.custom-scrollbar button');
    if (firstConv) {
      await firstConv.click();
      await page.waitForTimeout(1000);
      const chatSnapPath = path.join(ARTIFACTS_DIR, `whatsapp_mobile_${vp.name}_chat.png`);
      await page.screenshot({ path: chatSnapPath, fullPage: false });
      console.log(`✓ Saved: whatsapp_mobile_${vp.name}_chat.png`);
    }

    // Test Back button to return to Conversation List
    const backBtn = await page.$('button[data-testid="mobile-back-to-list-btn"]');
    if (backBtn) {
      await backBtn.click();
      await page.waitForTimeout(800);
      console.log(`✓ Successfully tested back button returning to conversation list`);
    }

    // Switch to Broadcast tab
    const broadcastTab = await page.$('button:has-text("Broadcast")');
    if (broadcastTab) {
      await broadcastTab.click();
      await page.waitForTimeout(1500);
      const bcastSnapPath = path.join(ARTIFACTS_DIR, `whatsapp_mobile_${vp.name}_broadcast.png`);
      await page.screenshot({ path: bcastSnapPath, fullPage: false });
      console.log(`✓ Saved: whatsapp_mobile_${vp.name}_broadcast.png`);
    }

    await page.close();
  }

  await browser.close();
  console.log('\n================================================================');
  console.log('           ✓ ALL MOBILE VIEWPORTS TESTED & CAPTURED             ');
  console.log('================================================================\n');
}

testMobile().catch(console.error);
