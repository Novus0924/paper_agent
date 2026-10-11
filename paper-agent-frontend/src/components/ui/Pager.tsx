import ui from '@/styles/ui.module.css';
import { useI18n } from '@/i18n';
import { Button } from './Button';

export interface PagerProps {
  page: number;
  pages: number;
  /** 当前可见区间（1 起算，含端点）与总数，用于「第 1–10 条 / 共 24 条」 */
  from: number;
  to: number;
  total: number;
  onChange: (page: number) => void;
}

/**
 * 长列表分页（文档 §10）。只有一页时不渲染，避免出现无意义的控件；
 * 边界页禁用并写明原因，不用"点了没反应"的假按钮。
 */
export function Pager({ page, pages, from, to, total, onChange }: PagerProps) {
  const { t } = useI18n();
  if (pages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= pages;

  return (
    <nav className={ui.pager} aria-label={t('pager.region')}>
      <Button
        size="sm"
        icon="chevLeft"
        disabled={prevDisabled}
        title={prevDisabled ? t('pager.firstPage') : undefined}
        aria-label={t('pager.prev')}
        onClick={() => onChange(page - 1)}
      >
        {t('pager.prev')}
      </Button>
      <span className={ui.pagerInfo}>
        {t('pager.range', { from, to, total })}
        <span className={ui.pagerPos}>{t('pager.pagePos', { page, pages })}</span>
      </span>
      <Button
        size="sm"
        iconRight="chevRight"
        disabled={nextDisabled}
        title={nextDisabled ? t('pager.lastPage') : undefined}
        aria-label={t('pager.next')}
        onClick={() => onChange(page + 1)}
      >
        {t('pager.next')}
      </Button>
    </nav>
  );
}
