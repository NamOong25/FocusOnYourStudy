import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ApiError, assertNotCancelled, isCancelled } from '../../../shared/api/http';
import type { PreparedExport } from './dataExportApi';

export async function saveExport(file: PreparedExport, signal: AbortSignal, assertOwner: () => void): Promise<'sharing'> {
  assertNotCancelled(signal);
  assertOwner();
  const available = await Sharing.isAvailableAsync();
  assertNotCancelled(signal);
  assertOwner();
  if (!available) throw new ApiError('Thiết bị chưa hỗ trợ chia sẻ tệp. Bạn có thể tải bản sao trên web.', 'EXPORT_SHARING_UNAVAILABLE');
  const directory = new Directory(Paths.cache, 'focus-export-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  const cleanup = () => { try { if (directory.exists) directory.delete(); } catch { /* Cache storage can be reclaimed by the OS. */ } };
  try {
    directory.create();
    const output = new File(directory, file.filename);
    output.create();
    output.write(file.text, { encoding: 'utf8' });
    assertNotCancelled(signal);
    assertOwner();
    await Sharing.shareAsync(output.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Lưu bản sao dữ liệu học tập' });
    // Give the chosen receiving app time to read the file after the chooser closes.
    setTimeout(cleanup, 15 * 60_000);
    return 'sharing';
  } catch (error) {
    cleanup();
    if (isCancelled(error)) throw error;
    assertNotCancelled(signal);
    assertOwner();
    throw new ApiError('Chưa mở được bảng chia sẻ. Kiểm tra dung lượng trống rồi thử lại.', 'EXPORT_SAVE_FAILED');
  }
}
