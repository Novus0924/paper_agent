import type { MsgKey } from '@/i18n';
import { zhCN } from '@/i18n/zh-CN';

const ERROR_KEYS = Object.keys(zhCN.errors);

/** 后端错误码 → 人类可读文案键；未知码统一落到 errors.UNKNOWN（§2.2 铁律 5） */
export function errorCodeKey(code: string): MsgKey {
  return (ERROR_KEYS.includes(code) ? `errors.${code}` : 'errors.UNKNOWN') as MsgKey;
}
