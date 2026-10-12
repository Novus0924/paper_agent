import { api } from '@/api/client';
import { useToastStore } from '@/store/toastStore';
import { download, downloadUrl } from './utils';

/**
 * 全部文献库导出（FE-19）：库页头部与报告页导出面板共用这一处。
 * 成功即触发浏览器下载并给成功提示；空库（后端 409）给可读文案而不是抛异常。
 * 返回是否成功，便于调用方管理按钮的 loading 态。
 */
export async function exportLibraryBibtex(): Promise<boolean> {
  const res = await api.exportLibrary('bibtex');
  if (!res.ok) {
    // 空库（后端 409 → NOT_READY）给专门的"没东西可导"文案；其余失败带上后端原因
    if (res.code === 'NOT_READY') {
      useToastStore.getState().push('library.exportEmpty', 'warn');
    } else {
      useToastStore
        .getState()
        .push('library.exportFailed', 'fail', { reason: res.error ?? '' });
    }
    return false;
  }
  if (res.blobUrl) {
    downloadUrl(res.filename ?? 'paper-agent-library.bib', res.blobUrl);
    window.setTimeout(() => URL.revokeObjectURL(res.blobUrl as string), 1500);
  } else if (res.filename && res.content != null) {
    download(res.filename, res.mime ?? 'application/x-bibtex;charset=utf-8', res.content);
  }
  useToastStore.getState().push('library.exportDone', 'ok');
  return true;
}
