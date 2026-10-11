import { describe, expect, it } from 'vitest';
import { ApiError, toApiError } from '@/api/errors';
import { errorCodeKey } from '@/lib/errors';
import {
  isRunning,
  isTerminal,
  runStatusTone,
  stepStatusTone,
  toneClass,
} from '@/lib/status';
import { KIND_LABEL, KIND_ORDER, TIER_LABEL, TIER_ORDER } from '@/lib/labels';
import { PAGE_SIZE, clampPage, pageCount, pageOf, paginate } from '@/lib/paginate';
import {
  copyText,
  cx,
  externalRef,
  formatDate,
  formatDateTime,
  formatDuration,
  relativeTime,
  timeOf,
  truncate,
} from '@/lib/utils';
import { zhCN } from '@/i18n/zh-CN';
import { lookupText } from './helpers';

describe('状态色语义（§5.3 铁律 1）', () => {
  it('运行/完成/失败各有固定语气，未开始与跳过都是中性', () => {
    expect(runStatusTone).toEqual({
      PLANNED: 'idle',
      RUNNING: 'run',
      DONE: 'ok',
      FAILED: 'fail',
    });
    expect(stepStatusTone.SKIPPED).toBe('idle');
    expect(stepStatusTone.FAILED).toBe('fail');
  });

  it('降级只能落在 warn 语气，绝不与红色的 fail 混用', () => {
    // 组件用 toneClass 取类；warn 与 fail 必须是不同键，且降级路径不引用 fail
    const styles: Record<string, string> = {
      ok: 'c-ok',
      run: 'c-run',
      warn: 'c-warn',
      fail: 'c-fail',
      idle: 'c-idle',
    };
    expect(toneClass(styles, 'warn')).toBe('c-warn');
    expect(toneClass(styles, 'warn')).not.toBe(toneClass(styles, 'fail'));
    expect(toneClass({}, 'warn')).toBe('');
    expect(toneClass({ idle: 'c-idle' }, 'unknown' as never)).toBe('c-idle');
  });

  it('终态判定是导出/追问的门禁', () => {
    expect(isTerminal('DONE')).toBe(true);
    expect(isTerminal('FAILED')).toBe(true);
    expect(isTerminal('RUNNING')).toBe(false);
    expect(isRunning('PLANNED')).toBe(true);
  });
});

describe('时间与文本格式化', () => {
  const now = Date.parse('2026-10-09T12:00:00.000Z');

  it('relativeTime 覆盖刚刚/分钟/小时/天，超出周返回日期', () => {
    expect(relativeTime('2026-10-09T11:59:30.000Z', now)).toBe('刚刚');
    expect(relativeTime('2026-10-09T11:30:00.000Z', now)).toBe('30 分钟前');
    expect(relativeTime('2026-10-09T09:00:00.000Z', now)).toBe('3 小时前');
    expect(relativeTime('2026-10-06T12:00:00.000Z', now)).toBe('3 天前');
    expect(relativeTime('2026-09-01T12:00:00.000Z', now)).toBe('2026-09-01');
    expect(relativeTime('not-a-date', now)).toBe('—');
  });

  it('formatDate / formatDateTime / timeOf 对非法输入给出安全占位', () => {
    expect(formatDate('2026-10-09T00:00:00')).toBe('2026-10-09');
    expect(formatDateTime('2026-10-09T08:30:00')).toBe('2026-10-09 08:30');
    expect(timeOf('2026-10-09T12:34:56')).toBe('12:34:56');
    expect(timeOf('bad')).toBe('');
    expect(formatDateTime('bad')).toBe('—');
  });

  it('formatDuration 区分 ms / s / 分秒，空值不显示', () => {
    expect(formatDuration()).toBe('');
    expect(formatDuration(0)).toBe('');
    expect(formatDuration(900)).toBe('900ms');
    expect(formatDuration(2500)).toBe('2.5s');
    expect(formatDuration(125_000)).toBe('2m5s');
  });

  it('truncate 去掉首尾空白后再截断', () => {
    expect(truncate('  固态电解质界面阻抗  ', 4)).toBe('固态电解…');
    expect(truncate('短文本', 10)).toBe('短文本');
  });

  it('cx 只拼接真值类名', () => {
    expect(cx('a', false, undefined, 'b', null, 'c')).toBe('a b c');
  });
});

describe('来源外链判定（不伪造成链接）', () => {
  it('DOI 与 URL 可外链，产物路径不可', () => {
    expect(externalRef('10.1038/s41560-023-01234-x')).toBe(
      'https://doi.org/10.1038/s41560-023-01234-x',
    );
    expect(externalRef(' https://arxiv.org/abs/2301.00001 ')).toBe(
      'https://arxiv.org/abs/2301.00001',
    );
    expect(externalRef('artifacts/run-1/summary.md')).toBeNull();
    expect(externalRef('')).toBeNull();
  });
});

describe('错误码 → 人类可读文案（铁律 5）', () => {
  it('已知错误码有专属文案，未知码统一兜底', () => {
    expect(errorCodeKey('NOT_FOUND')).toBe('errors.NOT_FOUND');
    expect(errorCodeKey('NETWORK')).toBe('errors.NETWORK');
    expect(errorCodeKey('WEIRD_CODE')).toBe('errors.UNKNOWN');
    expect(lookupText(zhCN, 'errors.NOT_FOUND')).toBeTruthy();
    expect(lookupText(zhCN, 'errors.UNKNOWN')).toBeTruthy();
  });

  it('ApiError 保留 code / messageKey，瞬时错误默认可重试', () => {
    expect(new ApiError('BAD_GOAL').retryable).toBe(false);
    expect(new ApiError('NETWORK').retryable).toBe(true);
    expect(new ApiError('EXPORT_ERROR').messageKey).toBe('errors.EXPORT_ERROR');
    expect(new ApiError('SOMETHING_ELSE').messageKey).toBe('errors.UNKNOWN');
  });

  it('toApiError 把 fetch 的 TypeError / AbortError 归一为可重试错误', () => {
    const network = toApiError(new TypeError('Failed to fetch'));
    expect(network.code).toBe('NETWORK');
    expect(network.retryable).toBe(true);
    expect(toApiError(new Error('boom')).code).toBe('UNKNOWN');
    const original = new ApiError('BUSY', '后端忙', { status: 409 });
    expect(toApiError(original)).toBe(original);
  });
});

describe('证据标签单一真源', () => {
  it('tier / kind 的每个取值都能在文案表里查到', () => {
    for (const tier of TIER_ORDER) {
      expect(lookupText(zhCN, TIER_LABEL[tier])).toBeTruthy();
    }
    for (const kind of KIND_ORDER) {
      expect(lookupText(zhCN, KIND_LABEL[kind])).toBeTruthy();
    }
    expect(KIND_ORDER).toHaveLength(7);
  });
});

describe('剪贴板兜底', () => {
  it('clipboard 不可用时不抛错，返回布尔', async () => {
    await expect(copyText('abc')).resolves.toEqual(expect.any(Boolean));
  });
});

describe('长列表分页（§10）', () => {
  const twelve = Array.from(
    { length: 12 },
    (_, i) => `EV-${String(i + 1).padStart(4, '0')}`,
  );

  it('一页装不下才拆页，条数不足一页仍是单页', () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(PAGE_SIZE)).toBe(1);
    expect(pageCount(12)).toBe(2);
    expect(clampPage(1, 8)).toBe(1);
  });

  it('页码越界一律夹回可用范围，不落在空白页', () => {
    expect(clampPage(0, 12)).toBe(1);
    expect(clampPage(-3, 12)).toBe(1);
    expect(clampPage(99, 12)).toBe(2);
    // 筛选后列表变短，停留在第 2 页的请求必须回落到最后一页而不是空白
    expect(clampPage(2, 4)).toBe(1);
    expect(clampPage(Number.NaN, 12)).toBe(1);
    expect(clampPage(1.9, 12)).toBe(1);
  });

  it('可见区间按 1 起算，供文案直接引用', () => {
    const first = paginate(twelve, 1);
    expect(first.items).toEqual(twelve.slice(0, 10));
    expect(first).toMatchObject({ page: 1, pages: 2, total: 12, from: 1, to: 10 });

    const second = paginate(twelve, 2);
    expect(second.items).toEqual(['EV-0011', 'EV-0012']);
    expect(second).toMatchObject({ page: 2, pages: 2, total: 12, from: 11, to: 12 });
  });

  it('空列表是 0/0 而不是 1/0 这种自相矛盾的区间', () => {
    const empty = paginate<string>([]);
    expect(empty.items).toEqual([]);
    expect(empty).toMatchObject({ page: 1, pages: 1, total: 0, from: 0, to: 0 });
  });

  it('深链目标在后一页时先算出页码，找不到就留在第一页', () => {
    expect(pageOf(twelve, (ev) => ev === 'EV-0003')).toBe(1);
    expect(pageOf(twelve, (ev) => ev === 'EV-0011')).toBe(2);
    expect(pageOf(twelve, (ev) => ev === 'EV-0012')).toBe(2);
    expect(pageOf(twelve, (ev) => ev === 'EV-9999')).toBe(1);
  });
});
