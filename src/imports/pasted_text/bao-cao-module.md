# UPDATE / BUILD MODULE BÁO CÁO – ADMIN / KẾ TOÁN

QUAN TRỌNG:

Đây là UPDATE TIẾP vào hệ thống đối soát HIỆN TẠI.

KHÔNG tạo application mới.
KHÔNG tạo project mới.
KHÔNG thay sidebar hiện tại ngoài việc hoàn thiện menu "Báo cáo".
KHÔNG rollback các module đã hoàn thành.
KHÔNG redesign toàn bộ hệ thống.
KHÔNG tạo dataset độc lập chỉ dành cho Báo cáo.

Giữ nguyên:
- Design system hiện tại
- Sidebar hiện tại
- Header hiện tại
- Shared mock data hiện tại
- 3 Team hiện tại
- Danh sách CS hiện tại
- Phiên đối soát hiện tại
- Bill Bank / Facebook hiện tại
- Các business rule reconciliation hiện tại

Module Báo cáo phải sử dụng dữ liệu xuyên suốt hệ thống hiện tại.

Toàn bộ UI bằng TIẾNG VIỆT.

==================================================
1. MỤC ĐÍCH MODULE BÁO CÁO
==================================================

Module Báo cáo dành cho:

- Admin
- Kế toán

Báo cáo KHÔNG phải Dashboard.

Dashboard:
theo dõi vận hành hiện tại.

Báo cáo:
xem kết quả ĐÃ CHỐT của các phiên đối soát.

Module gồm 3 tab:

- Ngày
- Tuần
- Tháng

Mặc định:

Ngày

==================================================
2. BUSINESS RULE QUAN TRỌNG – SNAPSHOT
==================================================

Báo cáo phải dựa trên SNAPSHOT tại thời điểm phiên đóng.

Flow:

Phiên đối soát
→ Phiên đóng
→ Tạo Snapshot
→ Báo cáo ngày
→ Aggregate thành Báo cáo tuần / tháng

KHÔNG tính lại báo cáo lịch sử từ dữ liệu Bank / Facebook hiện tại.

Nếu sau khi phiên đóng:

- CS upload thêm Facebook Bill
- phát sinh dữ liệu mới
- dữ liệu hiện tại thay đổi

thì:

KHÔNG sửa Snapshot cũ.

KHÔNG thay đổi Báo cáo ngày cũ.

KHÔNG thay đổi số liệu tuần/tháng đã aggregate từ Snapshot đó.

==================================================
3. NGÀY PHÂN LOẠI BÁO CÁO
==================================================

Luôn sử dụng:

NGÀY CỦA PHIÊN

Không sử dụng ngày phiên được đóng.

Ví dụ:

Phiên:
08/08/2026

Đóng:
10/08/2026

thì báo cáo vẫn thuộc:

08/08/2026

và thuộc tuần/tháng chứa ngày:

08/08/2026.

==================================================
4. TAB BÁO CÁO NGÀY
==================================================

Báo cáo ngày thực chất là:

BÁO CÁO PHIÊN ĐÃ ĐÓNG.

Không phải báo cáo:

"hôm nay kế toán đã làm gì".

Ví dụ:

Báo cáo ngày 08/08/2026

=

Snapshot kết quả của Phiên 08/08/2026 sau khi phiên đã đóng.

==================================================
5. FILTER – BÁO CÁO NGÀY
==================================================

Hiển thị:

- Ngày phiên – Date Picker
- Team
- CS
- Trạng thái báo cáo
- Tìm kiếm phiên

Ngày phiên:

chọn 1 ngày duy nhất.

Không dùng date range.

Trạng thái gồm:

- Chưa có báo cáo
- Đã hoàn thành
- Đã đóng còn tồn đọng

"Chưa có báo cáo":

Phiên chưa đóng nên chưa có Snapshot chính thức.

==================================================
6. DANH SÁCH BÁO CÁO NGÀY
==================================================

Table gồm:

Ngày phiên
Trạng thái
Tổng chi tiêu Sheet
Tổng Bill Bank
Tổng Bill Facebook
Đã đối soát
Chưa đối soát
Ngoại lệ
Tiến độ
CS tồn đọng
Action

Action:

Xem chi tiết

==================================================
7. TIẾN ĐỘ ĐỐI SOÁT
==================================================

Toàn hệ thống đã chốt:

PROGRESS RECONCILIATION THEO AMOUNT.

Công thức:

Amount đã đối soát
/
Tổng Amount Bill Bank
× 100%

Không sử dụng:

Số Bill đã đối soát / Tổng số Bill Bank

trong Module Báo cáo.

==================================================
8. CLICK "XEM CHI TIẾT"
==================================================

Mở thành FULL PAGE.

Không dùng modal nhỏ.

Header:

Báo cáo phiên 08/08/2026

Có nút:

← Quay lại Báo cáo

Hiển thị:

- Ngày phiên
- Trạng thái
- Thời điểm chốt
- Snapshot ID

Ví dụ:

Ngày phiên:
08/08/2026

Thời điểm chốt:
10/08/2026 23:59

Snapshot:
RPT-20260808

==================================================
9. KPI – CHI TIẾT BÁO CÁO NGÀY
==================================================

Hiển thị:

1. Tổng chi tiêu Sheet

2. Tổng chi tiêu Bank
   + Tổng tiền Bank chưa đối soát

3. Tổng chi tiêu Facebook
   + Tổng tiền Facebook chưa đối soát

4. Tổng đã đối soát

5. Tiến độ đối soát

Ví dụ:

Tổng chi tiêu Sheet
$52,400

Tổng chi tiêu Bank
$51,800
Chưa đối soát: $1,200

Tổng chi tiêu Facebook
$51,200
Chưa đối soát: $600

Tổng đã đối soát
$50,600

Tiến độ
97.68%

Các số liệu phải derive từ Snapshot.

Không hard-code riêng trong component.

==================================================
10. BREAKDOWN THEO TEAM
==================================================

Tạo section:

THEO TEAM

Table:

Team
Sheet
Bank
Facebook
Đã đối soát
Chưa đối soát
Tiến độ
CS tồn đọng

Demo chỉ sử dụng 3 Team hiện có trong shared data.

Click Team:

filter hoặc drill-down xuống danh sách CS thuộc Team đó.

==================================================
11. BREAKDOWN THEO CS
==================================================

Section:

THEO CS

Table:

Team
CS
Sheet
Bank
Facebook
Đã đối soát
Bank chưa đối soát
Facebook chưa đối soát
Ngoại lệ
Trạng thái
Action

Trạng thái snapshot CS chỉ cần:

- Đã hoàn thành
- Còn tồn đọng

Không sử dụng:

Đang xử lý

vì đây là kết quả đã chốt.

==================================================
12. CLICK CS
==================================================

Click một CS:

hiển thị chi tiết kết quả của:

CS + Phiên

Phải sử dụng chính dữ liệu Snapshot của phiên đó.

Không lấy trạng thái live hiện tại để thay thế dữ liệu lịch sử.

==================================================
13. CS CÒN TỒN ĐỌNG
==================================================

Nếu Snapshot có CS chưa hoàn tất:

hiển thị section nổi bật:

CS CÒN TỒN ĐỌNG

Summary:

[N] CS
[N] Bill
[Amount]

Table:

Team
CS
Số Bill thiếu
Amount
Giải trình
Trạng thái cuối phiên
Action

Chỉ hiển thị CS còn tồn đọng.

CS đã hoàn tất:

KHÔNG hiển thị trong section này.

==================================================
14. CLICK CS TỒN ĐỌNG
==================================================

Cho xem:

danh sách Bill tồn đọng tại THỜI ĐIỂM PHIÊN ĐÓNG.

Không thay thế bằng danh sách Bill thiếu hiện tại nếu sau này dữ liệu đã thay đổi.

==================================================
15. NGOẠI LỆ TRONG BÁO CÁO
==================================================

Section:

NGOẠI LỆ TRONG PHIÊN

Scope hiện tại CHỈ gồm:

- Trùng Reference nhưng khác thông tin
- Lệch Amount
- Bill Bank chưa đối soát
- Bill Facebook chưa đối soát
- Các case giải trình liên quan

KHÔNG đưa:

- Bùng
- Back
- Hold

vào Module Báo cáo hiện tại.

==================================================
16. BẢNG NGOẠI LỆ
==================================================

Hiển thị:

Loại
Số case
Amount liên quan
Action

Click:

Xem chi tiết

Nếu context tương ứng vẫn tồn tại trong module khác:

cho phép drill-down sang đúng context.

Ví dụ:

Bill Bank chưa đối soát
→ Phiên đối soát

Case giải trình
→ Bill thiếu / Chi tiết giải trình

==================================================
17. SNAPSHOT NOTICE
==================================================

Trong Chi tiết Báo cáo phải có notice nhẹ:

"Báo cáo được tạo từ Snapshot tại thời điểm phiên đóng."

Nếu shared data xác định dữ liệu hiện tại của phiên đã thay đổi sau Snapshot:

hiển thị thêm:

"Dữ liệu hiện tại của phiên đã có thay đổi sau thời điểm chốt báo cáo."

Có action:

Xem dữ liệu hiện tại

→ chuyển sang Chi tiết Phiên tương ứng.

KHÔNG cập nhật lại Snapshot.

==================================================
18. TAB BÁO CÁO TUẦN
==================================================

Tuần được tính theo:

TUẦN LỊCH

Thứ 2
→
Chủ nhật.

KHÔNG sử dụng:

rolling 7 days.

Ví dụ:

Tuần 32/2026
03/08/2026 – 09/08/2026.

==================================================
19. NGÀY PHÂN PHIÊN VÀO TUẦN
==================================================

Sử dụng:

NGÀY PHIÊN.

Ví dụ:

Phiên 09/08

đóng ngày:
11/08

vẫn thuộc tuần:

03/08 – 09/08.

==================================================
20. FILTER – BÁO CÁO TUẦN
==================================================

Hiển thị:

- Chọn tuần
- Team
- CS

Hiển thị rõ:

Tuần XX
dd/mm/yyyy – dd/mm/yyyy

==================================================
21. KPI – BÁO CÁO TUẦN
==================================================

Aggregate từ Snapshot của các phiên đã đóng thuộc tuần.

Hiển thị:

- Tổng chi tiêu Sheet
- Tổng chi tiêu Bank
- Bank chưa đối soát
- Tổng chi tiêu Facebook
- Facebook chưa đối soát
- Tổng đã đối soát
- Tiến độ đối soát

Progress Amount vẫn:

Đã đối soát / Tổng Bank.

==================================================
22. TIẾN ĐỘ PHIÊN TRONG TUẦN
==================================================

Tạo card riêng:

TIẾN ĐỘ PHIÊN TRONG TUẦN

Ví dụ:

5 / 7 phiên đã đóng

Bên dưới:

- Phiên hoàn thành
- Phiên đóng còn tồn đọng
- Phiên chưa đóng

QUAN TRỌNG:

Đây là progress SỐ PHIÊN.

Không được nhầm với:

Tiến độ đối soát theo Amount.

Đặt label rõ ràng.

==================================================
23. TUẦN ĐANG DIỄN RA
==================================================

Nếu chưa đủ toàn bộ phiên cần thiết:

hiển thị:

TUẦN ĐANG DIỄN RA

và:

"5/7 phiên đã đóng"

Helper:

"Số liệu hiện tại chỉ bao gồm các phiên đã đóng."

Không coi đây là báo cáo tuần hoàn chỉnh.

==================================================
24. BREAKDOWN THEO NGÀY
==================================================

Section:

KẾT QUẢ THEO NGÀY

Table:

Ngày phiên
Trạng thái phiên
Sheet
Bank
Facebook
Đã đối soát
Chưa đối soát
Tiến độ

Các ngày chưa có Snapshot:

hiển thị:

Chưa đóng

Không giả số liệu.

==================================================
25. BREAKDOWN TUẦN THEO TEAM
==================================================

Table:

Team
Sheet
Bank
Facebook
Đã đối soát
Chưa đối soát
Tiến độ
Phiên tồn đọng

==================================================
26. BREAKDOWN TUẦN THEO CS
==================================================

Table:

Team
CS
Sheet
Bank
Facebook
Đã đối soát
Chưa đối soát
Tiến độ
Số phiên tồn đọng
Action

Click CS:

xem danh sách các phiên của CS trong tuần.

==================================================
27. TỒN ĐỌNG TRONG TUẦN
==================================================

Section:

TỒN ĐỌNG TRONG TUẦN

Chỉ aggregate tồn đọng từ:

CÁC PHIÊN ĐÃ ĐÓNG.

Summary:

[N] CS
[N] Bill
[Amount]

Table:

Team
CS
Số phiên tồn đọng
Bill thiếu
Amount
Giải trình
Action

==================================================
28. NGOẠI LỆ TRONG TUẦN
==================================================

Aggregate ngoại lệ từ Snapshot:

- Trùng Reference khác thông tin
- Lệch Amount
- Bill Bank chưa đối soát
- Bill Facebook chưa đối soát
- Giải trình

Cho click drill-down.

==================================================
29. TAB BÁO CÁO THÁNG
==================================================

Tháng sử dụng:

THÁNG DƯƠNG LỊCH.

Ví dụ:

Tháng 08/2026

=
01/08/2026 → 31/08/2026.

Sử dụng ngày phiên để xác định tháng.

==================================================
30. FILTER – BÁO CÁO THÁNG
==================================================

Hiển thị:

- Chọn tháng
- Team
- CS

==================================================
31. KPI – BÁO CÁO THÁNG
==================================================

Aggregate từ Snapshot các phiên đã đóng trong tháng.

Hiển thị:

- Tổng chi tiêu Sheet
- Tổng chi tiêu Bank
- Bank chưa đối soát
- Tổng chi tiêu Facebook
- Facebook chưa đối soát
- Tổng đã đối soát
- Tiến độ đối soát

==================================================
32. TIẾN ĐỘ PHIÊN TRONG THÁNG
==================================================

Card:

TIẾN ĐỘ PHIÊN TRONG THÁNG

Ví dụ:

18 / 22 phiên đã đóng

Breakdown:

- Phiên hoàn thành
- Phiên đóng còn tồn đọng
- Phiên chưa đóng

Nếu tháng hiện tại chưa kết thúc:

badge:

THÁNG ĐANG DIỄN RA.

==================================================
33. BREAKDOWN THEO TUẦN
==================================================

Đây là breakdown chính của Báo cáo tháng.

Table:

Tuần
Khoảng thời gian
Số phiên đã đóng
Đã đối soát
Chưa đối soát
Tiến độ
Trạng thái

Ví dụ:

Tuần 32
03/08 – 09/08
7/7
$320,000
$4,000
98.8%
Hoàn tất

==================================================
34. LƯU Ý TUẦN GIAO THÁNG
==================================================

Nếu một tuần lịch giao giữa 2 tháng:

Báo cáo tháng CHỈ tính các Snapshot có NGÀY PHIÊN thuộc tháng đang xem.

Ví dụ:

Tuần:
27/07 – 02/08

Báo cáo tháng 08:

chỉ tính:

01/08
02/08

Không lấy các phiên tháng 07 vào tổng tháng 08.

==================================================
35. BREAKDOWN THÁNG THEO TEAM
==================================================

Table:

Team
Sheet
Bank
Facebook
Đã đối soát
Chưa đối soát
Tiến độ
Phiên tồn đọng

==================================================
36. BREAKDOWN THÁNG THEO CS
==================================================

Table:

Team
CS
Sheet
Bank
Facebook
Đã đối soát
Chưa đối soát
Tiến độ
Phiên tồn đọng
Action

Click:

xem danh sách phiên của CS trong tháng.

==================================================
37. TỒN ĐỌNG THÁNG
==================================================

Section:

TỒN ĐỌNG THÁNG

Summary:

[N] CS
[N] Bill
[Amount]

Table:

Team
CS
Phiên
Bill thiếu
Amount
Trạng thái
Action

Một CS có thể xuất hiện ở nhiều phiên.

==================================================
38. NGOẠI LỆ THÁNG
==================================================

Table:

Loại
Số case
Amount
Action

Scope giữ nguyên:

- Trùng Reference khác thông tin
- Lệch Amount
- Bill Bank chưa đối soát
- Bill Facebook chưa đối soát
- Giải trình

==================================================
39. SO SÁNH THEO TUẦN
==================================================

Trong Báo cáo tháng có thể có một chart đơn giản:

TIẾN ĐỘ ĐỐI SOÁT THEO TUẦN

Hiển thị progress Amount của từng tuần.

Không thêm:

Top CS
Top Team
Ranking

Không biến Report thành Dashboard.

==================================================
40. EXPORT – BÁO CÁO NGÀY
==================================================

Button:

Xuất báo cáo

Cho:

Xuất XLSX

Báo cáo ngày gồm các sheet:

1. Tổng quan
2. Theo Team
3. Theo CS
4. Bill chưa đối soát
5. Ngoại lệ
6. CS tồn đọng – nếu có

==================================================
41. EXPORT – BÁO CÁO TUẦN
==================================================

XLSX gồm:

1. Tổng quan tuần
2. Theo ngày
3. Theo Team
4. Theo CS
5. Tồn đọng
6. Ngoại lệ

==================================================
42. EXPORT – BÁO CÁO THÁNG
==================================================

XLSX gồm:

1. Tổng quan tháng
2. Theo tuần
3. Theo Team
4. Theo CS
5. Tồn đọng
6. Ngoại lệ

==================================================
43. DATA DEMO
==================================================

Sử dụng shared dataset hiện tại.

Phải tạo tình huống đa dạng:

- Phiên hoàn thành 100%
- Phiên đóng còn tồn đọng
- CS hoàn thành
- CS còn Bill thiếu
- Lệch Amount
- Trùng Reference khác thông tin
- Giải trình đã được duyệt
- Giải trình bị từ chối
- Bank chưa đối soát
- Facebook chưa đối soát

Không tạo data riêng không liên kết với:

Dashboard
Phiên
Bill thiếu
Bank
Facebook
CS
Team.

==================================================
44. CONSISTENCY
==================================================

Ví dụ:

Phiên 08/08

Snapshot:

Bank:
$50,000

Đã đối soát:
$48,000

Bank chưa đối soát:
$2,000

thì:

Báo cáo ngày 08/08
Báo cáo tuần chứa 08/08
Báo cáo tháng chứa 08/08

phải aggregate từ chính Snapshot này.

Không tạo 3 con số khác nhau.

==================================================
45. FILTER PHẢI ẢNH HƯỞNG TOÀN MÀN
==================================================

Khi chọn:

Team
CS
Ngày
Tuần
Tháng

toàn bộ:

KPI
Chart
Table
Tồn đọng
Ngoại lệ

phải update theo filter.

Không chỉ filter table.

==================================================
46. VISUAL STYLE
==================================================

Giữ nguyên style của hệ thống hiện tại.

Ưu tiên:

- Clean
- Data-heavy nhưng dễ đọc
- Card KPI
- Table rõ ràng
- Badge trạng thái
- Progress bar
- Khoảng trắng hợp lý

Không dùng UI quá màu mè.

Không redesign Sidebar/Header.

==================================================
47. CROSS-MODULE NAVIGATION
==================================================

Các action:

Xem dữ liệu hiện tại
Xem Phiên
Xem Bill thiếu
Xem giải trình
Xem ngoại lệ

phải điều hướng tới đúng module/context hiện tại.

Không mở một mock modal không liên kết dữ liệu.

==================================================
48. KHÔNG BUILD AUDIT LOG TRONG PROMPT NÀY
==================================================

Audit Log sẽ được planning riêng.

Chỉ đảm bảo kiến trúc hiện tại có thể liên kết sang Audit Log sau này.

==================================================
49. SAU KHI IMPLEMENT
==================================================

Sau khi hoàn thành, báo lại:

1. Module Báo cáo có những tab nào.
2. Báo cáo ngày đang lấy dữ liệu từ đâu.
3. Báo cáo tuần được tính theo rolling 7 days hay tuần lịch.
4. Báo cáo tháng xử lý tuần giao tháng thế nào.
5. Snapshot có bị thay đổi khi dữ liệu live thay đổi hay không.
6. Progress reconciliation đang tính theo Amount hay số Bill.
7. Các filter có update toàn bộ KPI/table/chart hay không.
8. Drill-down đang điều hướng tới những module nào.
9. Export XLSX đang mô phỏng/cài đặt như thế nào.
10. Các file/component đã tạo hoặc chỉnh sửa.

QUAN TRỌNG CUỐI:

Phải implement trực tiếp vào React application hiện tại.

Không chỉ tạo mô tả/spec.
Không tạo application mới.
Không tạo ReportsV2 nếu Reports hiện tại đã tồn tại.
Nếu đã có component Reports thì UPDATE component đó.
Giữ toàn bộ module hiện tại hoạt động bình thường.