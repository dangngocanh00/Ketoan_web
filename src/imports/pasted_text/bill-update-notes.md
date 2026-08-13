# UPDATE TIẾP MODULE BILL THIẾU – ADMIN / KẾ TOÁN

QUAN TRỌNG:

Đây là UPDATE TIẾP vào Module Bill thiếu HIỆN TẠI của hệ thống.

KHÔNG tạo application mới.
KHÔNG tạo module mới.
KHÔNG tạo MissingBillsV2.
KHÔNG redesign toàn bộ Module Bill thiếu.
KHÔNG thay sidebar.
KHÔNG thay routing.
KHÔNG rollback UI hiện tại.
KHÔNG thay đổi các business rule đã implement.

Giữ nguyên toàn bộ UI, interaction và shared data hiện tại.

Chỉ update ĐÚNG 2 nội dung dưới đây:

1. Bổ sung field cho bảng "Danh sách Bill giải trình".
2. Thêm khối "TKQC gợi ý cần kiểm tra" trong Chi tiết Bill thiếu của CS + Phiên.

==================================================
1. UPDATE BẢNG "DANH SÁCH BILL GIẢI TRÌNH"
==================================================

Vị trí:

Bill thiếu
→ Chờ duyệt giải trình
→ Xem giải trình
→ Danh sách Bill giải trình

Các record trong bảng này là:

BANK TRANSACTIONS đang được CS giải trình vì chưa tìm được Facebook Bill tương ứng.

Hiện tại bảng đang thiếu một số thông tin Bank.

Update bảng để hiển thị đầy đủ các cột:

- Ngày giao dịch
- Mã tham chiếu
- Last 4
- Amount
- Currency
- Description
- Trạng thái Bank
- Action

Không hiển thị TKQC như một field của Bank Transaction.

Bank source không có TKQC.

==================================================
2. HIỂN THỊ CỘT
==================================================

Thứ tự đề xuất:

Ngày giao dịch
Mã tham chiếu
Last 4
Description
Amount
Currency
Trạng thái Bank
Action

Amount căn phải.

Currency có thể đặt cạnh Amount nếu layout cần tối ưu.

Description cho phép wrap nếu nội dung dài.

Không truncate các thông tin quan trọng như:

Reference
Last 4
Amount.

==================================================
3. ACTION TRONG DANH SÁCH BILL GIẢI TRÌNH
==================================================

Giữ action:

Xem chi tiết

Khi click:

mở Chi tiết Bank Transaction hiện tại.

Không tạo một modal mới nếu Bank Transaction Detail đã tồn tại.

==================================================
4. DỮ LIỆU BẢNG GIẢI TRÌNH
==================================================

Bảng phải lấy dữ liệu từ chính:

bank_transaction_ids

của explanation case.

Sau đó resolve sang shared Bank Transaction data.

Không tạo một danh sách Bank demo riêng cho màn này.

Ví dụ:

Explanation:

EXP-000021

có:

BANK-TXN-000821
BANK-TXN-000822
BANK-TXN-000823

thì bảng phải render chính 3 Bank Transaction đó.

==================================================
5. THÊM "TKQC GỢI Ý CẦN KIỂM TRA"
==================================================

Vị trí:

Bill thiếu
→ chọn một CS + Phiên
→ Xem chi tiết

Ví dụ:

Chi tiết Bill thiếu
Mạnh
Phiên 08/08/2026

Thêm một section mới:

TKQC GỢI Ý CẦN KIỂM TRA

Section này nằm:

sau phần Summary/Progress của CS

và trước:

Danh sách Bank Bill còn thiếu.

Mục tiêu:

Giúp người dùng biết nên kiểm tra những TKQC nào trước để tìm Facebook Bill còn thiếu.

==================================================
6. QUAN TRỌNG – ĐÂY CHỈ LÀ GỢI Ý
==================================================

Bank Transaction KHÔNG có TKQC.

Do đó hệ thống KHÔNG được khẳng định:

"Bank Bill này thuộc TKQC X".

Không tạo direct mapping giả:

Bank Transaction → TKQC.

Khối này chỉ là:

RECOMMENDATION / SUGGESTION.

Tên UI chính xác:

TKQC gợi ý cần kiểm tra

Không dùng:

TKQC của Bill thiếu
TKQC tương ứng
TKQC đã xác định

==================================================
7. EXPLANATION TEXT
==================================================

Ngay dưới title:

TKQC gợi ý cần kiểm tra

hiển thị helper text:

"Hệ thống gợi ý các TKQC nên kiểm tra dựa trên dữ liệu chi tiêu, quyền sử dụng TKQC, thẻ và Bill Facebook đã tải lên."

Thêm một note nhỏ:

"Đây là gợi ý hỗ trợ tìm Bill, không phải kết quả đối soát chính thức."

UI note nhẹ, không cần warning màu đỏ.

==================================================
8. SUMMARY CỦA KHỐI GỢI Ý
==================================================

Ở đầu section có thể hiển thị:

TKQC nên kiểm tra:
4

Chênh lệch gợi ý:
$488

Con số phải derive từ shared demo data.

Không hard-code.

==================================================
9. TABLE "TKQC GỢI Ý CẦN KIỂM TRA"
==================================================

Hiển thị table:

TKQC
Thẻ sử dụng
Chi tiêu Sheet
Bill FB đã có
Chênh lệch gợi ý
Mức độ

Ví dụ:

238...821
•••• 8821
$520
$368
$152
Cao

238...542
•••• 1456
$310
$226
$84
Cao

238...109
•••• 7732
$280
$250
$30
Cần kiểm tra

==================================================
10. TKQC
==================================================

Hiển thị:

ID TKQC

Có thể rút gọn ở table nếu ID quá dài.

Nhưng hover/click hoặc tooltip phải xem được full ID.

Có thể thêm tên TKQC nếu shared data hiện tại có.

==================================================
11. THẺ SỬ DỤNG
==================================================

Hiển thị:

Last 4

Ví dụ:

•••• 8821

Quan trọng:

Phải sử dụng Card Ownership tại NGÀY CỦA PHIÊN.

Không lấy thẻ hiện tại nếu lịch sử ownership đã thay đổi.

==================================================
12. OWNERSHIP TKQC
==================================================

TKQC cũng phải xác định theo ownership history tại ngày phiên.

Ví dụ:

TKQC A

01/08–05/08:
Mạnh

06/08 trở đi:
Huyền

Nếu đang xem:

Mạnh + Phiên 03/08

thì TKQC A vẫn có thể được gợi ý cho Mạnh.

Nếu đang xem:

Huyền + Phiên 08/08

thì TKQC A có thể được gợi ý cho Huyền.

Không dùng current owner cho dữ liệu lịch sử.

==================================================
13. CHI TIÊU SHEET
==================================================

Cột:

Chi tiêu Sheet

lấy từ shared mock data đại diện cho Sheet khách hàng.

Phải filter theo:

Ngày phiên
+
CS
+
TKQC.

Không lấy tổng toàn tháng.

==================================================
14. BILL FACEBOOK ĐÃ CÓ
==================================================

Cột:

Bill FB đã có

thể hiện tổng Amount Facebook Bill hiện đã được hệ thống ghi nhận liên quan đến TKQC đó trong phạm vi ngày/phiên đang phân tích.

Đây là dữ liệu hỗ trợ suggestion.

Không coi số này là kết quả reconciliation chính thức.

==================================================
15. CHÊNH LỆCH GỢI Ý
==================================================

Prototype hiện tại có thể sử dụng logic demo:

Chi tiêu Sheet
-
Bill FB đã có

=
Chênh lệch gợi ý

Ví dụ:

Chi tiêu Sheet:
$520

Bill FB đã có:
$368

Chênh lệch gợi ý:
$152

Nếu <= 0:

không ưu tiên TKQC đó trong danh sách suggestion.

==================================================
16. LƯU Ý VỀ THUẬT TOÁN
==================================================

Đây mới là thuật toán DEMO để phục vụ prototype.

KHÔNG coi công thức:

Sheet Spend - Facebook Bill

là business rule production cuối cùng.

Architecture/code nên tách phần suggestion thành function/service riêng.

Ví dụ concept:

getSuggestedAccountsForMissingBills(...)

để sau này có thể thay đổi thuật toán mà không phải sửa UI.

Không hard-code suggestion trực tiếp trong component.

==================================================
17. MỨC ĐỘ GỢI Ý
==================================================

Prototype có thể chia:

Cao
Cần kiểm tra

Không cần tạo quá nhiều level.

Ưu tiên:

Cao

cho các TKQC có chênh lệch lớn và có dữ liệu ownership/card phù hợp.

Đây chỉ là visual prioritization.

Không ảnh hưởng reconciliation.

==================================================
18. SORT
==================================================

Mặc định sort:

Chênh lệch gợi ý giảm dần.

TKQC có khả năng thiếu Amount lớn nhất hiển thị trước.

==================================================
19. KHÔNG MATCH BANK BILL VỚI TKQC
==================================================

Đây là rule rất quan trọng.

Không được làm UI dạng:

BANK-TXN-001
→ Suggested TKQC 238...821

BANK-TXN-002
→ Suggested TKQC 238...542

vì hệ thống chưa đủ căn cứ xác định từng Bank Transaction thuộc TKQC nào.

Suggestion chỉ thực hiện ở cấp:

CS + PHIÊN.

Ví dụ:

Mạnh
Phiên 08/08

còn thiếu:
15 Bank Bill · $488

Hệ thống gợi ý:

4 TKQC nên kiểm tra.

==================================================
20. KHÔNG ẢNH HƯỞNG SỐ LIỆU ĐỐI SOÁT
==================================================

TKQC suggestion:

KHÔNG được:

- cộng vào Đã đối soát;
- giảm Bill thiếu;
- tạo Match;
- tạo Facebook Bill;
- thay đổi trạng thái Bill;
- thay đổi trạng thái Phiên.

Nó chỉ hỗ trợ người dùng tìm Bill.

==================================================
21. SHARED DATA
==================================================

Sử dụng shared mock data hiện tại để tạo suggestion.

Không tạo:

suggestedAccountsMock

hoàn toàn độc lập với hệ thống.

Suggestion phải derive từ:

- session
- CS/user
- TKQC ownership history
- card ownership history
- Sheet customer/spend data
- Facebook Bills hiện có

Nếu shared data hiện tại chưa đủ field:

bổ sung field cần thiết vào shared data.

Không tạo dataset độc lập trong MissingBills.tsx.

==================================================
22. DATA DEMO
==================================================

Tạo data đủ để nhìn thấy suggestion thực tế.

Một số CS nên có:

2 TKQC gợi ý

một số:

4–5 TKQC gợi ý

một số:

không có TKQC gợi ý rõ ràng.

Không làm mọi CS giống nhau.

==================================================
23. EMPTY STATE
==================================================

Nếu hệ thống không tìm được TKQC phù hợp:

không ẩn section hoàn toàn.

Hiển thị:

"Chưa xác định được TKQC gợi ý từ dữ liệu hiện tại."

Helper text:

"CS vẫn có thể kiểm tra danh sách TKQC đã sử dụng trong ngày phiên."

==================================================
24. FUTURE REUSE CHO ROLE CS
==================================================

Thiết kế component:

TKQC gợi ý cần kiểm tra

theo hướng reusable.

Sau này khi build giao diện CS:

Bill thiếu / Bổ sung Bill

sẽ reuse component này.

Ở giao diện CS có thể làm section nổi bật hơn.

Nhưng:

KHÔNG build UI CS trong update hiện tại.

Update hiện tại chỉ áp dụng cho:

Admin / Kế toán.

==================================================
25. VISUAL STYLE
==================================================

Giữ đúng design system hiện tại.

Section mới phải nhìn như một phần tự nhiên của:

Chi tiết Bill thiếu.

Không tạo màu cảnh báo quá mạnh.

Có thể dùng:

badge nhẹ
icon gợi ý
table/card hiện tại

nhưng không redesign page.

==================================================
26. RESPONSIVE TABLE
==================================================

Không để table làm vỡ layout.

Ưu tiên width cho:

TKQC
Chênh lệch gợi ý

Các Amount căn phải.

Nếu viewport nhỏ:

cho horizontal scroll.

Không truncate Amount.

==================================================
27. SAU KHI IMPLEMENT
==================================================

Sau khi hoàn thành, báo lại:

1. Bảng Danh sách Bill giải trình đã thêm những field nào.
2. Bảng đang resolve từ bank_transaction_ids hay data riêng.
3. Section TKQC gợi ý nằm ở component/màn nào.
4. Suggestion đang derive từ những shared data nào.
5. Logic demo tính Chênh lệch gợi ý là gì.
6. Có tạo direct mapping Bank Transaction → TKQC hay không.
7. Suggestion có làm thay đổi reconciliation data hay không.
8. Component suggestion có reusable cho UI CS sau này hay không.
9. Các file/component đã thay đổi.

QUAN TRỌNG:

Phải UPDATE trực tiếp implementation React hiện tại.

Không chỉ ghi yêu cầu vào spec/pasted text.
Không tạo application mới.
Không rollback UI hiện tại.