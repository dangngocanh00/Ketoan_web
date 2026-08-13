# UPDATE MODULE PHIÊN ĐỐI SOÁT HIỆN TẠI

QUAN TRỌNG:

Đây là yêu cầu CẬP NHẬT module "Phiên đối soát" đã được xây dựng trong hệ thống AezCheck Accounting hiện tại.

KHÔNG tạo module mới.
KHÔNG tạo lại màn hình từ đầu.
KHÔNG tạo application mới.
KHÔNG thay sidebar.
KHÔNG thay design system.
KHÔNG xóa các interaction và dữ liệu demo hiện có đang đúng.

Chỉ cập nhật những nội dung được mô tả dưới đây.

Toàn bộ UI tiếp tục sử dụng TIẾNG VIỆT và giữ nguyên style hiện tại của AezCheck Accounting.

==================================================
1. CẬP NHẬT FILTER NGÀY PHIÊN
==================================================

Tại màn:

Phiên đối soát

Filter "Ngày phiên" phải sử dụng DATE PICKER.

KHÔNG cho người dùng nhập ngày thủ công bằng text input.

UI:

[ icon lịch ] Chọn ngày

Click vào:

→ mở Calendar / Date Picker.

Người dùng chỉ được chọn MỘT ngày duy nhất.

Không chọn date range.

Ví dụ:

Chọn 08/08/2026

→ danh sách chỉ hiển thị phiên có ngày phiên 08/08/2026.

Ngày ở đây là:

NGÀY PHIÊN / NGÀY DỮ LIỆU.

Không phải ngày upload hoặc ngày thao tác.

Giữ filter:

Trạng thái

với đúng 4 trạng thái:

- Đang đối soát
- Sắp đóng
- Đã đóng
- Đã đóng còn tồn đọng

Có action:

Xóa bộ lọc

==================================================
2. GIỮ NGUYÊN RULE TRẠNG THÁI PHIÊN
==================================================

Không thay đổi business rule hiện tại.

Các trạng thái:

Đang đối soát

→ khi còn dưới 6 giờ:

Sắp đóng

→ hết hạn và không còn tồn đọng:

Đã đóng

→ hết hạn nhưng còn case tồn đọng:

Đã đóng còn tồn đọng

==================================================
3. PROGRESS TOÀN HỆ THỐNG
==================================================

Đảm bảo module Phiên đối soát đang sử dụng đúng rule:

TIẾN ĐỘ
=
SỐ TIỀN ĐÃ ĐỐI SOÁT
/
TỔNG SỐ TIỀN BILL BANK ĐỦ ĐIỀU KIỆN ĐỐI SOÁT
× 100%

Progress tính theo AMOUNT.

KHÔNG tính theo số lượng Bill.

Ví dụ:

Tổng Bill Bank:
$41,220

Đã đối soát:
$37,950

Progress:
92.1%

Nếu Dashboard hiện tại vẫn đang tính Progress theo số lượng Bill thì cập nhật Dashboard sang cùng rule Amount này.

Toàn hệ thống phải thống nhất một cách tính.

==================================================
4. BẢNG DANH SÁCH PHIÊN
==================================================

Giữ cấu trúc bảng hiện tại nhưng đảm bảo các thông tin của mỗi phiên gồm:

- Ngày phiên
- Trạng thái
- Tổng chi tiêu Sheet
- Tổng Bill Bank
- Tổng Bill Facebook
- Tiến độ
- Đã đối soát
- Bank chưa đối soát
- Facebook chưa đối soát
- Ngoại lệ
- Hạn xử lý
- Action

KHÔNG dùng một cột chung tên "Chưa đối soát".

Phải tách rõ:

BANK CHƯA ĐỐI SOÁT

và

FACEBOOK CHƯA ĐỐI SOÁT.

Ví dụ một phiên:

Ngày phiên:
09/08/2026

Trạng thái:
Đang đối soát

Tổng chi tiêu Sheet:
$42,080

Tổng Bill Bank:
$41,220

Tổng Bill Facebook:
$39,870

Tiến độ:
92.1%

Đã đối soát:
$37,950
3,795 bill

Bank chưa đối soát:
$3,270
327 bill

Facebook chưa đối soát:
$1,400
192 bill

Ngoại lệ:
$520
18 bill

Hạn xử lý:
11/08/2026

Action:
Xem chi tiết

Với các cell có Amount + số Bill:

Amount là thông tin chính.

Số bill hiển thị secondary text nhỏ hơn.

==================================================
5. XEM CHI TIẾT PHIÊN
==================================================

Giữ hướng hiện tại:

Click "Xem chi tiết"

→ mở TRANG RIÊNG "Chi tiết phiên đối soát".

KHÔNG mở full-screen modal cho toàn bộ phiên.

Trang có:

← Quay lại danh sách phiên

Click Back:

→ quay lại danh sách phiên
→ giữ nguyên filter trước đó.

Ví dụ header:

Phiên đối soát 09/08/2026

[Đang đối soát]

Hạn xử lý: 11/08/2026
Còn 27 giờ

==================================================
6. KPI TRONG CHI TIẾT PHIÊN
==================================================

Giữ các KPI:

- Tổng chi tiêu Sheet
- Tổng Bill Bank
- Tổng Bill Facebook
- Đã đối soát
- Bank chưa đối soát
- Facebook chưa đối soát
- Ngoại lệ

Hiển thị Progress:

92.1% đã đối soát

$37,950 / $41,220

Progress bar tương ứng.

Các số liệu phải khớp với row của phiên tại màn Danh sách phiên.

==================================================
7. FILTER TRONG CHI TIẾT PHIÊN
==================================================

Giữ các filter/search:

[Team ▼]

[CS ▼]

[Tìm ID TKQC]

[Tìm Last 4]

[Tìm mã tham chiếu]

Khi chọn Team:

→ danh sách CS phải cập nhật theo Team nếu có dữ liệu mapping.

Filter áp dụng cho dữ liệu của phiên hiện tại.

QUAN TRỌNG:

Khi chuyển giữa các Tab, KHÔNG reset filter.

Ví dụ:

User tìm:

Reference ABC123

sau đó chuyển:

Bank chưa đối soát
→ Facebook chưa đối soát

thì Reference ABC123 vẫn được giữ.

==================================================
8. CẬP NHẬT THIẾT KẾ 4 TAB
==================================================

Hiện tại 4 Tab đang hiển thị dạng 2 dòng:

Tên Tab

Số bill · Amount

Cách hiển thị này chưa tốt.

CẬP NHẬT lại Tab theo style navigation ngang compact giống các tab điều hướng của một internal SaaS.

Mỗi Tab chỉ sử dụng MỘT DÒNG.

Cấu trúc:

[Icon] Tên Tab [Count Badge]

4 Tab:

[✓] Đã đối soát       [3.795]

[!] Ngoại lệ           [18]

[icon] Bank chưa đối soát       [327]

[icon] Facebook chưa đối soát   [192]

Yêu cầu:

- Icon nhỏ ở bên trái.
- Tên Tab ở giữa.
- Count Badge nhỏ bên phải.
- Không hiển thị Amount trực tiếp trong Tab.
- Không dùng layout 2 dòng.
- Tab active có underline rõ theo primary color của hệ thống.
- Tab inactive nhẹ hơn.
- Toàn bộ tab bar nằm trên cùng một hàng khi đủ không gian.
- Khoảng cách giữa các Tab cân đối.
- Tab phải giống navigation control, KHÔNG giống KPI card.

Có thể sử dụng icon phù hợp với design system hiện tại.

Không dùng emoji.

==================================================
9. SUMMARY CỦA TAB ĐƯỢC CHỌN
==================================================

Amount bị bỏ khỏi Tab KHÔNG có nghĩa là bỏ Amount khỏi UI.

Khi chọn một Tab, hiển thị summary ở phần header của danh sách phía dưới.

Ví dụ chọn:

BANK CHƯA ĐỐI SOÁT

Header:

Bank chưa đối soát

327 bill · Tổng giá trị $3,270

Bên phải:

[Xuất file]

Sau đó:

Filter/search nếu phù hợp

và:

Table.

Ví dụ chọn:

ĐÃ ĐỐI SOÁT

Hiển thị:

Đã đối soát

3.795 bill · Tổng giá trị $37,950

[Xuất file]

Ví dụ chọn:

NGOẠI LỆ

Hiển thị:

Ngoại lệ

18 bill · Tổng giá trị $520

[Xuất file]

Ví dụ chọn:

FACEBOOK CHƯA ĐỐI SOÁT

Hiển thị:

Facebook chưa đối soát

192 bill · Tổng giá trị $1,400

[Xuất file]

Tạo hierarchy rõ:

TAB
↓
SUMMARY DANH SÁCH
↓
TABLE

==================================================
10. GIỮ 4 TAB RIÊNG BIỆT
==================================================

Chốt sử dụng:

1. Đã đối soát
2. Ngoại lệ
3. Bank chưa đối soát
4. Facebook chưa đối soát

KHÔNG gom thành một bảng duy nhất.

==================================================
11. TAB ĐÃ ĐỐI SOÁT
==================================================

Một row = một cặp Bank ↔ Facebook đã match.

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

Ví dụ:

10/08
08/08
Mạnh
238472918...
4KQ8X2
8821
$126.42
$126.42
$0
Đã khớp

==================================================
12. TAB NGOẠI LỆ
==================================================

Current scope chỉ gồm:

- Lệch Amount
- Trùng mã tham chiếu nhưng thông tin khác nhau

Không thêm:

- Bùng
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
- Bill Facebook
- Chênh lệch
- Trạng thái

Ví dụ:

Lệch Amount
08/08
Mạnh
238472...
ABC123
8821
$100.42
$99.98
$0.44
Cần kiểm tra

==================================================
13. TAB BANK CHƯA ĐỐI SOÁT
==================================================

Một row = một Bank Transaction chưa tìm được Facebook Bill hợp lệ.

Các cột:

- Ngày Bank
- CS phụ trách
- TKQC gợi ý
- Mã tham chiếu
- Last 4
- Amount
- Trạng thái CS
- Thời gian còn lại

Ví dụ:

10/08
Mạnh
238472918...
ABC123
8821
$152.00
Chưa xử lý
11 giờ

Nếu đã hình thành Bill thiếu:

Cho phép action:

Xem trong Bill thiếu

Không xây workflow Bill thiếu trực tiếp tại đây.

==================================================
14. TAB FACEBOOK CHƯA ĐỐI SOÁT
==================================================

Một row = một Facebook Bill chưa tìm được Bank Transaction tương ứng.

Các cột:

- Ngày Facebook
- CS
- TKQC
- Mã tham chiếu
- Last 4
- Amount
- Ngày upload
- Trạng thái

Ví dụ:

08/08
Nam
9172...
QWE782
4482
$84.20
10/08 09:42
Chưa tìm thấy Bank

==================================================
15. CLICK ROW → CHI TIẾT RECORD
==================================================

Giữ interaction:

Click một row

→ mở Modal hoặc Side Drawer "Chi tiết đối soát".

Đây là RECORD DETAIL.

Không phải màn Chi tiết phiên.

List View dùng để scan/search.

Record Detail dùng để điều tra chi tiết.

==================================================
16. RECORD ĐÃ KHỚP
==================================================

Hiển thị:

THÔNG TIN BANK

và

THÔNG TIN FACEBOOK BILL

kèm:

KẾT QUẢ ĐỐI SOÁT

Ví dụ:

ĐÃ KHỚP

Mã tham chiếu     ✓ Khớp
Last 4            ✓ Khớp
Amount            ✓ Khớp

Hiển thị đầy đủ field nguồn có sẵn trong dữ liệu demo.

==================================================
17. RECORD LỆCH AMOUNT
==================================================

Hiển thị:

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

Admin/Kế toán phải nhìn được full thông tin Bank và Facebook liên quan.

==================================================
18. RECORD TRÙNG MÃ THAM CHIẾU
==================================================

Nếu cùng Reference nhưng các thông tin khác nhau:

→ tạo ngoại lệ Trùng mã tham chiếu.

Khi click:

Hiển thị TOÀN BỘ các Bill/Transaction có cùng Reference đó.

Ví dụ Reference ABC123 xuất hiện 3 lần:

→ hiển thị cả 3 record.

Không giới hạn thành so sánh 2 record.

Nếu các record trùng hoàn toàn và không có khác biệt nghiệp vụ:

Không tạo cảnh báo chỉ vì Reference xuất hiện nhiều lần.

==================================================
19. EXPORT
==================================================

Mỗi Tab có:

Xuất file

Export phải theo:

- Phiên hiện tại
- Tab hiện tại
- Team hiện tại
- CS hiện tại
- ID TKQC đang search
- Last 4
- Mã tham chiếu

Không export toàn phiên nếu người dùng đang filter.

Hiển thị feedback:

Xuất file thành công

hoặc:

Không thể xuất file. Vui lòng thử lại.

==================================================
20. PHIÊN ĐÃ ĐÓNG
==================================================

Admin/Kế toán vẫn được xem:

- KPI
- Progress
- 4 Tab
- Filter
- Search
- Record Detail
- Export

Nhưng:

KHÔNG cho thay đổi snapshot đã chốt.

Không nhận giải trình mới.

Không cho CS bổ sung Bill vào phiên.

Không tự cập nhật lại KPI của phiên đã đóng.

==================================================
21. BILL FACEBOOK ĐẾN SAU KHI PHIÊN ĐÃ ĐÓNG
==================================================

Giữ business rule hiện tại:

Nếu Facebook Bill được upload sau khi phiên đã đóng và hệ thống phát hiện có khả năng liên quan tới giao dịch thuộc phiên cũ:

KHÔNG:

- Mở lại phiên.
- Sửa KPI phiên.
- Sửa Progress.
- Sửa báo cáo phiên.
- Sửa snapshot.

CÓ:

- Ghi Audit Log.
- Thông báo Admin/Kế toán.
- Cho xem Bill mới và giao dịch cũ liên quan.

Case này CHƯA cần làm nổi bật trên UI chính.

Nhưng phải giữ business rule để sau này tạo scenario demo end-to-end.

==================================================
22. DATA DEMO
==================================================

Giữ data demo hiện tại và bổ sung đủ để test:

- Phiên Đang đối soát.
- Phiên Sắp đóng.
- Phiên Đã đóng.
- Phiên Đã đóng còn tồn đọng.
- Record đã khớp.
- Bank chưa đối soát.
- Facebook chưa đối soát.
- Lệch Amount.
- Trùng Reference nhiều record.

Các số giữa:

Danh sách phiên
↔ KPI Chi tiết phiên
↔ Summary Tab
↔ Table

phải LOGIC và KHỚP NHAU.

Ví dụ:

Nếu Phiên 09/08 có:

Đã đối soát:
$37,950 · 3.795 bill

thì:

Tab Đã đối soát:
Count = 3.795

Summary:
3.795 bill · Tổng giá trị $37,950

KPI:
Đã đối soát = $37,950

Các số không được mâu thuẫn nhau.

==================================================
23. INTERACTION CẦN GIỮ / DEMO
==================================================

Prototype phải thao tác được:

- Chọn ngày bằng Date Picker.
- Filter trạng thái.
- Xóa filter.
- Xem chi tiết phiên.
- Back về danh sách.
- Chuyển 4 Tab.
- Giữ filter khi chuyển Tab.
- Filter Team.
- Filter CS.
- Search ID TKQC.
- Search Last 4.
- Search Reference.
- Click record.
- Xem record đã khớp.
- Xem Amount mismatch.
- Xem Duplicate Reference nhiều record.
- Xem Bank chưa đối soát.
- Xem Facebook chưa đối soát.
- Export theo Tab.
- Xem phiên đã đóng.
- Xem phiên đã đóng còn tồn đọng.

Các case đặc biệt như:

"Facebook Bill được upload sau khi phiên đã đóng"

giữ data/rule để sau khi hoàn thiện toàn bộ UI hệ thống sẽ xây dựng bộ scenario demo end-to-end riêng.

==================================================
24. STYLE
==================================================

Giữ NGUYÊN style AezCheck Accounting hiện tại.

Đặc biệt:

- Internal SaaS.
- Data dense.
- Compact.
- Table-first.
- Tab navigation ngang.
- Icon nhỏ.
- Badge nhỏ.
- Border nhẹ.
- Không card hóa từng Tab.
- Không để Tab cao 2 dòng.
- Không gradient.
- Không glassmorphism.
- Không illustration.
- Không thay đổi sidebar.
- Không tạo lại page shell.

==================================================
25. YÊU CẦU CUỐI CÙNG
==================================================

Đây là UPDATE trên module Phiên đối soát hiện tại.

KHÔNG build lại hệ thống.

KHÔNG tạo module Phiên đối soát thứ hai.

KHÔNG thay đổi các phần đã đúng ngoài những update được yêu cầu ở trên.

Sau khi update:

Dashboard
→ Phiên đối soát
→ Chi tiết phiên
→ 4 Tab
→ Chi tiết Record

phải là một flow liên tục trong cùng hệ thống AezCheck Accounting.

Toàn bộ UI hiển thị cho người dùng phải bằng TIẾNG VIỆT.