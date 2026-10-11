import type { EvidenceItem } from '@/api/types';

/**
 * 引用格式化（纯前端，不伪造数据）：
 * 缺字段就显示缺失口径文案，不凭空编造作者/年份/DOI。
 */

function firstAuthorSurname(authors: string): string {
  // 既有数据形如 "Zhang, L.; Wang, H." 或 "Zhang L, Wang H"：取第一作者姓
  const first = authors.split(/[;，,]/)[0]?.trim() ?? '';
  if (first.includes(',')) return first.split(',')[0]?.trim() || first;
  return first.split(/\s+/)[0] ?? first;
}

export function formatApa(item: EvidenceItem): string {
  const authors = item.authors?.trim() || '（作者信息缺失）';
  const year = item.year?.trim() || 'n.d.';
  const doi = item.ref?.trim() ? ` ${item.ref.trim()}` : '';
  return `${authors} (${year}). ${item.title}.${doi}`;
}

export function formatBibtex(item: EvidenceItem): string {
  const key = `${firstAuthorSurname(item.authors ?? '') || 'unknown'}${item.year ?? ''}`;
  const lines = [
    `@article{${key},`,
    `  author = {${item.authors?.trim() || '（作者信息缺失）'}},`,
    `  title = {${item.title}},`,
    item.ref?.trim() ? `  journal = {${item.ref.trim()}},` : null,
    item.year ? `  year = {${item.year}},` : null,
    item.ref?.trim() && /^10\./.test(item.ref.trim()) ? `  doi = {${item.ref.trim()}},` : null,
  ].filter((line): line is string => line !== null);
  return `${lines.join('\n')}\n}`;
}
