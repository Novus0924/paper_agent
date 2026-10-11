import { useEffect, useId, useRef, type ReactNode } from 'react';
import ui from '@/styles/ui.module.css';
import { cx } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { Icon } from './Icon';

interface BaseProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * 打开期间把键盘操作关在对话框里：Tab/Shift+Tab 在首尾焦点之间回环，
 * Esc 关闭，关闭后把焦点还给触发它的那个控件（否则键盘用户回到页面时丢了位置）。
 */
function useDismiss(
  open: boolean,
  onClose: () => void,
  ref: { current: HTMLDivElement | null },
) {
  // 调用方传的多是行内箭头函数，每次渲染都换引用；放进 ref 才能让本 effect 只跟 open 走，
  // 否则父组件一重渲染就会重设焦点、打断键盘用户。
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        // 对话框内一个可聚焦元素都没有时也要困住焦点，否则 Tab 直接漏到背景内容
        e.preventDefault();
        ref.current.focus();
        return;
      }
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (active === ref.current || !ref.current.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      // 触发器可能已经随状态更新被卸载，只在它还挂在文档上时还焦点
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open, ref]);
}

/** 对话框：用于"这是什么"解释、导出确认等（§5.2 的 Modal / Drawer 容器，抽屉形态由 Collapse 承担） */
export function Modal({ open, onClose, title, children, footer }: BaseProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { t } = useI18n();
  const titleId = useId();
  useDismiss(open, onClose, ref);
  if (!open) return null;
  return (
    <div
      className={ui.overlay}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={ui.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={ref}
      >
        <header className={ui.modalHead} id={titleId}>
          {title}
          <button
            type="button"
            className={cx(ui.iconBtn, ui.closeBtn)}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <Icon name="close" />
          </button>
        </header>
        <div className={ui.modalBody}>{children}</div>
        {footer && <footer className={ui.modalFoot}>{footer}</footer>}
      </div>
    </div>
  );
}
