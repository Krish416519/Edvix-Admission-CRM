const { chromium } = require('playwright');

(async () => {
  console.log('Testing Unified AI Route and Redirect...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();

  // 1. Authenticate
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'degreepartners@gmail.com');
  await page.fill('input[type="password"]', '@Krish4165');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // 2. Test navigation to /ai-intelligence -> should redirect to /ai-dashboard
  await page.goto('http://localhost:3000/ai-intelligence');
  await page.waitForTimeout(1500);
  const redirectedUrl = page.url();
  console.log('Navigated to /ai-intelligence. Final URL:', redirectedUrl);
  const isRedirected = redirectedUrl.endsWith('/ai-dashboard');

  // 3. Check Sidebar links count
  const aiLinks = await page.$$eval('a[href*="ai-"]', links => links.map(l => ({ text: l.innerText.trim(), href: l.getAttribute('href') })));
  console.log('AI links found in navigation:', JSON.stringify(aiLinks, null, 2));
  
  // Verify only 1 link to /ai-dashboard exists (excluding Founder AI Briefing)
  const dashboardLinks = aiLinks.filter(l => l.href === '/ai-dashboard');
  const intelligenceLinks = aiLinks.filter(l => l.href === '/ai-intelligence');

  console.log(`\nResults:
- Redirects to /ai-dashboard: ${isRedirected ? 'PASS' : 'FAIL'}
- /ai-dashboard links count: ${dashboardLinks.length} (Expected: 1)
- /ai-intelligence links in sidebar: ${intelligenceLinks.length} (Expected: 0)
  `);

  if (isRedirected && dashboardLinks.length === 1 && intelligenceLinks.length === 0) {
    console.log('ALL UNIFICATION TESTS PASSED!');
  } else {
    console.error('UNIFICATION TEST FAILED');
  }

  await browser.close();
})();
