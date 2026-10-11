async page => {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://127.0.0.1:5174/report/run-20261011-190335-qxzugf?mode=live', { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'qa_evidence/taskE_report_full.png', fullPage: true });
  const text = await page.evaluate(() => document.body.innerText);
  return {
    hasResearchQuestion: text.includes('研究问题'),
    hasAnswer: text.includes('对研究问题的回答'),
    hasGoal: text.includes('What characterization methods'),
    hasEV: /\[EV-\d{4}\]/.test(text),
    errors,
    textLen: text.length,
    excerpt: text.slice(0, 1200)
  };
}
