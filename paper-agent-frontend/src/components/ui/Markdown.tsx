import ReactMarkdown, { type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import md from '@/styles/md.module.css';
import { cx } from '@/lib/utils';

/**
 * 报告 / 回答的 Markdown 渲染（§10 安全）：
 * 经 rehype-sanitize 白名单消毒，不渲染不可信 HTML，避免 XSS。
 */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const components: Options['components'] = {
    a: ({ node: _node, ...props }) => (
      <a {...props} target="_blank" rel="noopener noreferrer" />
    ),
  };

  return (
    <div className={cx(md.md, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize]]}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
