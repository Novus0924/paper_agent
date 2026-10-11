import type { ReactNode } from 'react';
import ui from '@/styles/ui.module.css';
import { cx } from '@/lib/utils';
import { Icon, type IconName } from './Icon';

/** 标题层级：页面主分区用 3（默认），卡片套卡片时调用方降到 4，避免大纲跳级 */
export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

export interface CardProps {
  title?: ReactNode;
  /** 标题落在哪一级标题元素上；嵌套深度由页面结构决定，不是组件猜出来的 */
  titleLevel?: HeadingLevel;
  icon?: IconName;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** 无内边距正文（如表格、列表铺满） */
  flush?: boolean;
}

export function Card({
  title,
  titleLevel = 3,
  icon,
  actions,
  children,
  className,
  bodyClassName,
  flush,
}: CardProps) {
  const Heading = `h${titleLevel}` as 'h3';
  return (
    <section className={cx(ui.card, className)}>
      {(title || actions) && (
        <header className={ui.cardHead}>
          {icon && <Icon name={icon} className={ui.sectionIcon} />}
          {/* 卡片标题就是这一屏的分区标题：读屏按 H 键要能跳到这里，所以是真标题元素 */}
          {title ? <Heading className={ui.cardTitle}>{title}</Heading> : null}
          {actions && <div className={ui.actions}>{actions}</div>}
        </header>
      )}
      <div className={cx(!flush && ui.cardBody, bodyClassName)}>{children}</div>
    </section>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx(ui.panel, className)}>{children}</div>;
}

export function Divider() {
  return <hr className={ui.divider} />;
}
