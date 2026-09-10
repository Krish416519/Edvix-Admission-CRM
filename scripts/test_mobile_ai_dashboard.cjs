const { chromium } = require('playwright');
const path = require('path');

async function testMobile() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const viewports = [
    { name: 'iPhone_SE', width: 375, height: 667 },
    { name: 'iPhone_14_Pro', width: 393, height: 852 },
    { name: 'Galaxy_S20', width: 360, height: 800 },
    { name: 'Compact_Mobile', width: 320, height: 568 }
  ];

  const results = [];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      isMobile: true,
      hasTouch: true
    });
    const page = await context.newPage();

    // Login
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'degreepartners@gmail.com');
    await page.fill('input[type="password"]', '@Krish4165');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);

    // Navigate to /ai-dashboard
    await page.goto('http://localhost:3000/ai-dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Check horizontal scroll / overflow
    const overflow = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      return {
        scrollWidth,
        clientWidth,
        hasOverflow: scrollWidth > clientWidth,
        overflowPixels: scrollWidth - clientWidth
      };
    });

    const screenshotPath = path.join(process.env.USERPROFILE, '.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996', `ai_dashboard_mobile_${vp.width}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Also test opening the AI Call Pitch Modal on mobile to check modal responsiveness
    let modalTested = false;
    const pitchBtn = await page.$('button:has-text("Pitch")');
    if (pitchBtn) {
      await pitchBtn.click();
      await page.waitForTimeout(800);
      const modalScreenshot = path.join(process.env.USERPROFILE, '.gemini/antigravity-ide/brain/68ed6026-d74f-48d3-9e30-152dc6f1f996', `ai_call_pitch_mobile_${vp.width}.png`);
      await page.screenshot({ path: modalScreenshot, fullPage: false });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      modalTested = true;
    }

    results.push({
      device: vp.name,
      viewport: `${vp.width}x${vp.height}`,
      hasOverflow: overflow.hasOverflow,
      overflowPx: overflow.overflowPixels,
      modalTested,
      screenshot: `ai_dashboard_mobile_${vp.width}.png`
    });

    await context.close();
  }

  await browser.close();
  console.log('\n========================================================');
  console.log('       MOBILE RESPONSIVENESS AUDIT: /ai-dashboard       ');
  console.log('========================================================');
  console.table(results);
}

testMobile().catch(console.error);
