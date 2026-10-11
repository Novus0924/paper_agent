/* v2.2 QA 脚本1：报告页终态追问 + UI 对照 + 侧栏连接卡（live 模式） */
const { chromium } = require('C:/Users/ASUS/Desktop/黑客松/paper_agent/paper-agent-frontend/node_modules/playwright');

const BASE = 'http://127.0.0.1:5174';
const TASK = 'run-20261011-190412-7o3vm8';
const GOAL = '检索并综述固态电解质界面阻抗的表征方法';
const SESSION_TAIL = 'cc1e018a3b689cad';
const OUT = __dirname;

(async () => {
  const results = [];
  const consoleErrors = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`);
  };

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

  try {
    await page.goto(`${BASE}/report/${TASK}?mode=live`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 等报告内容与 Composer 出现
    const composer = page.locator('textarea').first();
    await composer.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1500); // 等报告渲染稳定

    // C1-1 Composer 可输入，无终态拒绝文案
    const ph = await composer.getAttribute('placeholder');
    check('composer.placeholder', !!ph && ph.includes('追问或请求修订'), ph || 'null');
    const bodyText = await page.locator('body').innerText();
    const hasReject = bodyText.includes('终态不接受') || bodyText.includes('任务已结束，不再接受');
    check('composer.noTerminalReject', !hasReject);

    await page.screenshot({ path: `${OUT}/v22_ask_before.png`, fullPage: false });

    // C1-2 输入并发送
    await composer.fill('这份报告的局限是什么？两句话内回答');
    await composer.press('Enter');

    // C1-3 等待 assistant 回复（≤90s）：消息流出现 .msgAgent 且文本含 局限 或 EV-
    let replyText = '';
    try {
      const agent = page.locator('[class*="msgAgent"]').last();
      await agent.waitFor({ state: 'visible', timeout: 90000 });
      await page.waitForFunction(
        () => {
          const els = document.querySelectorAll('[class*="msgAgent"] p, [class*="msgAgent"] li, [class*="msgAgent"] td, [class*="msgAgent"] .text');
          return Array.from(els).some((e) => e.textContent && e.textContent.trim().length > 20);
        },
        { timeout: 90000 },
      );
      replyText = (await agent.innerText()).slice(0, 500);
      const okReply = replyText.includes('局限') || /EV-\d{4}/.test(replyText);
      check('ask.assistantReply', okReply, JSON.stringify(replyText.slice(0, 160)));
    } catch (e) {
      check('ask.assistantReply', false, '90s 内未出现 assistant 回复');
    }
    await page.screenshot({ path: `${OUT}/v22_ask_reply.png`, fullPage: false });

    // C2-1 主标题 = goal
    const h2 = page.locator('h2[class*="pageTitle"]').first();
    const h2Text = (await h2.textContent() || '').trim();
    check('report.goalTitle', h2Text === GOAL, h2Text.slice(0, 40));

    // C2-2 目录块存在且锚点可点击
    const toc = page.locator('nav[aria-label*="目录"], nav[class*="toc"]').first();
    check('report.tocExists', await toc.isVisible().catch(() => false));
    const tocLinks = toc.locator('a, button');
    const tocCount = await tocLinks.count();
    if (tocCount > 0) {
      await tocLinks.first().click();
      await page.waitForTimeout(600); // 平滑滚动
      const scrolled = await page.evaluate(() => window.scrollY > 10 || location.hash !== '');
      check('report.tocAnchorScroll', scrolled, `scrollY/links=${scrolled}/${tocCount}`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
    } else {
      check('report.tocAnchorScroll', false, '目录无可点击项');
    }

    // C2-3 审计信息折叠默认收起
    const auditBtn = page.getByRole('button', { name: /审计信息/ }).first();
    const auditVisible = await auditBtn.isVisible().catch(() => false);
    const expanded = auditVisible ? await auditBtn.getAttribute('aria-expanded') : null;
    check('report.auditCollapsed', auditVisible && expanded === 'false', `visible=${auditVisible} expanded=${expanded}`);
    // 展开后可见会话 ID（顺带验证折叠功能可用）
    if (auditVisible) {
      await auditBtn.click();
      await page.waitForTimeout(300);
      const auditText = await page.locator('[class*="auditBlock"]').first().innerText();
      check('report.auditContainsSession', auditText.includes(SESSION_TAIL));
      await auditBtn.click(); // 收起还原
      await page.waitForTimeout(200);
    }

    // C2-4 [EV-xxxx] 上标徽章：存在 .evBadge 且字体显著小于正文（上标化视觉）
    const badge = page.locator('[class*="evBadge"]').first();
    const badgeCount = await page.locator('[class*="evBadge"]').count();
    if (await badge.isVisible().catch(() => false)) {
      const fs = await badge.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      const rowVa = await badge.evaluate((el) => {
        const row = el.closest('[class*="evRow"]');
        return row ? getComputedStyle(row).verticalAlign : '(no evRow)';
      });
      check('report.evBadgeSup', badgeCount > 0 && fs <= 12, `count=${badgeCount} fontSize=${fs}px verticalAlign=${rowVa}`);
    } else {
      check('report.evBadgeSup', false, `badgeCount=${badgeCount} 不可见`);
    }

    // C2-5 无"正文"节标题
    const headingTexts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1,h2,h3,h4,h5')).map((e) => e.textContent.trim()),
    );
    const hasBodyHeading = headingTexts.includes('正文');
    check('report.noBodySectionTitle', !hasBodyHeading, JSON.stringify(headingTexts.slice(0, 10)));

    await page.screenshot({ path: `${OUT}/v22_report_ui.png`, fullPage: true });

    // C5 侧栏连接卡：默认无全串会话 ID；详情展开后可见
    const beforeDetail = await page.locator('body').innerText();
    check('sidebar.noFullSessionId', !beforeDetail.includes(SESSION_TAIL));
    const detailBtn = page.getByRole('button', { name: /^详情$/ }).first();
    if (await detailBtn.isVisible().catch(() => false)) {
      await detailBtn.click();
      await page.waitForTimeout(300);
      const afterDetail = await page.locator('body').innerText();
      check('sidebar.sessionIdAfterDetail', afterDetail.includes(SESSION_TAIL));
    } else {
      check('sidebar.sessionIdAfterDetail', false, '未找到"详情"按钮');
    }
    check('sidebar.noModelDash', !beforeDetail.includes('模型 -'));

    // console error 汇总
    check('console.errors', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' || '));
  } catch (e) {
    check('script.fatal', false, e.message.slice(0, 300));
    await page.screenshot({ path: `${OUT}/v22_fatal.png`, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
