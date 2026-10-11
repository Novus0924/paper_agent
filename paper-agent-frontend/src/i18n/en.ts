import type { zhCN } from './zh-CN';

/**
 * 英文资源（结构预留，§10）：MVP 只提供骨架覆盖，缺失键自动回退简体中文。
 * 新增语言只需再增加一个同结构文件并在 locales 注册。
 */
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export const en: DeepPartial<typeof zhCN> = {
  app: {
    name: 'paper-agent',
    subtitle: 'Research Workbench',
    heroTitle: 'Ask a research question, get a traceable report',
    loading: 'Loading…',
  },
  nav: {
    workspace: 'Workspace',
    current: 'Current task',
    overview: 'Overview',
    monitor: 'Monitor',
    report: 'Report',
    evidence: 'Evidence',
    settings: 'Settings',
    collapse: 'Collapse sidebar',
    expand: 'Expand sidebar',
    history: 'Recent tasks',
    newTask: 'New research task',
  },
  common: {
    retry: 'Retry',
    refresh: 'Refresh',
    close: 'Close',
    back: 'Back',
    backToOverview: 'Back to overview',
    submit: 'Submit',
    loading: 'Loading',
    cancel: 'Cancel',
    delete: 'Delete',
    sendNow: 'Send now',
    whatIsThis: 'What is this',
    impact: 'Impact',
    reason: 'Reason',
    step: 'Step',
    all: 'All',
    search: 'Search',
    filter: 'Filter',
    clear: 'Clear',
    details: 'Details',
    copied: 'Copied',
    none: 'None',
    notApplicable: '—',
  },
  pager: {
    region: 'Pagination',
    prev: 'Previous',
    next: 'Next',
    range: 'Showing {from}–{to} of {total}',
    pagePos: 'Page {page}/{pages}',
    firstPage: 'Already on the first page',
    lastPage: 'Already on the last page',
    showMore: 'Show {count} more',
  },
  status: {
    run: {
      PLANNED: 'Planned',
      RUNNING: 'Running',
      DONE: 'Done',
      FAILED: 'Failed',
    },
    step: {
      PENDING: 'Pending',
      RUNNING: 'Running',
      DONE: 'Done',
      SKIPPED: 'Skipped',
      FAILED: 'Failed',
    },
    degraded: 'Degraded',
    partialSource: 'Some sources unavailable',
  },
  overview: {
    title: 'Overview',
    newTask: 'New task',
    colGoal: 'Goal',
    colStatus: 'Status',
    colUpdated: 'Updated',
    colAction: 'Action',
  },
  monitor: { title: 'Monitor' },
  report: { title: 'Report' },
  evidence: { title: 'Evidence' },
  settings: { title: 'Settings' },
  export: {
    panelTitle: 'Export',
    reportMd: 'Report Markdown',
    auditPack: 'Audit pack (ZIP)',
    sessionTrace: 'AGH session trace',
  },
  composer: {
    send: 'Send',
    inputLabel: 'Follow-up or revision',
  },
};
