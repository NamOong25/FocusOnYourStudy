export type ChecklistItem = { id: string; title: string; done: boolean };
export type SampleAttachment = { id: string; name: string; description: string; content: string };
export type TaskExtras = { checklist: ChecklistItem[]; attachments: SampleAttachment[] };
export type StudyStatus = 'Đã lên lịch' | 'Đang học' | 'Hoàn thành';
export type StudySession = { id: string; title: string; courseId: string; taskId?: string; date: string; start: string; duration: number; notes: string; status: StudyStatus; focusedSeconds: number };
export const sampleDocuments: SampleAttachment[] = [
  { id: 'sample-brief', name: 'Yêu cầu đồ án.txt', description: 'Đề bài minh họa · Văn bản', content: 'MỤC TIÊU ĐỒ ÁN\n\nXây dựng giao diện ứng dụng quản lý học tập.\n\n1. Phân tích các màn chính và xác định luồng thao tác.\n2. Hoàn thiện bố cục trên màn hình điện thoại.\n3. Kiểm tra nội dung, điều hướng và các trường hợp chưa có dữ liệu.\n4. Chuẩn bị phần trình bày kết quả.\n\nĐây là nội dung mẫu để thử giao diện tài liệu, không phải đề bài chính thức.' },
  { id: 'sample-report', name: 'Dàn ý báo cáo.md', description: 'Khung báo cáo minh họa', content: 'DÀN Ý BÁO CÁO\n\n• Giới thiệu đề tài và mục tiêu.\n• Phân tích yêu cầu.\n• Thiết kế dữ liệu và giao diện.\n• Kết quả thực hiện.\n• Kiểm thử, hạn chế và hướng phát triển.\n\nGợi ý: ghi lại các nguồn đã tham khảo ngay khi đọc tài liệu để dễ trích dẫn về sau.\n\nTài liệu mẫu phục vụ trải nghiệm giao diện.' },
  { id: 'sample-review', name: 'Kiểm tra trước khi nộp.txt', description: 'Danh sách rà soát minh họa', content: 'TRƯỚC KHI NỘP BÀI\n\n□ Đối chiếu với các yêu cầu của đề bài.\n□ Kiểm tra tên, mã sinh viên và thông tin nhóm.\n□ Mở thử tất cả tệp đính kèm.\n□ Đọc lại chính tả, bảng biểu và nguồn trích dẫn.\n□ Kiểm tra định dạng và hạn nộp.\n\nTài liệu mẫu phục vụ trải nghiệm giao diện.' },
];
export const initialTaskExtras: Record<string, TaskExtras> = {
  t1: { checklist: [ { id: 'check-1', title: 'Phác thảo các màn và luồng thao tác', done: true }, { id: 'check-2', title: 'Hoàn thiện giao diện trang chủ', done: false }, { id: 'check-3', title: 'Rà soát luồng đăng nhập và bản trình bày', done: false } ], attachments: [sampleDocuments[0]!] },
  t2: { checklist: [ { id: 'check-4', title: 'Thiết kế sơ đồ ERD', done: false }, { id: 'check-5', title: 'Chuẩn hóa các bảng dữ liệu', done: false } ], attachments: [sampleDocuments[1]!] },
};
export function timeMinutes(time: string) { const [h, m] = time.split(':').map(Number); return h! * 60 + m!; }
export function endTime(start: string, duration: number) { const minutes = timeMinutes(start) + duration; return `${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`; }
