import { asArray, asText } from '../infra/coerce.js'

/**
 * BibTeX 渲染（任务级导出与全库导出**共用同一口径**，v2.4）。
 *
 * 从 export/service.ts 抽出：任务级 `kind=bibtex` 与全库 `GET /library/export?kind=bibtex`
 * 必须产出**同一种**条目与引用键（姓+年+序号），否则两边漂移，用户拿到的文献库与单任务导出对不上。
 */

/**
 * BibTeX 特殊字符转义（BibTeX 惯例）。
 * 单次扫描映射，避免「先转义反斜杠、后转义 `{}`」把 `\textbackslash{}` 中的花括号二次转义。
 */
const BIB_ESCAPE: Record<string, string> = {
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
  '\\': '\\textbackslash{}',
}

export function escapeBib(value: string): string {
  return value.replace(/[&%$#_{}~^\\]/g, (c) => BIB_ESCAPE[c] ?? c)
}

/** 第一作者姓（取末段词并去非字母数字/中文）；取不到回退 Anon */
export function surnameOf(author: string): string {
  const parts = author.trim().split(/\s+/).filter(Boolean)
  const last = parts[parts.length - 1] ?? ''
  return last.replace(/[^0-9A-Za-z\u4e00-\u9fff]/g, '') || 'Anon'
}

/** BibTeX 引用键：第一作者姓 + 年份 + 序号（序号防碰撞） */
export function bibKey(ref: Record<string, unknown>, index: number): string {
  const authors = asArray(ref['authors']).map((a) => asText(a)).filter(Boolean)
  const first = authors[0]
  const surname = first ? surnameOf(first) : 'Anon'
  const yearRaw = ref['year']
  const year = yearRaw === null || yearRaw === undefined || yearRaw === '' ? 'nd' : String(yearRaw).replace(/[^0-9]/g, '') || 'nd'
  return `${surname}${year}${index}`
}

/** 单条 BibTeX 条目：字段 author/title/journal/year/doi，缺失的字段**跳过该行** */
export function toBibEntry(ref: Record<string, unknown>, index: number): string {
  const author = asArray(ref['authors']).map((a) => asText(a)).filter(Boolean).join(', ')
  const title = asText(ref['title'])
  const journal = asText(ref['venue'])
  const year = ref['year']
  const doi = asText(ref['doi'])
  const fields: Array<[string, string]> = []
  if (author) fields.push(['author', author])
  if (title) fields.push(['title', title])
  if (journal) fields.push(['journal', journal])
  if (year !== null && year !== undefined && year !== '') fields.push(['year', String(year)])
  if (doi) fields.push(['doi', doi])
  const body = fields.map(([k, v]) => `  ${k} = {${escapeBib(v)}}`).join(',\n')
  return `@article{${bibKey(ref, index)},\n${body}\n}\n`
}

/** 一批 ref → 完整 .bib 文本（条目之间空行分隔；序号即防碰撞键的尾号） */
export function renderBibtex(refs: Array<Record<string, unknown>>): string {
  return refs.map((ref, i) => toBibEntry(ref, i + 1)).join('\n')
}
