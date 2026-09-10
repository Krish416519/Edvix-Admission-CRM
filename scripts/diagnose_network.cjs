const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  
  const badReqs = [];
  page.on('response', async res => {
    if (res.status() >= 400) {
      try {
        const body = await res.text();
        badReqs.push({ status: res.status(), url: res.url(), body: body.slice(0, 120), pageUrl: page.url() });
      } catch (e) {
        badReqs.push({ status: res.status(), url: res.url(), pageUrl: page.url() });
      }
    }
  });

  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  for (const r of ['/smart-view/command-center', '/ai-dashboard', '/leads', '/tasks', '/smart-view']) {
    console.log('Visiting', r);
    await page.goto(`http://localhost:3000${r}`);
    await page.waitForTimeout(2000);
  }

  console.log('\nTotal bad requests:', badReqs.length);
  const seen = new Set();
  badReqs.forEach(r => {
    const key = `${r.status} ${r.url} (on ${r.pageUrl})`;
    if (!seen.has(key)) {
      seen.add(key);
      console.log(`[${r.status}] ${r.url}\n  Page: ${r.pageUrl}\n  Body: ${r.body}\n`);
    }
  });

  await browser.close();
})();
