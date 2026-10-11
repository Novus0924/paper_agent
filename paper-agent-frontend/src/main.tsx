import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@/styles/tokens.css';
import '@/styles/base.css';
import { I18nProvider } from '@/i18n';
import { App } from '@/app/App';

const host = document.getElementById('root');
if (!host) throw new Error('缺少 #root 挂载点');

createRoot(host).render(
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
);
