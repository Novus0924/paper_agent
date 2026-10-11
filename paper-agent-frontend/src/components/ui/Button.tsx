import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import ui from '@/styles/ui.module.css';
import { cx } from '@/lib/utils';
import { Icon, type IconName } from './Icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'solid' | 'chip' | 'icon' | 'danger';
  size?: 'md' | 'sm';
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  children?: ReactNode;
}

/** Button 与 LinkButton 同款外观：变体/尺寸到类名的映射只写一遍 */
function buttonClassName(
  variant: ButtonProps['variant'],
  size: ButtonProps['size'],
  className?: string,
) {
  return cx(
    ui.button,
    variant === 'solid' && ui.solid,
    variant === 'chip' && ui.chip,
    variant === 'icon' && ui.iconBtn,
    variant === 'danger' && ui.danger,
    size === 'sm' && ui.sm,
    className,
  );
}

/** 全局唯一按钮：所有颜色/圆角/间距来自 tokens（§8.1 无硬编码） */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'default',
    size = 'md',
    icon,
    iconRight,
    loading,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      disabled={disabled || loading}
      className={buttonClassName(variant, size, className)}
      {...rest}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} /> : null}
    </button>
  );
});

function Spinner() {
  return <span className={ui.spinner} role="status" aria-hidden />;
}

export interface LinkButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLAnchorElement>,
  'onClick' | 'href' | 'type'
> {
  href: string;
  external?: boolean;
  variant?: 'default' | 'solid' | 'chip' | 'icon' | 'danger';
  size?: 'md' | 'sm';
  icon?: IconName;
  children?: ReactNode;
}

/** 外链跳转（如 DOI、AGH 原生设置入口）：与 Button 同款外观，语义上是 <a> */
export function LinkButton({
  href,
  external,
  variant = 'default',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={buttonClassName(variant, size, className)}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {children}
    </a>
  );
}
