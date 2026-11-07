import { ApiError, assertNotCancelled } from '../../../shared/api/http';
import type { PreparedExport } from './dataExportApi';

export async function saveExport(file: PreparedExport, signal: AbortSignal, assertOwner: () => void): Promise<'browser'> {
  assertNotCancelled(signal);
  assertOwner();
  let url: string | null = null;
  let link: HTMLAnchorElement | null = null;
  try {
    const blob = new Blob([file.text], { type: 'application/json;charset=utf-8' });
    url = URL.createObjectURL(blob);
    link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    assertOwner();
    assertNotCancelled(signal);
    link.click();
    const deliveredUrl = url;
    setTimeout(() => URL.revokeObjectURL(deliveredUrl), 60_000);
    url = null;
    return 'browser';
  } catch {
    assertNotCancelled(signal);
    assertOwner();
    throw new ApiError('Chưa gửi được tệp đến trình duyệt. Kiểm tra quyền tải xuống rồi bấm tải lại.', 'EXPORT_SAVE_FAILED');
  } finally {
    link?.remove();
    if (url) URL.revokeObjectURL(url);
  }
}
