/* v2.2 QA 脚本2：总览页（搜索/已留痕/再次研究预填）+ 证据页（tier/kind/引用复制）（live 模式） */
const { chromium } = require('C:/Users/ASUS/Desktop/黑客松/paper_agent/paper-agent-frontend/node_modules/playwright');

const BASE = 'http://127.0.0.1:5174';
const TASK = 'run-20261011-190412-7o3vm8';
const GOAL = '检索并综述固态电解质界面阻抗的表征方法';
const OUT = __dirname;

(async () => {
  const results = [];
  const consoleErrors = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`);
  };

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 200)));

  try {
    // ---------- C3 总览页 ----------
    await page.goto(`${BASE}/?mode=live`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const search = page.locator('input[type="search"]').first();
    await search.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1500); // 任务列表加载

    // 全量行数（分页内）
    const rowSel = 'tr[data-task-id]';
    const beforeRows = await page.locator(rowSel).count();

    // 搜索"固态"（300ms 防抖）
    await search.fill('固态');
    await page.waitForTimeout(900);
    const afterRows = await page.locator(rowSel).count();
    const listText = await page.locator('main').innerText();
    const zhShown = listText.includes(GOAL);
    const enHidden = !listText.includes('solid electrolyte interphase');
    check('overview.searchFilter', afterRows < beforeRows && zhShown && enHidden, `before=${beforeRows} after=${afterRows} zh=${zhShown} enGone=${enHidden}`);

    // "已留痕"徽章存在；无"AGH 已记录"
    const hasLiuHen = listText.includes('已留痕');
    const hasAghBtn = listText.includes('AGH 已记录');
    check('overview.recordedBadge', hasLiuHen && !hasAghBtn, `已留痕=${hasLiuHen} aghBtn=${hasAghBtn}`);

    // 行内"再次研究"
    const rerunBtn = page.getByRole('button', { name: /再次研究/ }).first();
    check('overview.rerunBtn', await rerunBtn.isVisible().catch(() => false));
    await page.screenshot({ path: `${OUT}/v22_overview.png`, fullPage: false });

    // 点击"再次研究"→ /new 且预填 goal
    await rerunBtn.click();
    await page.waitForURL('**/new**', { timeout: 15000 });
    await page.waitForTimeout(800);
    const url = page.url();
    const goalInput = page.locator('textarea, input[type="text"]').first();
    const prefilled = ((await goalInput.inputValue().catch(() => '')) || '').trim();
    check('overview.rerunPrefill', url.includes('/new') && prefilled === GOAL, `url=${url.slice(0, 60)} prefilled="${prefilled.slice(0, 30)}"`);
    await page.screenshot({ path: `${OUT}/v22_new_prefill.png`, fullPage: false });

    // ---------- C4 证据页 ----------
    await page.goto(`${BASE}/evidence/${TASK}?mode=live`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1800); // bundle 加载
    const main = page.locator('main');
    const evText = await main.innerText();

    // tier chips：全部/fact/artifact
    const tierAll = page.getByRole('button', { name: '全部' }).first();
    const tierFact = page.getByRole('button', { name: /事实（fact）/ }).first();
    const tierArt = page.getByRole('button', { name: /产物（artifact）/ }).first();
    const chipsOk = (await tierAll.isVisible().catch(() => false))
      && (await tierFact.isVisible().catch(() => false))
      && (await tierArt.isVisible().catch(() => false));
    check('evidence.tierChips', chipsOk);

    // kind 下拉动态去重（option 数 = 全部 + 实际出现的 kind）
    const kindSel = page.locator('select').first();
    const kindOk = await kindSel.isVisible().catch(() => false);
    const optTexts = kindOk ? await kindSel.locator('option').allInnerTexts() : [];
    const noDup = new Set(optTexts).size === optTexts.length;
    check('evidence.kindSelect', kindOk && noDup, `options=${JSON.stringify(optTexts)}`);

    // 筛选 fact → 计数变化
    const countRe = /(\d+)\s*\/\s*(\d+)|共\s*(\d+)/;
    const cntBefore = (await main.innerText()).match(countRe)?.slice(1).join('/') ?? '';
    await tierFact.click();
    await page.waitForTimeout(600);
    const textFact = await main.innerText();
    const cntAfter = textFact.match(countRe)?.slice(1).join('/') ?? '';
    const cards = await page.locator('[class*="evidenceCard"], [class*="evCard"], article').count();
    check('evidence.factFilter', cntBefore !== cntAfter || textFact.length !== evText.length, `count ${cntBefore || '?'} -> ${cntAfter || '?'} cards=${cards}`);

    // APA/BibTeX 复制 + toast
    const apaBtn = page.getByRole('button', { name: 'APA' }).first();
    check('evidence.apaBtn', await apaBtn.isVisible().catch(() => false));
    if (await apaBtn.isVisible().catch(() => false)) {
      await apaBtn.click();
      await page.waitForTimeout(700);
      const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
      const toastText = await page.locator('body').innerText();
      const toastShown = /已复制|复制成功|copied/i.test(toastText);
      check('evidence.apaCopy', clip.length > 10 && toastShown, `clip=${clip.slice(0, 60).replace(/\n/g, ' ')} toast=${toastShown}`);
      // BibTeX 按钮
      const bibBtn = page.getByRole('button', { name: 'BibTeX' }).first();
      check('evidence.bibtexBtn', await bibBtn.isVisible().catch(() => false));
    }
    await page.screenshot({ path: `${OUT}/v22_evidence.png`, fullPage: false });

    // console error 汇总（本页行程）
    check('console.errors(C3C4)', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' || '));
  } catch (e) {
    check('script.fatal', false, e.message.slice(0, 300));
    await page.screenshot({ path: `${OUT}/v22_fatal2.png`, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
