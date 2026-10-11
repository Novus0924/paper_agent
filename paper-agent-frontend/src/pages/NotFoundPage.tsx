import { useNavigate } from 'react-router-dom';
import layout from '@/styles/layout.module.css';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';

/** 未登记路由：给出可执行的下一步，不显示堆栈（§2.2 铁律 5） */
export function NotFoundPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <div className={layout.page}>
      <EmptyState
        icon="search"
        title={t('notFound.title')}
        lead={t('notFound.lead')}
        action={
          <Button variant="solid" icon="panel" onClick={() => navigate('/')}>
            {t('common.backToOverview')}
          </Button>
        }
      />
    </div>
  );
}
