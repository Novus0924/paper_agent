/** 文档 §10「长列表」的统一分页尺度：页面只声明数据量，不再各自写死条数 */
export const PAGE_SIZE = 10;

export interface PageView<T> {
  items: T[];
  page: number;
  pages: number;
  total: number;
  /** 1 起算的可见区间；空列表为 0/0，供文案直接引用 */
  from: number;
  to: number;
}

export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/** 页码越界不抛错：夹在 [1, pages]，筛选后变短也不会停在空白页 */
export function clampPage(page: number, total: number, size = PAGE_SIZE): number {
  const safe = Number.isFinite(page) ? Math.trunc(page) : 1;
  return Math.min(Math.max(1, safe), pageCount(total, size));
}

export function paginate<T>(
  items: readonly T[],
  page = 1,
  size = PAGE_SIZE,
): PageView<T> {
  const total = items.length;
  const pages = pageCount(total, size);
  const current = clampPage(page, total, size);
  const start = (current - 1) * size;
  const slice = items.slice(start, start + size);
  return {
    items: slice,
    page: current,
    pages,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
  };
}

/** 深链定位用：目标可能在后一页，先算出它所在页，否则锚点滚动落在别的页上 */
export function pageOf<T>(
  items: readonly T[],
  isTarget: (item: T) => boolean,
  size = PAGE_SIZE,
): number {
  const index = items.findIndex(isTarget);
  return index < 0 ? 1 : Math.floor(index / size) + 1;
}
