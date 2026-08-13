# CẬP NHẬT MODULE 2 — PHIÊN ĐỐI SOÁT

QUAN TRỌNG — TIẾP TỤC XÂY DỰNG TRÊN HỆ THỐNG HIỆN TẠI.

Tiếp tục xây dựng trong hệ thống AezCheck Accounting hiện có của project Figma Make này.

ĐÂY KHÔNG PHẢI yêu cầu tạo ứng dụng mới hoặc thiết kế lại project từ đầu.

Yêu cầu bắt buộc:
- Giữ nguyên application shell hiện tại.
- Giữ nguyên sidebar và navigation hiện tại.
- Giữ nguyên design system, màu sắc, typography, spacing, card, table, badge, button và interaction pattern hiện tại.
- Không xóa hoặc tạo lại các màn hình đã xây dựng.
- Không tạo sidebar mới.
- Tái sử dụng component hiện có.
- Giữ dữ liệu demo hiện tại và bổ sung dữ liệu khi cần.
- Thêm/cập nhật module "Phiên đối soát" trong navigation hiện tại.
- Nếu module đã tồn tại, UPDATE module đó, không tạo module thứ hai.
- Toàn bộ nội dung UI phải bằng TIẾNG VIỆT.
- Các interaction phải hoạt động như prototype thật.
- Sau khi hoàn thành, đây vẫn phải là MỘT hệ thống AezCheck Accounting duy nhất.

==================================================
0. CẬP NHẬT RULE PROGRESS TOÀN HỆ THỐNG
==================================================

Cập nhật rule Progress đã sử dụng ở Dashboard trước đó.

Từ thời điểm này:

TIẾN ĐỘ ĐỐI SOÁT = SỐ TIỀN ĐÃ ĐỐI SOÁT / TỔNG SỐ TIỀN BILL BANK ĐỦ ĐIỀU KIỆN ĐỐI SOÁT × 100%

KHÔNG còn tính Progress theo số lượng Bill.

Ví dụ:

Tổng Bill Bank:
$52,480

Đã đối soát:
$48,920

Progress:

48,920 / 52,480 = 93.2%

Hiển thị:

93.2% đã đối soát

$48,920 / $52,480

Cập nhật Dashboard hiện tại để sử dụng cùng rule này.

Toàn hệ thống phải sử dụng một rule Progress thống nhất.

==================================================
1. MỤC TIÊU MODULE
==================================================

Module:

PHIÊN ĐỐI SOÁT

Đây là module trung tâm để Admin/Kế toán:

- Xem tất cả phiên đối soát.
- Theo dõi trạng thái từng phiên.
- Theo dõi tiến độ đối soát.
- So sánh Tổng chi tiêu Sheet / Bank / Facebook.
- Xem số tiền và số bill đã đối soát.
- Xem số tiền và số bill chưa đối soát.
- Xem ngoại lệ.
- Xem hạn xử lý.
- Drill-down vào chi tiết từng phiên.
- Xem chi tiết từng giao dịch.
- Export dữ liệu.

Hệ thống tự tạo một phiên đối soát cho mỗi ngày dữ liệu.

Ví dụ:

Phiên 08/08/2026

đại diện cho dữ liệu cần đối soát của ngày 08/08/2026.

==================================================
2. MÀN HÌNH DANH SÁCH PHIÊN
==================================================

Tạo/cập nhật màn:

PHIÊN ĐỐI SOÁT

Mô tả:

Theo dõi tiến độ và kết quả đối soát theo từng ngày dữ liệu.

==================================================
3. BỘ LỌC DANH SÁCH PHIÊN
==================================================

Bộ lọc gồm:

### Ngày phiên

Chỉ chọn MỘT ngày duy nhất.

Không phải date range như Dashboard.

Ví dụ:

08/08/2026

Ngày này là:

NGÀY PHIÊN / NGÀY DỮ LIỆU

### Trạng thái

Cho phép:

- Tất cả trạng thái
- Đang đối soát
- Sắp đóng
- Đã đóng
- Đã đóng còn tồn đọng

Có button:

Xóa bộ lọc

==================================================
4. TRẠNG THÁI PHIÊN
==================================================

Chỉ sử dụng 4 trạng thái:

### Đang đối soát

Phiên đang trong thời gian xử lý bình thường.

### Sắp đóng

Khi phiên còn dưới 6 giờ trước deadline.

### Đã đóng

Phiên đã kết thúc và không còn case tồn đọng.

### Đã đóng còn tồn đọng

Phiên đã kết thúc nhưng vẫn còn giao dịch/case chưa được xử lý hoàn tất.

Flow:

Đang đối soát
→ còn < 6 giờ
→ Sắp đóng
→ hết hạn
→ Đã đóng

hoặc:

→ Đã đóng còn tồn đọng

==================================================
5. BẢNG DANH SÁCH PHIÊN
==================================================

Hiển thị bảng data-dense, dễ scan.

Các cột BẮT BUỘC:

1. Ngày phiên
2. Trạng thái
3. Tổng chi tiêu Sheet
4. Tổng Bill Bank
5. Tổng Bill FB
6. Tiến độ
7. Đã đối soát
8. Chưa đối soát
9. Ngoại lệ
10. Hạn xử lý
11. Action

Ví dụ một row:

Ngày phiên:
08/08/2026

Trạng thái:
Sắp đóng

Tổng chi tiêu Sheet:
$53,120

Tổng Bill Bank:
$52,480

Tổng Bill FB:
$50,130

Tiến độ:
93.2%

Đã đối soát:
$48,920
4,901 bill

Chưa đối soát:
$3,560
383 bill

Ngoại lệ:
$840
31 bill

Hạn xử lý:
10/08/2026

Action:
Xem chi tiết

Với các cột có cả Amount và số bill:

Amount phải là thông tin chính.

Số bill là secondary text nhỏ hơn.

==================================================
6. TỔNG CHI TIÊU SHEET
==================================================

"Tổng chi tiêu Sheet" là một metric riêng.

Nguồn:

Các Sheet khách hàng đã được cấu hình trong hệ thống.

Tính tổng chi tiêu được ghi nhận cho đúng ngày phiên.

Ví dụ:

Phiên 08/08:

Tổng chi tiêu Sheet:
$53,120

Tổng Bank:
$52,480

Tổng Facebook:
$50,130

Mục tiêu là giúp Kế toán/Admin dễ dàng so sánh:

SHEET ↔ BANK ↔ FACEBOOK

Không tự động kết luận lỗi chỉ vì 3 số khác nhau.

==================================================
7. TRẠNG THÁI VISUAL
==================================================

Sử dụng semantic badge:

Đang đối soát:
badge primary/blue

Sắp đóng:
badge warning/orange

Đã đóng:
badge success/green

Đã đóng còn tồn đọng:
badge error/red hoặc warning mạnh

Phiên Sắp đóng cần dễ nhận biết nhưng không dùng animation gây mất tập trung.

==================================================
8. CLICK "XEM CHI TIẾT"
==================================================

KHÔNG mở modal lớn cho toàn bộ phiên.

Mở một TRANG RIÊNG:

CHI TIẾT PHIÊN ĐỐI SOÁT

Ví dụ route concept:

Phiên đối soát
→ Phiên 08/08/2026
→ Chi tiết phiên

Trên đầu trang có:

← Quay lại danh sách phiên

Click Back:

Quay lại danh sách phiên và giữ filter trước đó nếu có.

==================================================
9. HEADER CHI TIẾT PHIÊN
==================================================

Hiển thị:

Phiên đối soát 08/08/2026

Badge:

Sắp đóng

Hạn xử lý:

10/08/2026

Nếu đang active:

Hiển thị:

Còn 11 giờ

Nếu đã đóng:

Hiển thị:

Đã đóng ngày 10/08/2026

Nếu còn tồn đọng:

Badge:

Đã đóng còn tồn đọng

==================================================
10. KPI CHI TIẾT PHIÊN
==================================================

Đầu trang Chi tiết phiên hiển thị các KPI:

### Tổng chi tiêu Sheet

$53,120

### Tổng Bill Bank

$52,480

Secondary:

Chưa đối soát: $3,560

### Tổng Bill Facebook

$50,130

Secondary:

Chưa đối soát: $1,210

### Đã đối soát

$48,920

Secondary:

4,901 bill

### Chưa đối soát

$3,560

Secondary:

383 bill

### Ngoại lệ

$840

Secondary:

31 bill

==================================================
11. PROGRESS CHI TIẾT PHIÊN
==================================================

Hiển thị Progress rõ ràng:

93.2% đã đối soát

$48,920 / $52,480

Progress bar = 93.2%.

Nhắc lại:

Progress dựa trên AMOUNT.

Không dựa trên số lượng Bill.

==================================================
12. BỘ LỌC TRONG CHI TIẾT PHIÊN
==================================================

Tạo một filter/search bar dùng chung cho các danh sách.

Bao gồm:

### Team

Dropdown.

### CS

Dropdown.

Khi chọn Team, danh sách CS có thể phụ thuộc Team.

### ID TKQC

Search input.

Placeholder:

Tìm ID TKQC

### Last 4 thẻ

Search input.

Placeholder:

Tìm Last 4

### Mã tham chiếu

Search input.

Placeholder:

Tìm mã tham chiếu

Filter phải giữ nguyên khi người dùng chuyển giữa các Tab.

Ví dụ:

User tìm Reference ABC123 ở Tab Bank chưa đối soát.

Sau đó chuyển sang Facebook chưa đối soát.

Reference ABC123 vẫn được giữ.

==================================================
13. CHIA DỮ LIỆU THÀNH 4 TAB
==================================================

Chốt sử dụng 4 TAB riêng biệt.

KHÔNG gom tất cả vào một bảng duy nhất.

Các Tab:

1. Đã đối soát
2. Ngoại lệ
3. Bank chưa đối soát
4. Facebook chưa đối soát

Mỗi Tab hiển thị:

Tên
Số bill
Tổng Amount

Ví dụ:

Đã đối soát
4,901 bill · $48,920

Ngoại lệ
31 bill · $840

Bank chưa đối soát
383 bill · $3,560

Facebook chưa đối soát
126 bill · $1,210

==================================================
14. TAB 1 — ĐÃ ĐỐI SOÁT
==================================================

Mục tiêu:

Hiển thị các cặp giao dịch Bank ↔ Facebook đã đối soát thành công.

Một row = một cặp Bank ↔ Facebook.

Các cột:

- Ngày Bank
- Ngày FB
- CS
- TKQC
- Mã tham chiếu
- Last 4
- Bill Bank
- Bill FB
- Chênh lệch
- Kết quả

Demo:

Ngày Bank:
10/08

Ngày FB:
08/08

CS:
Mạnh

TKQC:
238472918...

Mã tham chiếu:
4KQ8X2

Last 4:
8821

Bill Bank:
$126.42

Bill FB:
$126.42

Chênh lệch:
$0

Kết quả:
Đã khớp

Dùng badge success.

==================================================
15. TAB 2 — NGOẠI LỆ
==================================================

Mục tiêu:

Hiển thị các giao dịch cần Admin/Kế toán kiểm tra thêm.

Current scope chỉ gồm:

- Lệch Amount
- Trùng mã tham chiếu nhưng thông tin khác nhau

Không đưa vào:

- Bill bùng
- BACK
- HOLD

Các cột:

- Loại ngoại lệ
- Ngày
- CS
- TKQC
- Mã tham chiếu
- Last 4
- Bill Bank
- Bill FB
- Chênh lệch
- Trạng thái

Demo 1:

Loại:
Lệch Amount

Ngày:
08/08

CS:
Mạnh

TKQC:
238472...

Reference:
ABC123

Last 4:
8821

Bank:
$100.42

Facebook:
$99.98

Chênh lệch:
$0.44

Trạng thái:
Cần kiểm tra

Demo 2:

Loại:
Trùng mã tham chiếu

CS:
Huyền

Reference:
XYZ789

Trạng thái:
Cần xác minh

==================================================
16. RULE TRÙNG MÃ THAM CHIẾU
==================================================

Nếu Reference trùng hoàn toàn và các thông tin liên quan cũng giống nhau:

Không coi là ngoại lệ chỉ vì Reference xuất hiện lại.

Nếu cùng Reference nhưng các thông tin khác nhau:

Tạo:

TRÙNG MÃ THAM CHIẾU

Khi click chi tiết:

Phải hiển thị TOÀN BỘ các Bill/Transaction liên quan tới Reference đó.

Không giới hạn chỉ 2 record.

Ví dụ Reference ABC123 xuất hiện 3 lần:

Hiển thị cả 3 record để Admin/Kế toán so sánh.

==================================================
17. TAB 3 — BANK CHƯA ĐỐI SOÁT
==================================================

Mục tiêu:

Hiển thị Bank transaction chưa tìm được Facebook Bill hợp lệ tương ứng.

Một row = một Bank transaction.

Các cột:

- Ngày Bank
- CS phụ trách
- TKQC gợi ý
- Mã tham chiếu
- Last 4
- Amount
- Trạng thái CS
- Thời gian còn lại

Demo:

Ngày Bank:
10/08

CS:
Mạnh

TKQC gợi ý:
238472918...

Mã tham chiếu:
ABC123

Last 4:
8821

Amount:
$152.00

Trạng thái CS:
Chưa xử lý

Thời gian còn lại:
11 giờ

Có thể có các trạng thái:

- Chưa xử lý
- Đang xử lý
- Đã nhắc
- Chờ duyệt giải trình

Nếu record đã hình thành case Bill thiếu:

Cho phép drill-down:

Xem trong Bill thiếu

Không xử lý toàn bộ workflow Bill thiếu trực tiếp trong module Phiên.

==================================================
18. TAB 4 — FACEBOOK CHƯA ĐỐI SOÁT
==================================================

Mục tiêu:

Hiển thị Facebook Bill chưa tìm được Bank transaction tương ứng.

Một row = một Facebook Bill.

Các cột:

- Ngày FB
- CS
- TKQC
- Mã tham chiếu
- Last 4
- Amount
- Ngày upload
- Trạng thái

Demo:

Ngày FB:
08/08

CS:
Nam

TKQC:
9172...

Mã tham chiếu:
QWE782

Last 4:
4482

Amount:
$84.20

Ngày upload:
10/08 09:42

Trạng thái:
Chưa tìm thấy Bank

==================================================
19. EXPORT THEO TỪNG TAB
==================================================

Mỗi Tab có button:

XUẤT FILE

Button đặt ở góc phải khu vực bảng.

Export phải tôn trọng:

- Phiên hiện tại
- Tab hiện tại
- Team đang filter
- CS đang filter
- ID TKQC
- Last 4
- Mã tham chiếu

Không export toàn bộ phiên nếu user đang filter.

Ví dụ:

User đang ở:

Phiên 08/08
→ Bank chưa đối soát
→ Team Dũng
→ CS Mạnh

Click:

Xuất file

→ chỉ export Bank chưa đối soát của Mạnh thuộc Team Dũng trong phiên 08/08.

Tên file demo:

Doi_soat_08082026_Bank_chua_doi_soat.xlsx

==================================================
20. CLICK MỘT ROW — CHI TIẾT RECORD
==================================================

Danh sách và chi tiết record là HAI tầng khác nhau.

Bảng dùng để scan/search.

Click một row:

Mở modal hoặc side drawer:

CHI TIẾT ĐỐI SOÁT

Không chuyển sang page mới cho từng Bill.

==================================================
21. CHI TIẾT BANK
==================================================

Nếu record có Bank transaction, hiển thị section:

THÔNG TIN BANK

Hiển thị đầy đủ các field có sẵn từ nguồn.

Ví dụ:

- Transaction ID
- Bank
- Ngày giao dịch
- Description gốc
- Reference gốc
- Reference đã chuẩn hóa
- Last 4
- Amount
- Currency
- Status
- CS
- Team
- Source file
- Thời gian upload

Không giới hạn chỉ các field đang hiển thị trong table.

==================================================
22. CHI TIẾT FACEBOOK BILL
==================================================

Nếu record có Facebook Bill, hiển thị:

THÔNG TIN FACEBOOK BILL

Ví dụ:

- Bill ID
- Ngày Facebook
- ID TKQC
- Tên TKQC nếu có
- Mã tham chiếu
- Last 4
- Amount
- Currency
- CS
- Team
- Source file
- Thời gian upload

==================================================
23. KẾT QUẢ MATCHING
==================================================

Trong chi tiết record luôn có section:

KẾT QUẢ ĐỐI SOÁT

Ví dụ Đã khớp:

ĐÃ KHỚP

Mã tham chiếu     ✓ Khớp
Last 4            ✓ Khớp
Amount            ✓ Khớp

Hoặc Amount mismatch:

LỆCH AMOUNT

Mã tham chiếu     ✓ Khớp
Last 4            ✓ Khớp
Amount            ✕

Bank:
$100.42

Facebook:
$99.98

Chênh lệch:
$0.44

Hoặc Bank chưa đối soát:

CHƯA TÌM THẤY FACEBOOK BILL

Hiển thị:

CS phụ trách
TKQC gợi ý
Reference
Last 4
Amount
Trạng thái CS

Nếu có case Bill thiếu:

Button:

Xem trong Bill thiếu

==================================================
24. PHÂN TÁCH TRÁCH NHIỆM MODULE
==================================================

Module Phiên đối soát chủ yếu để:

XEM
THEO DÕI
TÌM KIẾM
DRILL-DOWN
EXPORT
KIỂM TRA KẾT QUẢ MATCHING

Không xây toàn bộ workflow xử lý Bill thiếu tại đây.

Không xây toàn bộ workflow duyệt ngoại lệ tại đây.

Các nghiệp vụ sâu sẽ nằm tại:

Bill thiếu

và:

Exception & Duyệt

Từ module Phiên chỉ tạo đường dẫn tới đúng record/case.

==================================================
25. KHI PHIÊN ĐÓNG
==================================================

Khi hết deadline:

Không nhận giải trình mới.

Không cho CS bổ sung Bill vào phiên đó.

Khóa kết quả phiên.

Ghi snapshot kết quả cuối cùng.

Tạo báo cáo phiên.

Lưu toàn bộ case chưa đối soát.

Thông báo qua Telegram cho:

- Admin
- Kế toán

Các rule Leader sẽ được hoàn thiện trong module notification/report sau.

Admin/Kế toán vẫn có thể:

- Xem phiên đã đóng
- Xem KPI
- Xem 4 Tab
- Search
- Filter
- Xem chi tiết record
- Export dữ liệu

Không cho chỉnh sửa snapshot đã chốt.

==================================================
26. BILL FACEBOOK UPLOAD SAU KHI PHIÊN ĐÃ ĐÓNG
==================================================

Đây là business rule quan trọng.

Ví dụ:

Phiên 08/08 đã đóng.

Ngày 11/08 hệ thống nhận một Facebook Bill mới.

Hệ thống phát hiện Bill này có khả năng khớp với một Bank transaction chưa đối soát thuộc phiên 08/08.

KHÔNG:

- Mở lại phiên.
- Sửa KPI phiên cũ.
- Sửa progress phiên cũ.
- Sửa báo cáo phiên cũ.
- Tự động thay đổi snapshot phiên cũ.

CÓ:

- Phát hiện quan hệ.
- Ghi Audit Log.
- Đánh dấu Bill được bổ sung sau khi phiên đóng.
- Thông báo Admin/Kế toán qua Telegram.
- Cho Admin/Kế toán xem Bill mới và giao dịch cũ liên quan.

Hiển thị cảnh báo:

"BILL ĐƯỢC BỔ SUNG SAU KHI PHIÊN ĐÃ ĐÓNG"

Nội dung:

Bill này có khả năng khớp với giao dịch Bank thuộc phiên 08/08/2026. Kết quả đã chốt của phiên không bị thay đổi.

==================================================
27. DATA DEMO NHIỀU PHIÊN
==================================================

Tạo đủ dữ liệu demo để màn hình giống hệ thống thật.

Ví dụ:

### Phiên 08/08/2026

Sắp đóng

Sheet:
$53,120

Bank:
$52,480

Facebook:
$50,130

Đã đối soát:
$48,920
4,901 bill

Chưa đối soát:
$3,560
383 bill

Ngoại lệ:
$840
31 bill

Progress:
93.2%

Hạn:
10/08/2026

---

### Phiên 09/08/2026

Đang đối soát

Sheet:
$42,080

Bank:
$41,220

Facebook:
$39,870

Đã đối soát:
$37,950

Chưa đối soát:
$3,270

Ngoại lệ:
$520

Progress:
92.1%

Hạn:
11/08/2026

---

### Phiên 07/08/2026

Đã đóng

Tạo dữ liệu hoàn chỉnh, không tồn đọng.

---

### Phiên 06/08/2026

Đã đóng còn tồn đọng

Tạo một số Bank chưa đối soát và ngoại lệ để thể hiện trạng thái.

==================================================
28. INTERACTION DEMO BẮT BUỘC
==================================================

Prototype phải thao tác được:

1. Filter theo ngày phiên.
2. Filter theo trạng thái.
3. Xóa filter.
4. Click Xem chi tiết.
5. Back về danh sách phiên.
6. Chuyển 4 Tab.
7. Filter Team.
8. Filter CS.
9. Search ID TKQC.
10. Search Last 4.
11. Search mã tham chiếu.
12. Giữ filter khi đổi Tab.
13. Click một Bill.
14. Xem Bank + Facebook + kết quả matching.
15. Xem Amount mismatch.
16. Xem Duplicate Reference nhiều record.
17. Xem Bank chưa đối soát.
18. Export từng Tab.
19. Xem phiên đã đóng.
20. Xem phiên đã đóng còn tồn đọng.
21. Xem cảnh báo Bill được bổ sung sau khi phiên đóng.

Không tạo button giả không có phản hồi nếu interaction có thể demo được.

==================================================
29. EMPTY / LOADING / ERROR STATE
==================================================

Có state:

- Đang tải dữ liệu.
- Không tìm thấy phiên.
- Không có dữ liệu trong Tab.
- Không tìm thấy kết quả search.
- Lỗi tải dữ liệu.
- Export thành công.
- Export thất bại.

Ví dụ Empty State:

"Không có Bill Bank chưa đối soát"

Subtext:

"Tất cả Bill Bank trong phạm vi hiện tại đã được đối soát."

==================================================
30. STYLE
==================================================

Tiếp tục CHÍNH XÁC style AezCheck Accounting hiện tại.

Ưu tiên:

- Internal SaaS.
- Data dense.
- Compact.
- Dễ scan.
- Bảng rõ ràng.
- Header sticky nếu phù hợp.
- Table header sticky với bảng dài.
- Badge semantic.
- Amount căn phải.
- Số liệu tài chính dễ đọc.
- Row hover rõ.
- Không quá nhiều khoảng trắng.
- Modal/Drawer record detail đủ rộng để so sánh Bank ↔ Facebook.

Không:

- Gradient.
- Glassmorphism.
- Illustration.
- Landing page style.
- Oversized typography.
- Card hóa từng transaction.
- Thêm chart không cần thiết.

==================================================
31. NGÔN NGỮ
==================================================

TOÀN BỘ UI phải bằng TIẾNG VIỆT.

Bao gồm:

- Sidebar
- Header
- Filter
- Table
- Tab
- Button
- Modal
- Badge
- Tooltip
- Empty state
- Loading
- Error
- Success
- Demo data label

Có thể giữ các thuật ngữ quen thuộc:

Admin
CS
Team
TKQC
Bank
Facebook
Bill
Amount
Reference
Last 4
Telegram
Audit Log

Nhưng các câu và label UI xung quanh phải bằng tiếng Việt.

==================================================
32. KHÔNG ĐƯỢC THÊM
==================================================

Không thêm:

- Bill bùng
- TKQC BACK
- HOLD
- Notification Center
- Activity Feed
- Các nghiệp vụ chưa được mô tả
- Revenue/Profit
- Các biểu đồ không cần thiết

==================================================
33. YÊU CẦU CONTINUITY CUỐI CÙNG
==================================================

Sau khi hoàn thành:

Hệ thống vẫn phải là MỘT ứng dụng AezCheck Accounting duy nhất.

KHÔNG tạo project mới.

KHÔNG tạo sidebar mới.

KHÔNG tạo lại Dashboard.

KHÔNG xóa màn hình cũ.

KHÔNG thay design system.

Cập nhật Dashboard hiện tại để Progress sử dụng Amount.

Thêm/cập nhật module Phiên đối soát vào chính hệ thống hiện tại.

Dashboard phải có thể drill-down tới Phiên đối soát.

Phiên đối soát phải có thể quay lại Dashboard/navigation hiện tại.

Các module Bill thiếu và Exception & Duyệt nếu chưa hoàn thiện chỉ cần giữ destination/placeholder phù hợp để tiếp tục xây dựng trong các prompt sau.