import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '@/store/taskStore';
import { useToastStore } from '@/store/toastStore';
import { useUiStore } from '@/store/uiStore';

/**
 * 任务标识已经不存在（任务被删除、演示数据重置、旧收藏深链）：回到总览重选，
 * 而不是把用户关在"会话不存在"的死页上——总览就是首页（用户第 6 点）。
 * 只处理 NOT_FOUND：NETWORK / TIMEOUT 这类瞬时错误仍留在任务页给出重试。
 */
export function useTaskGoneRedirect(taskId: string): void {
  const navigate = useNavigate();
  const push = useToastStore((s) => s.push);
  const setCurrentTask = useUiStore((s) => s.setCurrentTask);
  const notFound = useTaskStore((s) => s.byId[taskId]?.notFound === true);

  useEffect(() => {
    if (!notFound) return;
    // 顶栏的"当前任务"与侧栏会话卡都跟着这个标识，留着就是指向一个不存在的运行
    setCurrentTask(null);
    push('toast.taskGone', 'warn', { id: taskId });
    navigate('/', { replace: true });
  }, [notFound, taskId, push, navigate, setCurrentTask]);
}
