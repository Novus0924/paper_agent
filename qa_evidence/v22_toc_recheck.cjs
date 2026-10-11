/* v2.2 QA 复核：目录锚点滚动（点击最后一个 toc 项 + 长等待 + 检查目标位置） */
const { chromium } = require('C:/Users/ASUS/Desktop/黑客松/paper_agent/paper-agent-frontend/node_modules/playwright');

const BASE = 'http://127.0.0.1:5174';
const TASK = 'run-20261011-190412-7o3vm8';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/report/${TASK}?mode=live`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const toc = page.locator('nav[class*="toc"], nav[aria-label*="目录"]').first();
  await toc.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1200);

  const before = await page.evaluate(() => window.scrollY);
  const links = toc.locator('a');
  const n = await links.count();
  await links.nth(n - 1).click(); // 点最后一项"审计信息"或最后章节，滚动距离最明显
  await page.waitForTimeout(2500); // 平滑滚动充分完成
  const after = await page.evaluate(() => window.scrollY);
  // 目标元素是否进入视口
  const inView = await page.evaluate(() => {
    const links = document.querySelectorAll('nav[class*="toc"] a');
    const href = links[links.length - 1]?.getAttribute('href');
    if (!href) return 'no-href';
    const el = document.getElementById(href.slice(1));
    if (!el) return 'no-target';
    const r = el.getBoundingClientRect();
    return r.top >= -50 && r.top < window.innerHeight ? 'in-view' : `out(top=${Math.round(r.top)})`;
  });
  console.log(`tocLinks=${n} scrollY before=${before} after=${after} target=${inView}`);
  console.log(after > before || inView === 'in-view' ? 'TOC-SCROLL PASS' : 'TOC-SCROLL FAIL');
  await browser.close();
})();
