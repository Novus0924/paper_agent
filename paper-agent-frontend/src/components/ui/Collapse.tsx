import { useId, useState, type ReactNode } from 'react';
import ui from '@/styles/ui.module.css';
import { cx } from '@/lib/utils';
import { Icon, type IconName } from './Icon';
import type { HeadingLevel } from './Card';

export interface CollapseProps {
  title: ReactNode;
  /**
   * 声明层级＝这一折叠区本身就是一个页面分区，标题元素里包着展开控件。
   * 不声明则保持纯展开控件：工具卡、证据审计这类重复条目若都进大纲，读屏按 H 键会被刷满。
   */
  titleLevel?: HeadingLevel;
  icon?: IconName;
  hint?: ReactNode;
  defaultOpen?: boolean;
  /** 受控用法：外部掌握展开态（如从报告页跳转后自动展开审计细节） */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** 渐进披露容器（§2.1 P-02）：默认收起技术/审计细节 */
export function Collapse({
  title,
  titleLevel,
  icon,
  hint,
  defaultOpen = false,
  open,
  onToggle,
  children,
  className,
  bodyClassName,
}: CollapseProps) {
  const [inner, setInner] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const expanded = isControlled ? open : inner;
  const id = useId();
  const Heading = (titleLevel ? `h${titleLevel}` : 'h3') as 'h3';

  function toggle() {
    const next = !expanded;
    if (!isControlled) setInner(next);
    onToggle?.(next);
  }

  const head = (
    <button
      type="button"
      className={ui.collapseHead}
      aria-expanded={expanded}
      aria-controls={`${id}-body`}
      onClick={toggle}
    >
      {icon && <Icon name={icon} />}
      <span>{title}</span>
      <Icon name="chevDown" className={ui.chev} />
    </button>
  );

  return (
    <div className={cx(ui.collapse, !expanded && ui.collapsed, className)}>
      {titleLevel ? <Heading className={ui.collapseHeadWrap}>{head}</Heading> : head}
      {/* hidden 而不是只靠 CSS：收起时读屏与 Tab 都真的进不来，展开后重新可达 */}
      <div
        id={`${id}-body`}
        className={cx(ui.collapseBody, bodyClassName)}
        role="region"
        hidden={!expanded}
      >
        {hint && <p className={ui.hint}>{hint}</p>}
        {children}
      </div>
    </div>
  );
}
