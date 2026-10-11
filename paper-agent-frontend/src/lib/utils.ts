/** 通用工具：类名合并、时间格式化、下载、复制到剪贴板 */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function relativeTime(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const diff = now - t;
  if (diff < 45_000) return '刚刚';
  if (diff < HOUR) return `${Math.round(diff / MIN)} 分钟前`;
  if (diff < DAY) return `${Math.round(diff / HOUR)} 小时前`;
  if (diff < 7 * DAY) return `${Math.round(diff / DAY)} 天前`;
  return formatDate(iso);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 事件流用的时刻显示（HH:mm:ss） */
export function timeOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDuration(ms?: number): string {
  if (ms == null || ms <= 0) return '';
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m${Math.round(s % 60)}s`;
}

export function truncate(text: string, max: number): string {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/** 让浏览器保存一个已经存在的对象 URL：二进制产物（ZIP/JSONL）只能走这条路 */
export function downloadUrl(filename: string, url: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function download(filename: string, mime: string, text: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  downloadUrl(filename, url);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* 剪贴板权限被拒时走下面的兜底 */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * DOI 等可外链的来源标识；产物路径等返回 null，不伪造成链接。
 * 参数允许为空：来源标识由后端按证据类型可选给出（内联产物没有 DOI），缺字段不能把整页炸掉。
 */
export function externalRef(ref: string | null | undefined): string | null {
  const value = (ref ?? '').trim();
  if (value === '') return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^10\.\d{4,9}\//.test(value)) return `https://doi.org/${value}`;
  return null;
}
