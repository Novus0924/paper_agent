import ReactMarkdown, { type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useNavigate } from 'react-router-dom';
import { memo, useEffect, useRef } from 'react';
import md from '@/styles/md.module.css';
import { cx } from '@/lib/utils';

export interface EvBadgeLinks {
  /** 由调用方提供任务上下文：[EV-xxx] 的跳转地址（证据页 + ?ev= 深链） */
  href: (evId: string) => string;
  /** hover 提示文案（证据标题），不提供则不设 title */
  title?: (evId: string) => string;
}

export interface MarkdownProps {
  text: string;
  className?: string;
  /** 传入后正文中 [EV-xxxx] 渲染为可跳转的上标证据徽章 */
  evBadge?: EvBadgeLinks;
}

/** [EV-xxxx] 证据角标：转成 markdown 相对链接（sanitize 只放行相对/白名单协议） */
const EV_RE = /\[EV-([A-Za-z0-9][\w-]*)\]/g;

/**
 * 报告 / 回答的 Markdown 渲染（§10 安全）：
 * 经 rehype-sanitize 白名单消毒，不渲染不可信 HTML，避免 XSS。
 * memo：报告正文不随 store 的无关更新重解析/重建 DOM（角标点击依赖 DOM 稳定）。
 */
export const Markdown = memo(function Markdown({
  text,
  className,
  evBadge,
}: MarkdownProps) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  // 证据角标点击 → SPA 导航：用容器上的原生监听接管（sanitize 子树内的
  // 元素事件绑定不可依赖），<a> 本身保留可访问语义与默认 hover 行为
  useEffect(() => {
    const el = ref.current;
    if (!el || !evBadge) return;
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a');
      if (!anchor) return;
      const hrefAttr = anchor.getAttribute('href') ?? '';
      if (!hrefAttr.startsWith('/evidence/')) return;
      const ev = hrefAttr.match(/^\/evidence\/[^/?]+\?ev=([A-Za-z0-9][\w-]*)$/)?.[1];
      if (!ev) return;
      e.preventDefault();
      navigate(evBadge.href(ev));
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [evBadge, navigate]);
  const components: Options['components'] = {
    a: ({ node: _node, href, children, ...props }) => {
      const isEv = href?.match(/^\/evidence\/[^/?]+\?ev=([A-Za-z0-9][\w-]*)$/);
      if (isEv?.[1] && evBadge) {
        const tip = evBadge.title?.(isEv[1]);
        return (
          <a {...props} href={href} className={md.evSup} title={tip}>
            {children}
          </a>
        );
      }
      return (
        <a {...props} href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
  };

  const source = evBadge
    ? text.replace(EV_RE, (raw) => {
        const evId = raw.slice(1, -1);
        return `[${evId}](${evBadge.href(evId)})`;
      })
    : text;

  return (
    <div ref={ref} className={cx(md.md, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize]]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
});
