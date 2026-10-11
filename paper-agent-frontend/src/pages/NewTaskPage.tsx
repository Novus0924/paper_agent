import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import layout from '@/styles/layout.module.css';
import ui from '@/styles/ui.module.css';
import wf from '@/styles/newtask.module.css';
import type { LitSource, SourceName, WorkflowName } from '@/api/types';
import { isLive } from '@/config/env';
import { EXAMPLE_QUESTIONS, SOURCES, WORKFLOW_ORDER, WORKFLOWS } from '@/config/registry';
import { useI18n } from '@/i18n';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { useToastStore } from '@/store/toastStore';
import { cx } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Field, TextArea, CheckRow } from '@/components/ui/Fields';
import { ErrorState } from '@/components/ui/Feedback';

const GOAL_MAX = 400;

/** 一键重跑预填（报告页/总览"再次研究"经 navigate state 传入） */
export interface RerunPrefill {
  goal: string;
  workflow: WorkflowName;
  lit_source: LitSource;
  sources: SourceName[];
}

function readRerunPrefill(state: unknown): RerunPrefill | null {
  const rerun = (state as { rerun?: RerunPrefill } | null)?.rerun;
  if (!rerun || typeof rerun.goal !== 'string' || !rerun.goal.trim()) return null;
  if (!(rerun.workflow in WORKFLOWS)) return null;
  const sources = Array.isArray(rerun.sources)
    ? rerun.sources.filter((s) => SOURCES.some((x) => x.name === s))
    : [];
  return { ...rerun, sources };
}

/** FE-04 新建任务向导：目标 → 工作流 → 数据源（含连通性预检）→ 提交即建会话并运行 */
export function NewTaskPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  // 预填只在挂载时消费一次（后退回到本页重新预填是合理行为）
  const prefill = useMemo(() => readRerunPrefill(location.state), [location.state]);
  const [goal, setGoal] = useState(prefill?.goal ?? '');
  const [workflow, setWorkflow] = useState<WorkflowName>(prefill?.workflow ?? 'research');
  const [sources, setSources] = useState<SourceName[]>(
    prefill?.sources && prefill.sources.length > 0
      ? prefill.sources
      : WORKFLOWS[prefill?.workflow ?? 'research'].defaultSources,
  );
  const [goalError, setGoalError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const preflight = useTaskStore((s) => s.preflight);
  const preflightLoading = useTaskStore((s) => s.preflightLoading);
  const checkPreflight = useTaskStore((s) => s.checkPreflight);
  const createTask = useTaskStore((s) => s.createTask);
  const setCurrentTask = useUiStore((s) => s.setCurrentTask);
  const toast = useToastStore((s) => s.push);

  const def = WORKFLOWS[workflow];
  const firstRun = useRef(true);
  /**
   * 独立连通性预检只在 mock 提供：后端把 probeSources 放在 POST /tasks 内
   * （routes/v1/tasks.ts），没有预检接口，live 的实测结果随创建任务返回。
   * 因此 live 不渲染"检测连通性"按钮，避免把"没有测量"显示成"后端不可达"。
   */
  const canPreflight = !isLive;

  useEffect(() => {
    // 切换工作流时回到该工作流的默认来源集合，避免带着不匹配的来源提交
    // 挂载那次不重置：重跑预填带来的来源集合要保留
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSources(WORKFLOWS[workflow].defaultSources);
  }, [workflow]);

  const unavailable = useMemo(
    () => new Set((preflight ?? []).filter((p) => !p.ok).map((p) => p.source)),
    [preflight],
  );

  const offlineOnly =
    sources.length > 0 &&
    sources.every((s) => SOURCES.find((x) => x.name === s)?.offline);

  function toggleSource(name: SourceName, checked: boolean) {
    setSources((prev) => {
      if (checked) return prev.includes(name) ? prev : [...prev, name];
      return prev.filter((s) => s !== name);
    });
  }

  async function onPreflight() {
    const list = await checkPreflight({ sources, lit_source: litSourceOf(sources) });
    // 不可用的来源不保留勾选（P-01：避免"总是降级"）
    const bad = new Set(list.filter((p) => !p.ok).map((p) => p.source));
    if (bad.size > 0) setSources((prev) => prev.filter((s) => !bad.has(s)));
    if (list.length === 0) setSubmitError('NETWORK');
  }

  async function onSubmit() {
    const trimmed = goal.trim();
    if (!trimmed) {
      setGoalError(t('newTask.goalRequired'));
      return;
    }
    if (trimmed.length > GOAL_MAX) {
      setGoalError(t('newTask.goalTooLong', { max: GOAL_MAX }));
      return;
    }
    if (sources.length === 0) {
      setSubmitError('BAD_PARAM');
      return;
    }
    setGoalError(null);
    setSubmitError(null);
    setSubmitting(true);
    const res = await createTask({
      goal: trimmed,
      workflow,
      lit_source: litSourceOf(sources),
      sources,
    });
    setSubmitting(false);
    if (!res.ok) {
      // 已填内容保留，可直接重试（§8.3 验收）
      setSubmitError(res.error.code);
      return;
    }
    setCurrentTask(res.taskId);
    toast('toast.taskCreated', 'ok');
    navigate(`/monitor/${res.taskId}`);
  }

  return (
    <div className={layout.page}>
      <div className={layout.pageHead}>
        <h2 className={layout.pageTitle}>{t('newTask.title')}</h2>
        <p className={layout.pageLead}>{t('app.heroLead')}</p>
      </div>

      <div className={wf.wizardGrid}>
        <div className={wf.formCol}>
          <Card
            title={<SectionTitle index={1} title={t('newTask.stepGoal')} />}
            icon="bulb"
          >
            <Field
              label={t('newTask.goalLabel')}
              hint={t('newTask.goalHint')}
              error={goalError}
              htmlFor="goal-input"
            >
              <TextArea
                id="goal-input"
                value={goal}
                maxLength={GOAL_MAX + 40}
                invalid={Boolean(goalError)}
                placeholder={t('newTask.goalPlaceholder')}
                onChange={(e) => {
                  setGoal(e.target.value);
                  if (goalError) setGoalError(null);
                }}
              />
            </Field>
            <p className={ui.hint}>{t('newTask.exampleChips')}</p>
            <div className={layout.chips}>
              {EXAMPLE_QUESTIONS.map((ex) => (
                <button
                  key={ex.title}
                  type="button"
                  className={layout.chipBtn}
                  onClick={() => {
                    setGoal(ex.value);
                    setGoalError(null);
                  }}
                >
                  <span className={layout.chipQ}>{ex.title}</span>
                  <span className={layout.chipN}>{ex.note}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card
            title={<SectionTitle index={2} title={t('newTask.stepWorkflow')} />}
            icon="list"
          >
            <p className={ui.hint}>{t('newTask.workflowLead')}</p>
            <div
              className={wf.wfList}
              role="radiogroup"
              aria-label={t('newTask.stepWorkflow')}
            >
              {WORKFLOW_ORDER.map((name) => {
                const item = WORKFLOWS[name];
                const active = name === workflow;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={cx(wf.wfItem, active && wf.wfActive)}
                    onClick={() => setWorkflow(name)}
                  >
                    <span className={wf.wfHead}>
                      {item.label}
                      <span className={wf.wfRadio} />
                    </span>
                    <span className={wf.wfDesc}>{item.description}</span>
                    <span className={wf.stepChain}>
                      <span className={wf.summaryLabel}>
                        {t('newTask.workflowStepsLabel')}
                      </span>
                      {item.steps.map((s) => (
                        <span key={s.id} className={wf.stepChip} title={s.label}>
                          {s.id} {s.label}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card
            title={<SectionTitle index={3} title={t('newTask.stepSources')} />}
            icon="evidence"
            actions={
              canPreflight ? (
                <Button
                  size="sm"
                  icon="refresh"
                  loading={preflightLoading}
                  onClick={() => void onPreflight()}
                >
                  {t('newTask.preflight.check')}
                </Button>
              ) : undefined
            }
          >
            <p className={ui.hint}>{t('newTask.sourcesLead')}</p>
            <p className={ui.muted}>
              {preflightLoading
                ? t('newTask.preflight.running')
                : preflight
                  ? t('newTask.preflight.done')
                  : canPreflight
                    ? t('newTask.preflight.idle')
                    : t('newTask.preflight.deferred')}
            </p>
            <div className={wf.sourceList}>
              {SOURCES.map((source) => {
                const result = preflight?.find((p) => p.source === source.name);
                const checked = sources.includes(source.name);
                const isBad = result ? !result.ok : unavailable.has(source.name);
                return (
                  <div
                    key={source.name}
                    className={cx(wf.sourceItem, isBad && wf.sourceUnavailable)}
                  >
                    <CheckRow
                      checked={checked}
                      // 不可用的来源不默认勾选，且勾选需明确确认（P-01）
                      onChange={(next) => toggleSource(source.name, next)}
                      title={
                        <span className={layout.row}>
                          {source.label}
                          <span className={wf.preflightRow}>
                            {!result ? (
                              <span className={ui.muted}>
                                {t('newTask.preflight.idle')}
                              </span>
                            ) : result.ok ? (
                              <span className={ui.badge}>
                                <Icon name="check" size={12} />{' '}
                                {t('newTask.preflight.ok')}
                                {/* 后端预检只回状态串、不回延迟（services/preflight.ts），
                                    没有实测值就不显示，避免光秃秃的 "ms" */}
                                {result.latency_ms !== undefined && (
                                  <span className={ui.monoInline}>
                                    {result.latency_ms}ms
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className={cx(ui.badge, ui.warn)}>
                                <Icon name="warn" size={12} />{' '}
                                {t('newTask.preflight.unavailable')}
                                <span className={ui.monoInline}>{result.detail}</span>
                              </span>
                            )}
                          </span>
                        </span>
                      }
                      note={source.note}
                    />
                    {isBad && result && !result.ok && (
                      <p className={cx(ui.note, ui.noteWarn)}>
                        <Icon name="warn" className={ui.noteIc} />
                        <span>
                          {t('newTask.preflight.unavailableImpact', {
                            detail: result.detail ?? '',
                          })}
                        </span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {offlineOnly && (
              <p className={cx(ui.note, ui.noteOk)}>
                <Icon name="shield" className={ui.noteIc} />
                <span>{t('newTask.offlineChoice')}</span>
              </p>
            )}
          </Card>

          {submitError && (
            <div className={layout.block}>
              <ErrorState code={submitError} />
              <p className={ui.muted}>{t('newTask.keepContent')}</p>
            </div>
          )}
        </div>

        <aside className={wf.summary}>
          <Card title={t('newTask.summaryTitle')} icon="info">
            <div className={wf.summaryRow}>
              <span className={wf.summaryLabel}>{t('newTask.summaryGoal')}</span>
              <span className={wf.summaryValue}>{goal.trim() || t('common.none')}</span>
            </div>
            <div className={wf.summaryRow}>
              <span className={wf.summaryLabel}>{t('newTask.summaryWorkflow')}</span>
              <span className={wf.summaryValue}>
                {def.label} · {def.steps.map((s) => s.id).join(' → ')}
              </span>
            </div>
            <div className={wf.summaryRow}>
              <span className={wf.summaryLabel}>{t('newTask.summarySources')}</span>
              <span className={wf.summaryValue}>
                {sources.length === 0
                  ? t('common.none')
                  : sources
                      .map((s) => SOURCES.find((x) => x.name === s)?.label ?? s)
                      .join('、')}
              </span>
            </div>
            <div className={wf.summaryRow}>
              <span className={wf.summaryLabel}>{t('newTask.summaryOutput')}</span>
              <span className={wf.summaryValue}>{t('newTask.summaryOutputValue')}</span>
            </div>
          </Card>

          <div className={wf.submitRow}>
            <Button
              variant="solid"
              icon="play"
              loading={submitting}
              onClick={() => void onSubmit()}
              className={layout.grow}
            >
              {submitting ? t('newTask.submitting') : t('newTask.submit')}
            </Button>
            <Button onClick={() => navigate('/')}>{t('common.cancel')}</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ index, title }: { index: number; title: string }) {
  return (
    <>
      <span className={wf.sectionNum}>{index}</span>
      {title}
    </>
  );
}

/** 只选离线来源时按 lit_source=local 提交，否则自动 */
function litSourceOf(sources: SourceName[]): LitSource {
  return sources.length > 0 &&
    sources.every((s) => SOURCES.find((x) => x.name === s)?.offline)
    ? 'local'
    : 'auto';
}
