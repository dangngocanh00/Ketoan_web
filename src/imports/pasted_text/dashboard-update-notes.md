# CẬP NHẬT MODULE DASHBOARD ADMIN / KẾ TOÁN

QUAN TRỌNG — TIẾP TỤC XÂY DỰNG TRÊN HỆ THỐNG HIỆN TẠI.

Tiếp tục xây dựng trong hệ thống AezCheck Accounting hiện có của project Figma Make này.

ĐÂY KHÔNG PHẢI yêu cầu tạo một ứng dụng mới hoặc thiết kế lại project từ đầu.

Yêu cầu bắt buộc:
- Giữ nguyên application shell hiện tại.
- Giữ nguyên sidebar và navigation hiện tại.
- Giữ nguyên design system, màu sắc, typography, spacing, card, table, badge, button và interaction pattern đã có.
- Không xóa hoặc tạo lại các màn hình đã được xây dựng.
- Không tạo sidebar mới.
- Tái sử dụng component hiện có khi phù hợp.
- Giữ lại dữ liệu demo hiện có và bổ sung thêm khi cần.
- Nếu Dashboard đã tồn tại, CẬP NHẬT Dashboard hiện tại, không tạo Dashboard thứ hai.
- Toàn bộ nội dung UI phải sử dụng TIẾNG VIỆT.
- Sau khi hoàn thành, toàn bộ hệ thống vẫn phải là MỘT ứng dụng AezCheck Accounting liên tục và điều hướng được giữa các module.

==================================================
1. MỤC TIÊU DASHBOARD
==================================================

Cập nhật màn hình:

DASHBOARD ĐỐI SOÁT — ADMIN / KẾ TOÁN

Dashboard là màn hình tổng quan vận hành, giúp Admin và Kế toán trả lời nhanh:

1. Tổng tiền đã đối soát là bao nhiêu?
2. Tổng chi tiêu Bank và Facebook là bao nhiêu?
3. Còn bao nhiêu tiền và bao nhiêu bill chưa được đối soát?
4. Các phiên đối soát hiện tại đang tiến triển như thế nào?
5. CS nào đang còn thiếu bill hoặc chưa hoàn thành?
6. Có những case nào đang chờ Admin/Kế toán xử lý?

Dashboard KHÔNG phải màn hình trực tiếp xử lý nghiệp vụ.

Các KPI, bảng và item cần hỗ trợ drill-down sang module xử lý tương ứng.

==================================================
2. HEADER
==================================================

Tiêu đề:

Dashboard đối soát

Mô tả:

Theo dõi tình trạng đối soát, phiên đang xử lý và các công việc cần chú ý.

Bên phải có badge role nhỏ:

Admin

hoặc:

Kế toán

Không thêm Notification Center.

Các notification nghiệp vụ sẽ được gửi qua Telegram.

==================================================
3. BỘ LỌC TOÀN DASHBOARD
==================================================

Tạo một filter bar gọn ngay dưới header.

Bao gồm:

### Ngày phiên

Các lựa chọn nhanh:

- Hôm nay
- Hôm qua
- 7 ngày
- 30 ngày
- Custom

Khi chọn Custom:

Cho phép chọn:

Từ ngày → Đến ngày

QUAN TRỌNG:

Ngày filter là NGÀY CỦA PHIÊN ĐỐI SOÁT / NGÀY DỮ LIỆU.

Không phải:
- Ngày hiện tại
- Ngày upload
- Ngày kế toán thao tác

Ví dụ:

08/08/2026 → 10/08/2026

thì lấy dữ liệu của:

Phiên 08/08
Phiên 09/08
Phiên 10/08

### Team

Mặc định:

Tất cả Team

Dữ liệu demo:

- Team Dũng
- Team Growth
- Team Scale

### CS

Mặc định:

Tất cả CS

Dữ liệu demo:

- Mạnh
- Huyền
- Nam
- Trang
- Long
- Diệp
- Mai
- Dũng

Khi chọn Team, danh sách CS có thể phụ thuộc Team đã chọn.

==================================================
4. NGUYÊN TẮC FILTER
==================================================

TẤT CẢ dữ liệu trên Dashboard phải thay đổi theo bộ lọc.

Bao gồm:

- Tổng đã đối soát
- Tổng Bank
- Tổng Facebook
- Bank chưa đối soát
- Facebook chưa đối soát
- Bill thiếu
- CS chưa hoàn thành
- Giải trình chờ duyệt
- Exception
- Progress
- Danh sách phiên
- Bảng CS cần chú ý
- Việc cần xử lý
- Biểu đồ

Ví dụ:

Chọn:

08/08 → 10/08

thì KPI phải tổng hợp dữ liệu của cả 3 phiên.

Ví dụ:

Bank phiên 08/08 = $52,480
Bank phiên 09/08 = $41,220

Nếu filter chỉ bao gồm 2 phiên này:

Tổng chi tiêu Bank = $93,700

Không được để filter chỉ thay đổi giao diện nhưng số liệu demo không thay đổi.

Khi chọn:

Team Dũng

→ toàn bộ Dashboard chỉ hiển thị dữ liệu Team Dũng.

Khi chọn tiếp:

CS Mạnh

→ toàn bộ Dashboard chỉ hiển thị dữ liệu của Mạnh thuộc phạm vi ngày phiên đang chọn.

Đối với KPI số lượng CS:

Nếu một CS xuất hiện trong nhiều phiên thì chỉ tính 1 CS unique, không cộng trùng.

==================================================
5. KHỐI TỔNG QUAN ĐỐI SOÁT
==================================================

Tạo section:

TỔNG QUAN ĐỐI SOÁT

Đầu tiên là 3 KPI tài chính lớn.

--------------------------------
CARD 1 — TỔNG ĐÃ ĐỐI SOÁT
--------------------------------

Demo:

$48,920

Subtext:

Bank ↔ Facebook đã khớp

Đây là tổng Amount của các giao dịch Bank đã tìm được Facebook Bill tương ứng và đối soát thành công.

Click card:

Đi đến:

Phiên đối soát → Đã khớp

và giữ các filter hiện tại nếu phù hợp.

--------------------------------
CARD 2 — TỔNG CHI TIÊU BANK
--------------------------------

Demo:

$52,480

Hiển thị thêm:

Chưa đối soát: $3,560

Hiển thị:

5,284 bill đủ điều kiện đối soát

Chỉ các giao dịch Bank đủ điều kiện đối soát mới được tính.

Hiện tại là các giao dịch SUCCESS.

Click phần:

Chưa đối soát: $3,560

→ đi đến danh sách Bank chưa đối soát.

--------------------------------
CARD 3 — TỔNG CHI TIÊU FACEBOOK
--------------------------------

Demo:

$50,130

Hiển thị thêm:

Chưa đối soát: $1,210

Subtext:

Facebook Bill đã upload

Click phần chưa đối soát:

→ đi đến danh sách Facebook Bill chưa đối soát.

==================================================
6. KPI VẬN HÀNH
==================================================

Bên dưới 3 KPI tài chính tạo 4 KPI nhỏ.

--------------------------------
BILL THIẾU
--------------------------------

383

Subtext:

8 CS đang cần xử lý

Click:

→ Module Bill thiếu

Giữ filter ngày phiên / Team / CS đang áp dụng.

--------------------------------
CS CHƯA HOÀN THÀNH
--------------------------------

8 / 42 CS

Breakdown:

5 đang xử lý
3 chưa có hành động

Nếu filter nhiều phiên:

Tính unique CS.

--------------------------------
CHỜ DUYỆT GIẢI TRÌNH
--------------------------------

12

Subtext:

CS đã gửi, chờ Admin/Kế toán

Click:

→ Exception & Duyệt
→ Filter Chờ duyệt giải trình

--------------------------------
EXCEPTION
--------------------------------

31

Breakdown:

18 Amount mismatch
7 Duplicate Reference
6 Facebook không có Bank

Click:

→ Exception & Duyệt

KHÔNG đưa vào Dashboard:

- Bill bùng
- TKQC BACK
- HOLD

Các trường hợp này đang nằm ngoài scope hiện tại.

==================================================
7. PHIÊN ĐANG ĐỐI SOÁT
==================================================

Tạo section lớn:

PHIÊN ĐANG ĐỐI SOÁT

Một ngày dữ liệu tạo một phiên.

Có thể có nhiều phiên Active cùng lúc.

Hiển thị từng phiên dạng row/card compact.

Dữ liệu demo:

--------------------------------
PHIÊN 09/08/2026
--------------------------------

Trạng thái:

Ngày 1/2

Tổng Bill Bank cần đối soát:

5,106

Đã đối soát:

4,742

Còn:

364 bill

CS chưa hoàn thành:

11

Thời gian còn lại:

Còn 35 giờ

--------------------------------
PHIÊN 08/08/2026
--------------------------------

Trạng thái:

Ngày 2/2

Tổng Bill Bank cần đối soát:

5,284

Đã đối soát:

4,901

Còn:

383 bill

CS chưa hoàn thành:

8

Thời gian còn lại:

Còn 11 giờ

Badge:

Sắp đóng

Click một phiên:

→ Chi tiết phiên đối soát tương ứng.

==================================================
8. PROGRESS BAR PHIÊN
==================================================

QUAN TRỌNG:

Progress phiên được tính theo SỐ LƯỢNG BILL BANK.

KHÔNG tính progress theo Amount.

Công thức:

Số Bill Bank đã đối soát
/
Tổng số Bill Bank đủ điều kiện đối soát
× 100%

Ví dụ:

4,901 / 5,284

=

92.8%

UI hiển thị:

92.8% đã đối soát

4,901 / 5,284 bill

Còn 383 bill

Progress bar thể hiện 92.8%.

Nếu Dashboard đang filter nhiều phiên thì progress tổng hợp được tính:

Tổng số Bill Bank đã đối soát của các phiên
/
Tổng số Bill Bank cần đối soát của các phiên
× 100%

Ví dụ KHÔNG được lấy trung bình cộng % của từng phiên.

Phải tính lại dựa trên tổng số bill.

Trong từng row/card phiên vẫn hiển thị progress riêng của phiên đó.

==================================================
9. CS CẦN CHÚ Ý
==================================================

Tạo bảng:

CS CẦN CHÚ Ý

Chỉ hiển thị CS đang còn việc chưa hoàn thành.

Không hiển thị toàn bộ CS.

Các cột:

- CS
- Team
- Bill thiếu
- Tiền thiếu
- Trạng thái
- Thời gian hành động gần nhất
- Phiên

QUAN TRỌNG:

Tên cột phải là:

Thời gian hành động gần nhất

Không dùng:

T0 lâu nhất

“Thời gian hành động gần nhất” là thời gian kể từ hành động nghiệp vụ gần nhất của CS.

Các hành động được tính:

- Upload Bill Facebook
- Paste Bill Facebook
- Gửi giải trình
- Bổ sung lại giải trình
- Bổ sung dữ liệu theo yêu cầu

Không tính:

- Login
- Mở màn hình
- Xem bill

Dữ liệu demo:

Mạnh
Team Dũng
35 bill
$1,208
Chưa xử lý
22 giờ trước
Phiên 08/08

Huyền
Team Growth
18 bill
$829
Đang xử lý
2 giờ trước
Phiên 08/08

Nam
Team Scale
11 bill
$302
Đã nhắc
26 giờ trước
Phiên 08/08

Ưu tiên CS cần xử lý gấp lên trên.

Có thể dựa trên:

- Phiên gần deadline
- Chưa có hành động
- Đã vượt mốc 24h
- Số lượng bill thiếu lớn

Click một CS:

→ Bill thiếu
→ đúng CS
→ đúng phiên

Không bắt người dùng phải filter lại thủ công.

==================================================
10. VIỆC CẦN ADMIN / KẾ TOÁN XỬ LÝ
==================================================

Bên cạnh bảng CS cần chú ý tạo một block compact:

VIỆC CẦN XỬ LÝ

Đây là những việc đang chờ phía Admin/Kế toán.

Không phải việc đang chờ CS.

Hiển thị:

18 Amount mismatch
Cần kiểm tra

12 Giải trình
Chờ duyệt

7 Duplicate Reference
Cần xác minh

6 Facebook Bill chưa có Bank
Cần kiểm tra

Click từng item:

Amount mismatch
→ Exception & Duyệt → Amount mismatch

Giải trình
→ Exception & Duyệt → Giải trình

Duplicate Reference
→ Exception & Duyệt → Duplicate Reference

Facebook Bill chưa có Bank
→ Exception & Duyệt → Facebook không có Bank

==================================================
11. BIỂU ĐỒ TIẾN ĐỘ ĐỐI SOÁT
==================================================

Chỉ tạo 1 biểu đồ chính.

Section:

TIẾN ĐỘ ĐỐI SOÁT

Hiển thị 3 series:

- Tổng Bank
- Tổng Facebook
- Tổng đã đối soát

Trục X:

Ngày phiên

Trục Y:

Amount

Ví dụ dữ liệu:

04/08
05/08
06/08
07/08
08/08
09/08
10/08

Mục tiêu:

Giúp Admin/Kế toán nhìn nhanh ngày nào khoảng cách giữa:

Bank
Facebook
Đã đối soát

bị tăng bất thường.

Biểu đồ phải thay đổi theo:

- Ngày phiên
- Team
- CS

Không tạo thêm nhiều chart không cần thiết.

Nếu filter chỉ còn một phiên, không cố hiển thị line chart một điểm khó hiểu.

Có thể chuyển sang dạng summary comparison phù hợp cho một phiên.

==================================================
12. TÌNH TRẠNG DỮ LIỆU
==================================================

Cuối Dashboard tạo section nhỏ:

TÌNH TRẠNG DỮ LIỆU

Không làm section này quá nổi bật.

Hiển thị:

Sheet khách hàng
Đã đồng bộ
10:21

TKQC / Thẻ
Đã đồng bộ
10:18

Bill Bank
Đã cập nhật
09:42

Bill Facebook
Đã cập nhật
10:24

Dùng indicator xanh khi bình thường.

Có thêm state demo lỗi:

Lỗi đồng bộ

Indicator đỏ.

Click nguồn dữ liệu:

→ đi tới khu vực cấu hình nguồn tương ứng trong Settings hiện tại.

==================================================
13. INTERACTION / DRILL-DOWN
==================================================

Dashboard chỉ là overview + navigation.

Không xử lý trực tiếp toàn bộ nghiệp vụ đối soát tại Dashboard.

Thiết lập interaction:

Tổng đã đối soát
→ Phiên đối soát / Đã khớp

Bank chưa đối soát
→ Phiên đối soát / Bank chưa đối soát

Facebook chưa đối soát
→ Phiên đối soát / Facebook chưa đối soát

Bill thiếu
→ Bill thiếu

CS cần chú ý
→ Bill thiếu / CS tương ứng / Phiên tương ứng

Chờ duyệt giải trình
→ Exception & Duyệt / Giải trình

Exception
→ Exception & Duyệt

Phiên
→ Chi tiết phiên

Nguồn dữ liệu
→ Settings / nguồn tương ứng

==================================================
14. CÁC STATE CẦN CÓ
==================================================

Prototype cần thể hiện được:

- Dashboard mặc định
- Đang loading dữ liệu
- Đã áp dụng filter
- Filter nhiều phiên
- Filter 1 Team
- Filter 1 CS
- Không có dữ liệu
- Hover KPI
- Click KPI
- Hover row
- Click CS
- Click phiên
- Data source lỗi
- Session sắp đóng

Khi thay đổi filter:

Có loading state ngắn.

Sau đó các số liệu phải thay đổi thực tế theo dữ liệu demo.

==================================================
15. LAYOUT GỢI Ý
==================================================

Từ trên xuống:

Dashboard đối soát
[Mô tả]                              [Admin/Kế toán]

[Ngày phiên] [Team] [CS]

------------------------------------------------

TỔNG QUAN ĐỐI SOÁT

[Tổng đã đối soát]
[Tổng Bank]
[Tổng Facebook]

[Bill thiếu]
[CS chưa hoàn thành]
[Chờ duyệt giải trình]
[Exception]

------------------------------------------------

PHIÊN ĐANG ĐỐI SOÁT

[Phiên 09/08 | Ngày 1/2 | Progress | Còn 35h]

[Phiên 08/08 | Ngày 2/2 | Progress | Còn 11h | Sắp đóng]

------------------------------------------------

[CS CẦN CHÚ Ý]              [VIỆC CẦN XỬ LÝ]

------------------------------------------------

TIẾN ĐỘ ĐỐI SOÁT

[Biểu đồ]

------------------------------------------------

TÌNH TRẠNG DỮ LIỆU

[Sheet KH] [TKQC/Thẻ] [Bill Bank] [Bill Facebook]

==================================================
16. YÊU CẦU VỀ STYLE
==================================================

Tiếp tục sử dụng CHÍNH XÁC style của hệ thống AezCheck Accounting hiện tại.

Phong cách:

- Internal SaaS
- Nền sáng
- Sidebar navy tối
- Card trắng
- Border nhẹ
- Shadow rất nhẹ
- Compact
- Data-heavy nhưng dễ đọc
- Ưu tiên bảng và dữ liệu
- Không để khoảng trắng quá lớn
- Inter
- Badge trạng thái nhỏ
- Button gọn
- Không gradient
- Không glassmorphism
- Không illustration
- Không style landing page

Dashboard phải tạo cảm giác là một hệ thống vận hành kế toán thật, không phải dashboard concept.

==================================================
17. YÊU CẦU NGÔN NGỮ
==================================================

TOÀN BỘ nội dung hiển thị cho người dùng phải bằng TIẾNG VIỆT.

Bao gồm:

- Menu
- Tiêu đề
- KPI
- Filter
- Button
- Table
- Modal
- Badge
- Tooltip
- Empty state
- Loading
- Error
- Success
- Demo content

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
Telegram

nhưng không tự động chuyển toàn bộ giao diện sang tiếng Anh.

==================================================
18. KHÔNG ĐƯỢC THÊM
==================================================

Không thêm:

- Notification Center
- Activity Feed
- Bill bùng
- TKQC BACK
- HOLD
- Revenue
- Profit
- Các KPI không liên quan đến đối soát
- Các biểu đồ trang trí không phục vụ nghiệp vụ

Notification nghiệp vụ sẽ xử lý qua Telegram.

Audit Log sẽ xử lý truy vết hệ thống.

==================================================
19. YÊU CẦU CUỐI CÙNG
==================================================

Sau khi hoàn thành:

Đây vẫn phải là MỘT hệ thống AezCheck Accounting duy nhất.

KHÔNG tạo project mới.

KHÔNG tạo Dashboard thứ hai.

KHÔNG tạo sidebar mới.

KHÔNG thay design system.

KHÔNG xóa các màn hình đã có.

Chỉ CẬP NHẬT Dashboard Admin/Kế toán hiện tại và kết nối các interaction của Dashboard với navigation/module của hệ thống.

Nếu một module đích chưa được xây dựng chi tiết, vẫn tạo navigation/placeholder hợp lý để sau này tiếp tục cập nhật module đó trong cùng hệ thống.