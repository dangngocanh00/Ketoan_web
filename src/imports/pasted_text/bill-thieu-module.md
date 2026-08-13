# XÂY DỰNG MODULE 3 — BILL THIẾU
# ROLE: ADMIN / KẾ TOÁN

QUAN TRỌNG — TIẾP TỤC XÂY DỰNG TRÊN HỆ THỐNG HIỆN TẠI.

Tiếp tục xây dựng trong hệ thống AezCheck Accounting hiện có của project Figma Make này.

ĐÂY KHÔNG PHẢI yêu cầu tạo application mới.

Yêu cầu bắt buộc:
- Giữ nguyên application shell hiện tại.
- Giữ nguyên sidebar/navigation hiện tại.
- Giữ nguyên Dashboard hiện tại.
- Giữ nguyên module Phiên đối soát hiện tại.
- Giữ nguyên design system, typography, spacing, table, card, badge, button và interaction pattern hiện tại.
- Không tạo sidebar mới.
- Không thiết kế lại các màn hình đã hoàn thành.
- Tái sử dụng component hiện có.
- Giữ dữ liệu demo hiện tại.
- Bổ sung dữ liệu demo mới nhưng phải logic với dữ liệu của Phiên đối soát.
- Toàn bộ UI bằng TIẾNG VIỆT.
- Interaction phải hoạt động như prototype thật.

Thêm module:

BILL THIẾU

dành cho:

ADMIN
KẾ TOÁN

Module này phải liên kết trực tiếp với dữ liệu "Bank chưa đối soát" của module Phiên đối soát.

==================================================
1. MỤC TIÊU MODULE
==================================================

Module Bill thiếu dùng để Admin/Kế toán:

- Xem CS nào đang thiếu Bill.
- Xem CS thiếu Bill trong phiên nào.
- Xem số Bill thiếu.
- Xem tổng Amount thiếu.
- Theo dõi CS đã bổ sung được bao nhiêu Bill.
- Theo dõi còn bao nhiêu Bill chưa xử lý.
- Theo dõi trạng thái xử lý của CS.
- Theo dõi deadline.
- Xem giải trình CS gửi.
- Duyệt hoặc từ chối giải trình.
- Theo dõi Facebook Bill thừa.
- Copy danh sách Bill thiếu.
- Export dữ liệu.

Bill thiếu phát sinh khi:

Có Bank Transaction nhưng hệ thống chưa tìm được Facebook Bill hợp lệ tương ứng.

==================================================
2. INFORMATION ARCHITECTURE
==================================================

KHÔNG tạo nhiều menu/sidebar item riêng.

Trong menu:

BILL THIẾU

tạo 3 Tab ngang:

1. Bill thiếu
2. Chờ duyệt giải trình
3. Bill Facebook thừa

Thiết kế Tab theo style compact navigation giống module Phiên đối soát.

Cấu trúc:

[Tên Tab] [Count Badge]

Ví dụ:

Bill thiếu [383]

Chờ duyệt giải trình [12]

Bill Facebook thừa [26]

Không biến Tab thành KPI card.

==================================================
3. TAB MẶC ĐỊNH — BILL THIẾU
==================================================

Khi Admin/Kế toán vào module:

Mặc định mở:

BILL THIẾU

Header:

Bill thiếu

Subtext:

Theo dõi các Bill Bank chưa tìm được Facebook Bill và tiến độ xử lý của CS.

==================================================
4. KPI BILL THIẾU
==================================================

Đầu trang hiển thị 4 KPI:

### Tổng Bill thiếu

383 bill

### Tổng tiền thiếu

$3,560

### CS cần xử lý

8 CS

### Chờ duyệt giải trình

12 case

Tất cả KPI phải cập nhật theo filter hiện tại.

==================================================
5. FILTER BILL THIẾU
==================================================

Filter gồm:

### Ngày phiên

Sử dụng Date Picker.

Chỉ chọn MỘT ngày.

Không cho nhập ngày thủ công.

Không phải date range.

### Team

Dropdown.

### CS

Dropdown.

Nếu đã chọn Team:

CS dropdown chỉ hiển thị CS thuộc Team tương ứng nếu có mapping.

### Trạng thái

Các trạng thái:

- Tất cả
- Chưa xử lý
- Đang xử lý
- Chờ duyệt
- Quá hạn

Có action:

Xóa bộ lọc

==================================================
6. RULE TRẠNG THÁI CASE BILL THIẾU
==================================================

### Chưa xử lý

Hệ thống đã phát hiện Bill thiếu và tạo case cho CS.

CS chưa thực hiện hành động nghiệp vụ nào.

Chỉ mở màn hình hoặc xem dữ liệu KHÔNG được tính là hành động xử lý.

### Đang xử lý

Chuyển sang Đang xử lý khi CS thực hiện hành động nghiệp vụ đầu tiên.

Ví dụ:

- Upload Facebook Bill bổ sung.
- Paste Facebook Bill bổ sung.
- Giải trình trước đó bị từ chối và case được trả lại cho CS.

Không chuyển trạng thái chỉ vì CS mở trang.

### Chờ duyệt

CS xác nhận không thể tìm thêm Bill và đã gửi giải trình chung cho toàn bộ Bill còn thiếu.

### Quá hạn

Phiên đã hết thời gian xử lý nhưng case vẫn chưa được hoàn tất.

Không hiển thị trạng thái "Đã hoàn thành" trong màn Bill thiếu.

Case đã xử lý hoàn tất sẽ không còn xuất hiện trong danh sách Bill thiếu active.

==================================================
7. BẢNG BILL THIẾU — GOM THEO CS + PHIÊN
==================================================

KHÔNG hiển thị mỗi Bill thành một row tại màn tổng.

Một row phải đại diện cho:

1 CS + 1 Phiên

Ví dụ:

Mạnh + Phiên 08/08/2026

Các cột:

- CS
- Team
- Phiên
- Bill thiếu ban đầu
- Tiền thiếu ban đầu
- Đã bổ sung
- Còn thiếu
- Trạng thái
- Hành động gần nhất
- Hạn xử lý
- Action

Ví dụ:

CS:
Mạnh

Team:
Team Dũng

Phiên:
08/08/2026

Bill thiếu ban đầu:
35 bill

Tiền thiếu ban đầu:
$1,208

Đã bổ sung:
20 bill
$720

Còn thiếu:
15 bill
$488

Trạng thái:
Đang xử lý

Hành động gần nhất:
2 giờ trước

Hạn xử lý:
10/08/2026

Action:
Xem chi tiết

Amount là primary text.

Số Bill là secondary text khi hiển thị cùng Amount.

==================================================
8. CLICK CS → TRANG CHI TIẾT BILL THIẾU
==================================================

Click:

Xem chi tiết

hoặc click row

→ mở TRANG RIÊNG:

CHI TIẾT BILL THIẾU

Không dùng modal lớn cho toàn bộ màn này.

Header:

← Quay lại Bill thiếu

Bill thiếu — Mạnh

Phiên 08/08/2026 · Team Dũng

Badge:

Đang xử lý

Hạn xử lý:

10/08/2026

Còn:

11 giờ

Back phải quay về danh sách Bill thiếu và giữ filter trước đó.

==================================================
9. SUMMARY CHI TIẾT CS
==================================================

Hiển thị:

### Thiếu ban đầu

35 bill
$1,208

### Đã bổ sung thành công

20 bill
$720

### Còn thiếu

15 bill
$488

### Chờ duyệt giải trình

0 bill
$0

Nếu đã gửi giải trình:

15 bill
$488

==================================================
10. PROGRESS XỬ LÝ CỦA CS
==================================================

Progress tại đây KHÔNG sử dụng rule Amount của Progress phiên.

Đây là progress công việc của CS.

Tính theo:

Số Bill đã bổ sung thành công / Tổng số Bill thiếu ban đầu

Ví dụ:

20 / 35

Hiển thị:

20 / 35 bill đã bổ sung thành công

Không gây nhầm lẫn với Progress tài chính của Phiên đối soát.

==================================================
11. BẢNG BILL THIẾU CHI TIẾT
==================================================

Hiển thị từng Bank Transaction còn liên quan tới case.

Các cột:

- Ngày Bank
- ID TKQC
- Mã tham chiếu
- Last 4
- Amount
- Trạng thái
- Action

Không cần cột "CS xử lý".

Context của trang đã xác định CS.

Trạng thái từng Bill có thể gồm:

- Chưa bổ sung
- Đã đối soát
- Chờ duyệt giải trình

Ví dụ:

10/08
238472918...
ABC123
8821
$152
Chưa bổ sung

==================================================
12. CLICK BILL → RECORD DETAIL
==================================================

Click một Bill:

Mở side drawer hoặc modal:

CHI TIẾT BILL THIẾU

Hiển thị đầy đủ thông tin Bank Transaction có sẵn:

- Transaction ID
- Bank
- Ngày giao dịch
- Description gốc
- Reference gốc
- Reference chuẩn hóa
- Last 4
- Amount
- Currency
- Status
- CS
- Team
- TKQC xác định được / TKQC liên quan
- Source file
- Thời gian upload
- Phiên

Nếu có thông tin ownership:

Hiển thị:

CS phụ trách tại thời điểm giao dịch

và:

TKQC / Thẻ liên quan.

==================================================
13. XÁC ĐỊNH TKQC LIÊN QUAN
==================================================

Hệ thống có dữ liệu từ:

- Sheet khách hàng.
- Danh sách TKQC.
- Quan hệ TKQC ↔ Thẻ ↔ CS.
- Ownership TKQC theo thời gian.
- Ownership thẻ theo thời gian.
- Facebook Bill đã upload.
- Bank Transaction.

Vì vậy UI không mặc định gọi tất cả là "TKQC gợi ý".

Nếu hệ thống đủ dữ liệu xác định:

Hiển thị:

TKQC xác định được

Ví dụ:

238472918...

Nếu dữ liệu chưa đủ chắc:

Hiển thị:

TKQC có khả năng liên quan

Có thể có helper text:

Dựa trên CS, thẻ và thời điểm phát sinh giao dịch.

Logic chính xác để phân loại "xác định" và "có khả năng liên quan" sẽ được hoàn thiện trong technical specification sau.

==================================================
14. CS BỔ SUNG FACEBOOK BILL — BUSINESS RULE
==================================================

UI thao tác của CS CHƯA xây trong module này.

Tuy nhiên data demo và Admin/Kế toán UI phải phản ánh đúng workflow:

CS upload hoặc paste Facebook Bill bổ sung.

Hệ thống:

1. Lưu Facebook Bill.
2. Chạy matching tự động.
3. Không yêu cầu Kế toán match lại thủ công.

Nếu match thành công:

Bill được coi là:

ĐÃ ĐỐI SOÁT

Bill tự động giảm khỏi số Bill còn thiếu.

Ví dụ:

15 bill
→ 14 bill

$488
→ $336

Nếu toàn bộ Bill được bổ sung thành công:

Case không còn xuất hiện trong danh sách Bill thiếu active.

==================================================
15. FACEBOOK BILL UPLOAD KHÔNG MATCH
==================================================

Nếu CS upload Facebook Bill nhưng Bill đó không match Bill thiếu đang xem:

KHÔNG reject Bill.

Hệ thống vẫn:

- Lưu Facebook Bill.
- Chạy matching trên phạm vi dữ liệu phù hợp của phiên.

Nếu Bill match một Bank Transaction khác:

→ xử lý theo Bank Transaction đó.

Nếu không tìm được bất kỳ Bank Transaction phù hợp:

→ xác định:

BILL FACEBOOK THỪA

→ đưa vào Tab:

Bill Facebook thừa

→ thông báo Admin + Kế toán.

==================================================
16. COPY / EXPORT TRONG CHI TIẾT CS
==================================================

Tại Chi tiết Bill thiếu có:

COPY DANH SÁCH

và:

XUẤT FILE

Copy danh sách:

Copy các Bill còn thiếu theo format dễ gửi ra ngoài.

Ví dụ:

Mã tham chiếu | Last 4 | Amount

Không copy các Bill đã xử lý.

Xuất file:

Xuất danh sách Bill thiếu của CS + phiên hiện tại.

==================================================
17. EXPORT TẤT CẢ
==================================================

Tại màn Bill thiếu tổng có action:

XUẤT TẤT CẢ

Export theo filter hiện tại.

File XLSX:

Mỗi CS = một Tab riêng.

Ví dụ:

Tab Mạnh
Tab Huyền
Tab Nam
Tab Trang

Không export dữ liệu ngoài filter hiện tại.

==================================================
18. TAB — CHỜ DUYỆT GIẢI TRÌNH
==================================================

Tab thứ hai:

CHỜ DUYỆT GIẢI TRÌNH

Đây là inbox tập trung dành cho Admin/Kế toán.

Không tạo module riêng.

Count badge hiển thị số case đang chờ.

Ví dụ:

Chờ duyệt giải trình [12]

==================================================
19. RULE GIẢI TRÌNH
==================================================

CS KHÔNG chọn từng Bill để giải trình.

Khi CS quyết định:

"Không thể tìm thêm Bill"

thì giải trình mặc định áp dụng cho:

TOÀN BỘ BILL CÒN THIẾU CỦA CS TRONG PHIÊN ĐÓ TẠI THỜI ĐIỂM GỬI.

Ví dụ:

Ban đầu:
35 bill

CS bổ sung thành công:
20 bill

Còn:
15 bill · $488

CS gửi giải trình:

→ giải trình mặc định áp dụng toàn bộ:

15 bill · $488

Không có checkbox chọn từng Bill.

==================================================
20. MỖI CS + PHIÊN CHỈ CÓ 1 GIẢI TRÌNH ĐANG CHỜ
==================================================

Một CS trong một phiên:

chỉ được có tối đa:

1 GIẢI TRÌNH ĐANG CHỜ DUYỆT

tại cùng một thời điểm.

Không sinh nhiều giải trình nhỏ.

Nếu giải trình bị từ chối:

→ case quay lại Đang xử lý.

→ giải trình cũ giữ trong lịch sử.

→ CS có thể bổ sung Bill hoặc gửi một giải trình mới sau đó.

==================================================
21. FILTER CHỜ DUYỆT
==================================================

Filter:

- Ngày phiên — Date Picker, chọn 1 ngày
- Team
- CS

Có:

Xóa bộ lọc

==================================================
22. BẢNG CHỜ DUYỆT
==================================================

Các cột:

- CS
- Team
- Phiên
- Bill giải trình
- Tổng tiền
- Lý do
- Gửi lúc
- Thời gian chờ
- Action

Ví dụ:

Mạnh
Team Dũng
08/08/2026
15 bill
$488
ACC DIE
10/08 09:42
2 giờ 15 phút
Xem giải trình

Nếu nhiều lý do:

Hiển thị nhiều badge compact.

Ví dụ:

ACC DIE
BACK

==================================================
23. CLICK XEM GIẢI TRÌNH
==================================================

Mở trang/large drawer đủ rộng:

CHI TIẾT GIẢI TRÌNH

Phải cho Admin/Kế toán kiểm tra đầy đủ trước khi quyết định.

==================================================
24. THÔNG TIN CHUNG GIẢI TRÌNH
==================================================

Hiển thị:

CS:
Mạnh

Team:
Team Dũng

Phiên:
08/08/2026

Bill giải trình:
15 bill

Tổng Amount:
$488

Gửi lúc:
10/08/2026 09:42

Trạng thái:
Chờ duyệt

==================================================
25. DANH SÁCH BILL ĐƯỢC GIẢI TRÌNH
==================================================

Hiển thị toàn bộ Bill trong case.

Các field:

- ID TK
- Thẻ / Last 4
- Mã tham chiếu
- Amount

Ví dụ:

238472918...
8821
ABC123
$152

Không cho Admin/Kế toán hiểu đây chỉ là một Bill đại diện.

Phải nhìn được toàn bộ danh sách Bill đang được duyệt.

==================================================
26. LÝ DO GIẢI TRÌNH
==================================================

CS có thể chọn NHIỀU lý do cùng lúc:

- ACC DIE
- Không có quyền SHARE
- BACK

Ngoài ra có:

Lý do khác

và nội dung text nếu CS nhập.

Hiển thị các lý do đã chọn bằng badge/checkbox read-only rõ ràng.

==================================================
27. RULE ẢNH BẰNG CHỨNG PHÍA CS
==================================================

Workflow CS sẽ được xây ở module riêng sau.

Nhưng data và UI Admin/Kế toán phải tuân theo rule:

Trước khi CS upload/paste ít nhất một ảnh:

3 checkbox:

- ACC DIE
- Không có quyền SHARE
- BACK

ở trạng thái disabled.

Sau khi có ít nhất một ảnh:

→ enable checkbox.

CS có thể:

- Upload nhiều ảnh.
- Paste nhiều ảnh.
- Chọn nhiều loại lý do.

Không bắt buộc mapping:

Ảnh 1 → Bill 1
Ảnh 2 → Bill 2

Bằng chứng áp dụng chung cho case giải trình.

==================================================
28. GALLERY BẰNG CHỨNG CHO ADMIN/KẾ TOÁN
==================================================

Trong Chi tiết giải trình:

Tạo section:

BẰNG CHỨNG ĐÍNH KÈM

Hiển thị tất cả ảnh CS đã upload/paste.

Dùng thumbnail gallery.

Ví dụ:

[Ảnh 1] [Ảnh 2] [Ảnh 3] [Ảnh 4]

Click thumbnail:

→ mở Lightbox / Full Preview.

Cho phép:

← Ảnh trước
→ Ảnh tiếp theo
Đóng

Hiển thị:

- Tên file nếu có.
- Thời gian upload nếu có.
- Số thứ tự ảnh.

Admin/Kế toán phải xem được ảnh rõ ràng trước khi duyệt.

==================================================
29. ACTION DUYỆT GIẢI TRÌNH
==================================================

Cuối Chi tiết giải trình có:

[Từ chối giải trình]

[Chấp nhận giải trình]

Cả Admin và Kế toán đều có quyền thực hiện hai action này.

Không có approval 2 cấp.

Người thực hiện trước sẽ quyết định trạng thái case.

==================================================
30. TỪ CHỐI GIẢI TRÌNH
==================================================

Click:

TỪ CHỐI GIẢI TRÌNH

→ mở Modal.

Title:

Từ chối giải trình

Bắt buộc nhập:

Lý do từ chối

Textarea.

Button:

Hủy

Xác nhận từ chối

Sau khi xác nhận:

- Case quay lại trạng thái Đang xử lý.
- Bill vẫn là Bill thiếu.
- Không cộng Amount vào Tổng đã đối soát.
- Gửi Telegram cho CS.
- Lưu giải trình bị từ chối vào lịch sử.
- Ghi Audit Log.
- CS có thể tiếp tục bổ sung Bill hoặc gửi giải trình mới nếu phiên còn cho phép.

Hiển thị success feedback:

Đã từ chối giải trình và gửi thông báo cho CS.

==================================================
31. CHẤP NHẬN GIẢI TRÌNH
==================================================

Click:

CHẤP NHẬN GIẢI TRÌNH

KHÔNG duyệt ngay.

Mở Confirm Modal.

==================================================
32. CONFIRM MODAL
==================================================

Title:

Xác nhận chấp nhận giải trình?

Message:

Bạn đang xác nhận 15 bill · $488 của Mạnh trong phiên 08/08/2026 là hợp lệ.

Hiển thị summary:

CS:
Mạnh

Phiên:
08/08/2026

Bill được duyệt:
15

Tổng Amount:
$488

Hình thức đối soát:
Duyệt giải trình

Cảnh báo:

Sau khi xác nhận:

- 15 Bill này được coi là đã đối soát.
- $488 được cộng vào Tổng đã đối soát.
- Các Bill được loại khỏi danh sách Bill thiếu.
- Kết quả được ghi nhận vào Phiên đối soát.
- Hành động được lưu vào Audit Log.

Actions:

Hủy

Xác nhận chấp nhận

==================================================
33. SAU KHI CHẤP NHẬN
==================================================

Sau confirm:

Hiển thị success:

Đã chấp nhận giải trình

15 bill · $488 đã được ghi nhận là Đã đối soát qua giải trình.

Cập nhật đồng thời:

### Bill thiếu

Giảm:

15 bill
$488

Nếu CS không còn Bill thiếu:

→ row CS biến khỏi danh sách Bill thiếu active.

### Chờ duyệt giải trình

Case biến khỏi inbox.

### Phiên đối soát

Tăng:

Tổng đã đối soát

thêm:

$488

Giảm:

Bank chưa đối soát

tương ứng.

### Audit Log

Ghi:

Người duyệt
Role
Thời gian
CS
Phiên
Số Bill
Amount
Hình thức đối soát
Case ID

==================================================
34. HIỂN THỊ TRONG PHIÊN ĐỐI SOÁT
==================================================

Sau khi giải trình được duyệt:

Các Bill phải xuất hiện trong:

Phiên đối soát
→ Đã đối soát

Nhưng phải phân biệt với Bill match bình thường.

Bổ sung field/cột:

HÌNH THỨC ĐỐI SOÁT

Có ít nhất:

- Khớp Bill
- Duyệt giải trình

Ví dụ:

Reference:
ABC123

Last 4:
8821

Bank:
$152

Facebook:
—

Hình thức:
Duyệt giải trình

Kết quả:
Đã đối soát

KHÔNG tạo Facebook Bill giả.

==================================================
35. CLICK RECORD "DUYỆT GIẢI TRÌNH" TRONG PHIÊN
==================================================

Nếu click một record đã đối soát bằng giải trình:

Record Detail phải hiển thị:

THÔNG TIN BANK

↓

GIẢI TRÌNH CỦA CS

↓

LÝ DO

↓

BẰNG CHỨNG

↓

KẾT QUẢ DUYỆT

↓

Người duyệt
Role
Thời gian duyệt

Không cố hiển thị section Facebook Bill nếu không tồn tại Facebook Bill.

==================================================
36. TAB — BILL FACEBOOK THỪA
==================================================

Tab thứ ba:

BILL FACEBOOK THỪA

Đây là các Facebook Bill đã upload nhưng hệ thống không tìm được Bank Transaction tương ứng.

Current scope:

CHỈ THEO DÕI.

Không cho:

- Match thủ công.
- Gán Bank thủ công.
- Xác nhận bỏ qua.
- Sửa matching.

==================================================
37. SUMMARY BILL FACEBOOK THỪA
==================================================

Ví dụ:

Bill Facebook thừa

26 bill · Tổng giá trị $1,426

==================================================
38. FILTER BILL FACEBOOK THỪA
==================================================

Có:

Ngày phiên — Date Picker, chọn 1 ngày

Team

CS

Search:

ID TKQC

Mã tham chiếu

Last 4

Có:

Xóa bộ lọc

==================================================
39. BẢNG BILL FACEBOOK THỪA
==================================================

Các cột:

- Ngày Facebook
- CS upload
- Team
- ID TKQC
- Mã tham chiếu
- Last 4
- Amount
- Upload lúc
- Nguồn upload
- Trạng thái

Ví dụ:

08/08
Mạnh
Team Dũng
238472918...
ABC782
8821
$126
10/08 14:22
Bổ sung Bill thiếu
Chưa tìm thấy Bank

==================================================
40. CLICK BILL FACEBOOK THỪA
==================================================

Mở Record Detail.

Hiển thị đầy đủ Facebook Bill:

- Bill ID
- Ngày Facebook
- ID TKQC
- Tên TKQC nếu có
- Reference
- Last 4
- Amount
- Currency
- CS upload
- Team
- Source file
- Upload lúc
- Nguồn upload
- Phiên liên quan nếu xác định được

Kết quả matching:

KHÔNG TÌM THẤY BANK TRANSACTION TƯƠNG ỨNG

Không có action xử lý thủ công.

==================================================
41. COUNT BADGE CỦA 3 TAB
==================================================

Count badge phải thay đổi theo filter.

Ví dụ ban đầu:

Bill thiếu [383]

Chờ duyệt giải trình [12]

Bill Facebook thừa [26]

Chọn:

Ngày phiên 08/08
Team Dũng

có thể trở thành:

Bill thiếu [126]

Chờ duyệt giải trình [5]

Bill Facebook thừa [8]

Không sử dụng count global cố định khi filter đã thay đổi.

==================================================
42. QUAN HỆ BILL THIẾU ↔ CHỜ DUYỆT
==================================================

Đây là cùng một case, KHÔNG duplicate data.

Ví dụ:

Mạnh còn:

15 bill · $488

Khi Mạnh gửi giải trình:

Trong Tab Bill thiếu:

row Mạnh vẫn tồn tại.

Trạng thái:
Chờ duyệt

Còn thiếu:
15 bill · $488

Đồng thời:

Case xuất hiện trong:

Chờ duyệt giải trình.

Sau khi duyệt:

→ row Mạnh biến khỏi Bill thiếu nếu không còn Bill nào.

→ case biến khỏi Chờ duyệt.

→ Amount chuyển sang Đã đối soát.

==================================================
43. T0 VÀ NHẮC CS
==================================================

T0 = lần đầu hệ thống phát hiện Bill thiếu và gửi thông báo cho CS.

Không reset T0 khi hệ thống chạy matching lại.

Sau 24 giờ kể từ T0:

Nếu CS chưa có bất kỳ hành động nghiệp vụ nào:

→ gửi Telegram nhắc CS.

Action nghiệp vụ bao gồm:

- Upload Bill bổ sung.
- Paste Bill bổ sung.
- Gửi giải trình.

Chỉ mở màn hình không được tính.

Hiển thị ở UI nếu phù hợp:

Phát hiện thiếu:
09/08 10:24

Đã thông báo:
09/08 10:25

Hành động gần nhất:
Chưa có

Đã nhắc:
10/08 10:25

==================================================
44. DEADLINE PHIÊN
==================================================

Bill thiếu phải tuân theo deadline của Phiên đối soát.

Khi phiên đóng:

Nếu case chưa hoàn tất:

→ chuyển Quá hạn.

→ không nhận thêm giải trình mới.

→ không cho CS bổ sung Bill vào case của phiên đó.

→ giữ toàn bộ dữ liệu để Admin/Kế toán xem.

→ ghi nhận vào báo cáo phiên.

==================================================
45. AUDIT LOG — CHUẨN BỊ DATA
==================================================

Chưa cần xây module Audit Log trong prompt này.

Nhưng các interaction phải chuẩn bị data để sau này Audit Log ghi được:

- Phát hiện Bill thiếu.
- Tạo case.
- Gửi thông báo CS.
- CS upload Bill.
- CS paste Bill.
- Matching thành công.
- Matching thất bại.
- Facebook Bill thừa.
- CS gửi giải trình.
- Admin/Kế toán xem giải trình.
- Admin/Kế toán chấp nhận.
- Admin/Kế toán từ chối.
- Gửi Telegram CS.
- Nhắc CS sau 24h.
- Case quá hạn.
- Case hoàn tất.

Sau này Audit Log phải có khả năng drill-down về đúng module/record liên quan.

Chưa cần implement Audit Log trong update này.

==================================================
46. DATA DEMO
==================================================

Tạo data demo đủ nhiều để người dùng hình dung hệ thống thật.

Phải có nhiều:

- Team.
- CS.
- Phiên.
- Bill.
- Amount.

Tạo ít nhất các scenario:

### Scenario A

Mạnh

35 Bill thiếu
$1,208

Đã bổ sung:
20

Còn:
15
$488

Trạng thái:
Đang xử lý

### Scenario B

Huyền

18 Bill thiếu
$829

Chưa có hành động

Trạng thái:
Chưa xử lý

### Scenario C

Nam

12 Bill thiếu
$420

Đã gửi giải trình:

12 Bill
$420

Lý do:

ACC DIE
BACK

Có ít nhất 3 ảnh bằng chứng.

Trạng thái:

Chờ duyệt

### Scenario D

Trang

Case giải trình trước đó bị từ chối.

Trạng thái hiện tại:

Đang xử lý

Hiển thị hành động gần nhất:

Giải trình bị từ chối · 1 giờ trước

### Scenario E

Một CS quá hạn.

Hiển thị:

Quá hạn

và không còn action xử lý phía CS.

### Scenario F

Tạo ít nhất 8 Facebook Bill thừa.

Có nhiều CS khác nhau.

Có data để filter theo:

Team
CS
TKQC
Reference
Last 4

==================================================
47. INTERACTION DEMO BẮT BUỘC
==================================================

Prototype phải thao tác được:

1. Chuyển 3 Tab.
2. Date Picker.
3. Filter Team.
4. Filter CS.
5. Filter trạng thái.
6. Xóa filter.
7. Click CS.
8. Vào Chi tiết Bill thiếu.
9. Back và giữ filter.
10. Click từng Bill.
11. Xem full Bank Transaction.
12. Copy danh sách.
13. Export một CS.
14. Export tất cả.
15. Vào Chờ duyệt giải trình.
16. Click Xem giải trình.
17. Xem danh sách toàn bộ Bill giải trình.
18. Xem nhiều lý do.
19. Xem gallery nhiều ảnh.
20. Click ảnh mở Lightbox.
21. Chuyển ảnh trước/sau.
22. Từ chối giải trình.
23. Nhập lý do từ chối.
24. Confirm từ chối.
25. Chấp nhận giải trình.
26. Mở Confirm Modal.
27. Confirm chấp nhận.
28. Hiển thị success.
29. Cập nhật số Bill thiếu.
30. Cập nhật Chờ duyệt.
31. Cập nhật data Phiên đối soát tương ứng.
32. Vào Bill Facebook thừa.
33. Search Reference.
34. Click Bill Facebook thừa.
35. Xem full Facebook Bill.
36. Không hiển thị action match thủ công.

==================================================
48. STYLE
==================================================

Tiếp tục CHÍNH XÁC style hệ thống AezCheck Accounting hiện tại.

Ưu tiên:

- Internal SaaS.
- Data dense.
- Compact.
- Table-first.
- Hierarchy rõ.
- Tab navigation ngang.
- Amount căn phải.
- Badge semantic.
- Row hover.
- Sticky table header nếu bảng dài.
- Drawer/Modal đủ rộng.
- Gallery ảnh sạch, dễ kiểm tra.
- Confirm Modal rõ hậu quả action.

Không:

- Gradient.
- Glassmorphism.
- Illustration.
- Landing page style.
- Oversized typography.
- Card hóa từng Bill.
- Emoji trong UI.
- Tạo thêm sidebar.
- Thiết kế lại Dashboard.
- Thiết kế lại Phiên đối soát.

==================================================
49. KHÔNG BUILD TRONG PROMPT NÀY
==================================================

Chưa xây:

- UI dành cho CS.
- Form CS upload/paste Bill.
- Form CS gửi giải trình.
- Audit Log module.
- Telegram Settings.
- Manual Matching.
- Bùng.
- Hold.
- Workflow BACK riêng.
- Chat Admin ↔ Kế toán.
- Notification Center trong web.

BACK trong prompt này chỉ xuất hiện như:

MỘT LOẠI LÝ DO/BẰNG CHỨNG GIẢI TRÌNH.

Không xây workflow xử lý TKQC BACK riêng.

==================================================
50. CONTINUITY
==================================================

Sau khi hoàn thành phải có flow liên tục:

Dashboard
→ Phiên đối soát
→ Bank chưa đối soát
→ Bill thiếu
→ CS + Phiên
→ Chi tiết Bill thiếu

và:

Bill thiếu
→ Chờ duyệt giải trình
→ Chi tiết giải trình
→ Chấp nhận
→ Confirm
→ Đã đối soát qua giải trình
→ cập nhật Phiên đối soát

và:

Bill thiếu
→ Bill Facebook thừa
→ Chi tiết Facebook Bill

Tất cả phải nằm trong MỘT hệ thống AezCheck Accounting hiện tại.

KHÔNG build application mới.

KHÔNG build sidebar mới.

KHÔNG duplicate module hiện có.

TOÀN BỘ UI hiển thị cho người dùng bằng TIẾNG VIỆT.