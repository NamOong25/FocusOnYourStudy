export type SourcePage = { number: number; title: string; text: string };
export type SampleQuestion = { id: string; text: string; options: string[]; answer: number; explanation: string; page: number };
export type AiDocument = { id: string; title: string; subject: string; pages: SourcePage[]; summary: { title: string; short: string; detail: string; page: number }[]; questions: SampleQuestion[] };
// Authored excerpts for a UI demo. They are not parsed PDFs or user-uploaded documents.
export const aiDocuments: AiDocument[] = [
  { id: 'trees', title: 'Cây nhị phân & cách duyệt', subject: 'Cấu trúc dữ liệu', pages: [
    { number: 1, title: 'Cây tìm kiếm nhị phân', text: 'Trong ví dụ này, các khóa là duy nhất. Với mỗi nút của cây tìm kiếm nhị phân (BST), mọi khóa ở cây con trái nhỏ hơn khóa của nút, mọi khóa ở cây con phải lớn hơn khóa của nút. Quy tắc áp dụng tại mọi nút, không chỉ ở gốc. Khi tìm một khóa, so sánh với nút hiện tại rồi chọn nhánh trái hoặc phải phù hợp.' },
    { number: 2, title: 'Ba cách duyệt cây', text: 'Duyệt trước: Gốc → Trái → Phải. Duyệt giữa: Trái → Gốc → Phải. Duyệt sau: Trái → Phải → Gốc. Mỗi cách đều áp dụng đệ quy lên các cây con. Duyệt giữa một BST có khóa duy nhất sẽ cho các khóa theo thứ tự tăng dần.' },
    { number: 3, title: 'Chiều cao và chi phí tìm kiếm', text: 'Thời gian tìm kiếm trong BST phụ thuộc chiều cao h của cây, có giới hạn O(h). Cây cân bằng có chiều cao O(log n). Cây bị lệch có thể cao tới O(n), khiến tìm kiếm chậm. BST thông thường không tự bảo đảm cân bằng sau mỗi lần chèn.' },
  ], summary: [
    { title: 'Quy tắc BST', short: 'Trái nhỏ hơn, phải lớn hơn khóa của nút.', detail: 'Với khóa duy nhất, quy tắc áp dụng cho mọi khóa trong cây con tại mọi nút. Tìm kiếm chọn nhánh theo phép so sánh.', page: 1 },
    { title: 'Ghi nhớ cách duyệt', short: 'Duyệt giữa: Trái → Gốc → Phải.', detail: 'Duyệt trước đặt gốc đầu tiên; duyệt giữa đặt gốc ở giữa; duyệt sau đặt gốc cuối. Duyệt giữa BST cho thứ tự tăng dần khi khóa duy nhất.', page: 2 },
    { title: 'Đừng quên chiều cao', short: 'Cây lệch có thể khiến tìm kiếm tới O(n).', detail: 'Chi phí tìm kiếm theo chiều cao O(h). Cân bằng giúp h = O(log n); BST thường không tự bảo đảm điều đó.', page: 3 },
  ], questions: [
    { id: 'tree-1', text: 'Duyệt giữa đi theo thứ tự nào?', options: ['Gốc → Trái → Phải', 'Trái → Gốc → Phải', 'Trái → Phải → Gốc', 'Phải → Trái → Gốc'], answer: 1, explanation: 'Duyệt giữa xử lý cây con trái, nút gốc, rồi cây con phải.', page: 2 },
    { id: 'tree-2', text: 'Với BST có khóa duy nhất, khóa ở cây con trái thế nào so với nút?', options: ['Luôn lớn hơn', 'Luôn bằng nhau', 'Nhỏ hơn', 'Không có quy tắc'], answer: 2, explanation: 'Mọi khóa trong cây con trái nhỏ hơn khóa của nút đang xét.', page: 1 },
    { id: 'tree-3', text: 'BST bị lệch có thể khiến tìm kiếm có chi phí nào?', options: ['Luôn O(1)', 'Luôn O(log n)', 'O(n) trong trường hợp xấu', 'Không phụ thuộc chiều cao'], answer: 2, explanation: 'Cây lệch có chiều cao O(n); việc tìm có thể đi qua một chuỗi dài các nút.', page: 3 },
    { id: 'tree-4', text: 'Duyệt giữa BST có khóa duy nhất cho kết quả gì?', options: ['Khóa tăng dần', 'Khóa giảm dần', 'Chỉ các nút lá', 'Chỉ nút gốc'], answer: 0, explanation: 'Nhánh trái nhỏ hơn được duyệt trước gốc, rồi đến nhánh phải lớn hơn.', page: 2 },
    { id: 'tree-5', text: 'BST thông thường có luôn tự cân bằng sau khi chèn không?', options: ['Luôn có', 'Chỉ khi đủ 10 nút', 'Không bảo đảm', 'Luôn có chiều cao bằng 1'], answer: 2, explanation: 'BST thông thường không có bảo đảm tự cân bằng; chi phí còn phụ thuộc hình dạng cây.', page: 3 },
  ] },
  { id: 'database', title: 'Khóa & thiết kế bảng quan hệ', subject: 'Cơ sở dữ liệu', pages: [
    { number: 1, title: 'Khóa chính', text: 'Trong bảng SINH_VIEN, MaSV được chọn làm khóa chính. Giá trị khóa chính không trùng giữa các hàng và không được NULL. Họ tên không phù hợp để mặc định làm khóa chính vì nhiều sinh viên có thể trùng tên. Một khóa chính cũng có thể gồm nhiều cột.' },
    { number: 2, title: 'Khóa ngoại và liên kết', text: 'Bảng DANG_KY có cột MaSV tham chiếu SINH_VIEN.MaSV. Đây là một khóa ngoại, dùng biểu diễn liên kết và ràng buộc toàn vẹn tham chiếu. Nhiều hàng đăng ký có thể cùng tham chiếu một sinh viên. Hành vi khi xóa hàng được tham chiếu cần được thiết kế rõ; không mặc định là mọi dữ liệu liên quan đều tự bị xóa.' },
    { number: 3, title: 'Tách dữ liệu để giảm lặp', text: 'Nếu mỗi hàng đăng ký đều chép họ tên và thông tin liên hệ của sinh viên, việc đổi thông tin dễ phải sửa nhiều nơi. Tách thông tin sinh viên vào SINH_VIEN và giữ MaSV trong DANG_KY giúp giảm việc lặp và các cập nhật thiếu nhất quán. Việc chia bảng vẫn cần dựa trên khóa, phụ thuộc dữ liệu và nhu cầu truy vấn.' },
  ], summary: [
    { title: 'Nhận diện từng hàng', short: 'Khóa chính duy nhất, không NULL.', detail: 'MaSV nhận diện sinh viên trong ví dụ. Họ tên có thể trùng; khóa chính có thể gồm một hoặc nhiều cột.', page: 1 },
    { title: 'Liên kết có ràng buộc', short: 'Khóa ngoại biểu diễn tham chiếu giữa bảng.', detail: 'DANG_KY.MaSV tham chiếu SINH_VIEN.MaSV. Nhiều đăng ký có thể thuộc cùng sinh viên; cần xác định hành vi khi xóa.', page: 2 },
    { title: 'Giảm cập nhật nhiều nơi', short: 'Tách thông tin sinh viên khỏi các lần đăng ký.', detail: 'Giữ thông tin sinh viên một nơi giúp giảm lặp và cập nhật thiếu nhất quán. Không tách bảng tùy tiện mà cần xét phụ thuộc và nhu cầu truy vấn.', page: 3 },
  ], questions: [
    { id: 'db-1', text: 'Đặc điểm nào thuộc khóa chính?', options: ['Có thể trùng giữa các hàng', 'Duy nhất và không NULL', 'Luôn phải là họ tên', 'Luôn gồm đúng hai cột'], answer: 1, explanation: 'Khóa chính nhận diện hàng, không được trùng và không được NULL.', page: 1 },
    { id: 'db-2', text: 'DANG_KY.MaSV tham chiếu SINH_VIEN.MaSV là gì?', options: ['Ghi chú', 'Tên hiển thị', 'Khóa ngoại', 'Mật khẩu'], answer: 2, explanation: 'Đây là khóa ngoại biểu diễn tham chiếu từ đăng ký tới sinh viên.', page: 2 },
    { id: 'db-3', text: 'Tách thông tin sinh viên ra bảng riêng giúp gì?', options: ['Tự động xóa toàn bộ dữ liệu', 'Bỏ mọi ràng buộc', 'Giảm lặp và cập nhật thiếu nhất quán', 'Bảo đảm không cần khóa'], answer: 2, explanation: 'Giữ thông tin ở một nơi giảm việc phải sửa cùng dữ liệu ở nhiều hàng.', page: 3 },
    { id: 'db-4', text: 'Vì sao không mặc định dùng họ tên làm khóa chính?', options: ['Có thể trùng tên', 'Họ tên luôn NULL', 'Không có chữ số', 'Quá ngắn'], answer: 0, explanation: 'Nhiều sinh viên có thể trùng tên; MaSV được chọn để nhận diện trong ví dụ.', page: 1 },
    { id: 'db-5', text: 'Khi xóa hàng được khóa ngoại tham chiếu, cần làm gì?', options: ['Mặc định mọi hàng tự xóa', 'Bỏ qua toàn vẹn', 'Thiết kế rõ hành vi ràng buộc', 'Luôn đổi tên bảng'], answer: 2, explanation: 'Hành vi xóa phải được thiết kế, không suy ra mọi hàng liên quan đều tự xóa.', page: 2 },
  ] },
];
