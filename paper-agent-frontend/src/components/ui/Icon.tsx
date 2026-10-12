import type { ReactNode } from 'react';

/** 全站图标唯一来源：线条风格取自《前端Demo/index.html》，尺寸/描边统一。 */
export type IconName =
  | 'brand'
  | 'bulb'
  | 'plus'
  | 'doc'
  | 'brain'
  | 'list'
  | 'check'
  | 'warn'
  | 'info'
  | 'fail'
  | 'download'
  | 'agent'
  | 'chevDown'
  | 'chevRight'
  | 'chevLeft'
  | 'close'
  | 'copy'
  | 'refresh'
  | 'bolt'
  | 'settings'
  | 'send'
  | 'link'
  | 'external'
  | 'stop'
  | 'play'
  | 'clock'
  | 'search'
  | 'trash'
  | 'chain'
  | 'shield'
  | 'monitor'
  | 'evidence'
  | 'panel'
  | 'sun'
  | 'moon'
  | 'bell';

const PATHS: Record<IconName, ReactNode> = {
  brand: (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.5 1 2.5h6c0-1 .4-1.9 1-2.5A6 6 0 0 0 12 3z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  doc: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </>
  ),
  brain: (
    <>
      <path d="M9.5 3A3.5 3.5 0 0 0 6 6.5 3.5 3.5 0 0 0 4 12a3.5 3.5 0 0 0 2 5.5A3.5 3.5 0 0 0 9.5 21 2.5 2.5 0 0 0 12 18.5v-13A2.5 2.5 0 0 0 9.5 3z" />
      <path d="M14.5 3A3.5 3.5 0 0 1 18 6.5 3.5 3.5 0 0 1 20 12a3.5 3.5 0 0 1-2 5.5A3.5 3.5 0 0 1 14.5 21" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  check: <path d="M20 6 9 17l-5-5" />,
  warn: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  fail: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5M12 15V3" />
    </>
  ),
  agent: (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <circle cx="12" cy="12" r="3.4" />
    </>
  ),
  chevDown: <path d="m6 9 6 6 6-6" />,
  chevRight: <path d="m9 6 6 6-6 6" />,
  chevLeft: <path d="m15 6-6 6 6 6" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  bolt: <path d="M13 5 4 14h7l-1 5 9-9h-7z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />,
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </>
  ),
  external: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14 21 3" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  play: <path d="M6 4l14 8-14 8z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </>
  ),
  chain: (
    <>
      <path d="M9 12a3 3 0 0 1 3-3h2a3 3 0 0 1 0 6h-1" />
      <path d="M15 12a3 3 0 0 1-3 3h-2a3 3 0 0 1 0-6h1" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  monitor: (
    <>
      <path d="M3 5h18v11H3z" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  evidence: (
    <>
      <path d="M4 5h11l5 5v9H4z" />
      <path d="M8 14h8M8 10h5" />
    </>
  ),
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </>
  ),
};

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** 纯装饰图标（旁边已有文字）时对读屏隐藏 */
  decorative?: boolean;
}

export function Icon({
  name,
  size = 15,
  strokeWidth = 1.8,
  className,
  decorative = true,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : 'img'}
    >
      {PATHS[name]}
    </svg>
  );
}
