import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openAgentView, presetFastSpeed } from './helpers';

/**
 * 第三方无障碍审计（axe-core）。
 * 之前的对比度/大纲证据都出自自算脚本：选择器是我自己挑的，就可能只挑到能过的样本，
 * 所以这一组换成独立实现的规则集整页扫描，判什么由 axe 决定，不由我决定。
 */

type Violation = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number];

const SERIOUS = new Set(['critical', 'serious']);

const ready = {
  heading: (name: string) => async (page: Page) => {
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  },
};

/** 折叠区/空态在骨架期也会扫，等真实内容落地再扫，否则"通过"只是扫到半张页 */
const views = (taskId: string) => [
  {
    label: '总览',
    path: '/',
    wait: async (page: Page) => {
      await ready.heading('总览')(page);
      await expect(page.locator('tbody tr')).not.toHaveCount(0);
    },
  },
  { label: '新建向导', path: '/new', wait: ready.heading('新建科研任务') },
  {
    label: '运行监控',
    path: `/monitor/${taskId}`,
    wait: async (page: Page) => {
      await expect(page.getByText('工具调用监控')).toBeVisible();
    },
  },
  {
    label: '报告',
    path: `/report/${taskId}`,
    wait: async (page: Page) => {
      await expect(page.getByRole('heading', { name: '结论' }).first()).toBeVisible();
    },
  },
  {
    label: '证据',
    path: `/evidence/${taskId}`,
    wait: async (page: Page) => {
      await expect(page.locator('[id^="EV-"]').first()).toBeVisible();
    },
  },
  { label: '设置', path: '/settings', wait: ready.heading('设置') },
];

function describeViolation(v: Violation): string {
  const targets = v.nodes
    .map((n) => n.target.join(' '))
    .slice(0, 3)
    .join(' | ');
  return `${v.impact ?? 'n/a'} ${v.id}：${v.help} → ${targets}`;
}

/**
 * 扫"稳定态"而不是动画中间帧。
 * 降级 toast 的入场动画是 opacity 0→1（0.25s）；在中间帧取样会量到 opacity≈0.91，
 * axe 于是把 #1a1a1a on #fff（实测 17.4:1）报成 color-contrast——量到的是半透明，不是配色缺陷。
 * 等动画真的跑完再扫。减少动效的用户本来就不吃这一帧：emulateMedia(reduce) 实测动画时长 1e-05s、
 * 首帧 opacity 已是 1；不声明时同帧量到 animationDuration=0.25s、opacity=0。
 */
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // 状态圆点是 infinite 呼吸动画，a.finished 永远不 resolve；只等一次性入场动画，并留 2s 上限
    const finite = document.getAnimations().filter((a) => {
      const iterations = a.effect?.getComputedTiming().iterations ?? 1;
      return iterations !== Infinity;
    });
    await Promise.race([
      Promise.all(finite.map((a) => a.finished.catch(() => undefined))),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

test.describe('axe-core 无障碍审计', () => {
  test.beforeEach(async ({ page }) => {
    await presetFastSpeed(page);
  });

  test('六个视图整页扫描：零违规，serious/critical 单独列出', async ({ page }) => {
    const taskId = await openAgentView(page);

    const blocking: string[] = [];
    const all: string[] = [];
    for (const view of views(taskId)) {
      await page.goto(view.path);
      await view.wait(page);
      await settle(page);
      const { violations } = await new AxeBuilder({ page }).analyze();
      for (const v of violations) {
        const line = `${view.label} ${describeViolation(v)}`;
        all.push(line);
        process.stdout.write(`AXE ${line}\n`);
        if (SERIOUS.has(v.impact ?? '')) blocking.push(line);
      }
      process.stdout.write(
        `AXE ${view.label} total=${violations.length} blocking=${
          violations.filter((v) => SERIOUS.has(v.impact ?? '')).length
        }\n`,
      );
    }

    test.info().annotations.push({
      type: 'axe',
      description: all.length ? all.join('\n') : '六个视图 0 违规',
    });
    expect(blocking, `serious/critical：\n${blocking.join('\n')}`).toEqual([]);
    expect(all, `axe-core 扫出违规：\n${all.join('\n')}`).toEqual([]);
  });
});
