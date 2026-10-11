import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_STORAGE_KEY, MockRuntime } from '@/api/mock/runtime';

/* ==========================================================================
   「刷新页面就找不到任务」（用户实测）的根因守卫：
   新建任务不能只排在 180ms 防抖里，刷新窗口内必须已经落盘。
   ========================================================================== */

interface Stored {
  tasks: Record<string, { script: unknown[] }>;
}

function readStore(): Stored {
  const raw = localStorage.getItem(MOCK_STORAGE_KEY);
  expect(raw, 'mock 演示数据应写入 localStorage').not.toBeNull();
  return JSON.parse(raw ?? '{}') as Stored;
}

const scriptLen = (id: string) => readStore().tasks[id]?.script.length ?? -1;

describe('Mock 运行时持久化时机', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('创建任务后立即读取存储就能看到该任务（不留防抖窗口）', () => {
    const runtime = new MockRuntime();
    const { task_id } = runtime.createTask({
      goal: '刷新取证：固态电解质界面阻抗表征方法如何对比？',
      workflow: 'research',
      sources: ['arxiv', 'crossref'],
    });
    expect(readStore().tasks[task_id], `新建任务 ${task_id} 未落盘`).toBeTruthy();
    expect(scriptLen(task_id)).toBeGreaterThan(0);
  });

  it('页面卸载前把防抖中的变更刷进存储', () => {
    const runtime = new MockRuntime();
    const { task_id } = runtime.createTask({
      goal: '刷新取证：只做一次追问也要能恢复。',
      workflow: 'research',
      sources: ['arxiv'],
    });
    const baseline = scriptLen(task_id);
    const sent = runtime.sendMessage(task_id, '请补充近三年的结论。', 'ask');
    // 防抖未到期：这条追问此时还只在内存里
    expect(scriptLen(task_id)).toBe(baseline);

    window.dispatchEvent(new Event('pagehide'));

    expect(JSON.stringify(readStore().tasks[task_id]?.script)).toContain(sent.turn_id);
  });

  it('失效标识返回空快照而不是崩栈', () => {
    const runtime = new MockRuntime();
    expect(runtime.get('run-not-existing')).toBeNull();
  });
});
