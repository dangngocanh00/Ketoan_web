# UPDATE MODULE BILL THIẾU – ADMIN / KẾ TOÁN

QUAN TRỌNG:

Đây là UPDATE tiếp vào Module Bill thiếu HIỆN TẠI.

KHÔNG tạo application mới.
KHÔNG tạo MissingBillsV2.
KHÔNG redesign toàn module.
KHÔNG thay routing.
KHÔNG thay sidebar.
KHÔNG rollback UI hiện tại.
KHÔNG thay đổi các business rule đã chốt ngoài những điểm được mô tả dưới đây.

Giữ nguyên:
- Design system hiện tại
- 3 Tab hiện tại
- Shared mock data hiện tại
- Filter
- Search
- Pagination
- Existing interactions hợp lệ

Chỉ update các điểm dưới đây.

==================================================
1. SỬA BUSINESS RULE TRẠNG THÁI BILL THIẾU
==================================================

Hiện tại logic trạng thái theo Hạn xử lý chưa chính xác.

Tách rõ:

TRẠNG THÁI XỬ LÝ CỦA CS

Khi phiên vẫn đang mở, case chỉ có thể là:

- Chưa xử lý
- Đang xử lý
- Chờ duyệt

QUÁ HẠN không được xác định chỉ dựa vào ngày hiển thị ở Hạn xử lý.

Rule chính xác:

Quá hạn
=
Phiên đã đóng
+
CS vẫn còn Bill chưa được đối soát hoàn tất.

Ví dụ:

Cùng Phiên 08/08,
cùng Hạn xử lý 10/08:

Mạnh:
Đang xử lý

Huyền:
Chưa xử lý

Nam:
Chờ duyệt

đều hoàn toàn hợp lệ khi Phiên vẫn mở.

Chỉ khi Phiên đóng mà một CS vẫn còn tồn đọng thì case đó mới:

Quá hạn.

Filter Trạng thái vẫn giữ:

Tất cả
Chưa xử lý
Đang xử lý
Chờ duyệt
Quá hạn

nhưng Quá hạn chỉ trả về case thuộc Phiên đã đóng còn tồn đọng.

==================================================
2. HÀNH ĐỘNG GẦN NHẤT – BẢNG BILL THIẾU
==================================================

Cột:

Hành động gần nhất

hiện đang truncate bằng "...".

Sửa lại:

KHÔNG truncate mất thông tin.

Ví dụ phải đọc được đầy đủ:

Upload Bill bổ sung · 2 giờ trước

Gửi giải trình · 3 giờ trước

Giải trình bị từ chối · 1 giờ trước

Chưa có hành động

Tăng width cột nếu cần.

Nếu không đủ không gian:

cho phép wrap tối đa 2 dòng.

Không dùng ellipsis để che mất nội dung nghiệp vụ.

==================================================
3. HÀNH ĐỘNG GẦN NHẤT – CHI TIẾT CS + PHIÊN
==================================================

Khi click:

Xem chi tiết

vào màn:

Chi tiết Bill thiếu – [CS] – [Phiên]

phải hiển thị thêm:

Hành động gần nhất.

Ở màn detail hiển thị timestamp đầy đủ.

Ví dụ:

Hành động gần nhất:
Upload Bill bổ sung

10/08/2026 14:32 · 2 giờ trước

Nếu chưa có action:

Chưa có hành động.

==================================================
4. CHI TIẾT BANK TRANSACTION – KHÔNG CÓ TKQC
==================================================

Trong giao diện Chi tiết Bank Transaction:

KHÔNG hiển thị TKQC như một field của Bank Transaction.

Bank source không có thông tin TKQC.

Thông tin Bank chỉ được hiển thị từ dữ liệu Bank thật.

Ví dụ:

- Bank Transaction ID
- Ngày giao dịch
- Thời gian
- Merchant / Description
- Reference
- Last 4
- Card / Card Name nếu có
- Card Group nếu có
- Amount
- Currency
- Status
- Source file
- Uploaded at

Không được đặt:

TKQC

trong section:

Thông tin giao dịch Bank.

Nếu TKQC được hệ thống suy luận từ nguồn dữ liệu khác thì chỉ được hiển thị ở một section riêng:

Thông tin đối chiếu

và phải thể hiện đây là derived/mapped data, không phải raw Bank data.

==================================================
5. DANH SÁCH BILL TRONG CHI TIẾT GIẢI TRÌNH
==================================================

Trong:

Chờ duyệt giải trình
→ Xem giải trình
→ Danh sách Bill giải trình

Các Bill ở đây thực chất là:

BANK TRANSACTIONS đang thiếu Facebook Bill.

Do đó bảng phải hiển thị thông tin Bank Transaction.

Tối thiểu gồm:

- Ngày giao dịch
- Mã tham chiếu
- Last 4
- Amount
- Currency
- Description
- Trạng thái Bank

Không hiển thị TKQC như field Bank.

Có thể click từng row để mở:

Chi tiết Bank Transaction.

==================================================
6. SUMMARY GIẢI TRÌNH
==================================================

Phía trên Danh sách Bill giải trình vẫn hiển thị:

CS
Team
Phiên
Số Bill
Tổng Amount
Lý do
Thời gian gửi
Thời gian chờ

Giữ toàn bộ evidence hiện tại.

==================================================
7. EVIDENCE
==================================================

Trong Chi tiết giải trình:

Admin/Kế toán phải xem được TOÀN BỘ ảnh bằng chứng CS đã gửi.

Một case có thể có nhiều ảnh.

Cho phép:

- xem thumbnail;
- click phóng to;
- xem ảnh full;
- chuyển ảnh trước/sau.

Reason có thể tick nhiều loại:

ACC DIE
Không có quyền SHARE
BACK
Lý do khác

Không bắt map từng ảnh với từng Bill.

==================================================
8. ACCEPT GIẢI TRÌNH – THÊM REVIEW STEP
==================================================

Khi Admin/Kế toán bấm:

Chấp nhận giải trình

KHÔNG xử lý ngay.

Mở Confirm Modal lớn:

XÁC NHẬN CHẤP NHẬN GIẢI TRÌNH

Hiển thị:

CS
Team
Phiên

Summary:

[Số Bill] Bill
[Tổng Amount]

==================================================
9. CONFIRM ACCEPT PHẢI HIỂN THỊ FULL LIST BILL
==================================================

Trong Confirm Modal phải hiển thị:

DANH SÁCH BILL SẼ ĐƯỢC GHI NHẬN ĐÃ ĐỐI SOÁT

Đây là Bank Transactions.

Table:

Ngày giao dịch
Reference
Last 4
Amount
Currency

Nếu cần có thể thêm Description.

Ví dụ:

08/08/2026 | REF001 | 8821 | $152 | USD
08/08/2026 | REF002 | 8821 | $84 | USD
...

Cuối bảng:

TỔNG
15 Bill
$488

KHÔNG chỉ hiển thị:

15 Bill · $488

mà không có danh sách.

Admin/Kế toán phải nhìn rõ chính xác những Bill nào sắp được Accept.

==================================================
10. TABLE TRONG CONFIRM MODAL
==================================================

Nếu có nhiều Bill:

Modal không cần cao vượt màn hình.

Cho table scroll bên trong.

Header table sticky.

Không collapse thành:

+12 Bill khác.

Không che bớt record.

Admin/Kế toán phải có khả năng review toàn bộ Bill trước khi confirm.

==================================================
11. WARNING TRƯỚC KHI ACCEPT
==================================================

Cuối Confirm Modal hiển thị rõ:

Sau khi xác nhận, toàn bộ [N] Bill · [Amount] phía trên sẽ được ghi nhận là:

ĐÃ ĐỐI SOÁT QUA GIẢI TRÌNH.

Không tạo Facebook Bill giả.

Actions:

Hủy

Xác nhận chấp nhận

==================================================
12. SAU KHI ACCEPT
==================================================

Sau Confirm:

Tất cả Bank Transactions thuộc explanation:

→ được coi là Đã đối soát.

reconciliation_method:

explanation_approved

UI:

Duyệt giải trình.

facebook_bill_id:

null

KHÔNG tạo Facebook Bill giả.

==================================================
13. CROSS-MODULE SAU ACCEPT
==================================================

Sau Accept phải cập nhật cùng shared data.

Bill thiếu:

→ giảm Bill còn thiếu.

Nếu CS không còn Bill thiếu:

→ case biến khỏi active Bill thiếu.

Chờ duyệt giải trình:

→ case biến mất.

Phiên đối soát:

→ Amount Đã đối soát tăng.

→ Amount Bank chưa đối soát giảm.

Phiên → Đã đối soát:

record phải xuất hiện với:

Hình thức đối soát:
Duyệt giải trình

Facebook Bill:
—

Không giả sinh Facebook Bill.

Dashboard:

các KPI liên quan phải derive lại từ shared data.

Audit Log:

tạo event Accept giải trình.

==================================================
14. REJECT GIẢI TRÌNH
==================================================

Giữ rule hiện tại:

Khi Reject:

bắt buộc nhập lý do.

Case:

Chờ duyệt
→ Đang xử lý.

Bill vẫn còn thiếu.

Không cộng vào Amount đã đối soát.

Hành động gần nhất cập nhật:

Giải trình bị từ chối

kèm timestamp.

Audit Log ghi nhận:

- người Reject
- thời gian
- lý do.

==================================================
15. CROSS-MODULE SAU REJECT
==================================================

Phiên đối soát:

KHÔNG thay đổi Amount.

Bank Transaction vẫn:

Chưa đối soát.

Bill thiếu:

vẫn còn các Bill tương ứng.

Chờ duyệt:

case biến khỏi Chờ duyệt.

CS có thể gửi lại giải trình nếu Phiên vẫn chưa đóng.

==================================================
16. BILL FACEBOOK THỪA
==================================================

Giữ Tab:

Bill Facebook thừa.

Hiện tại chỉ:

THEO DÕI.

Không thêm:

- Match thủ công
- Gán thủ công
- Xóa
- Xác nhận bỏ qua

Các action nghiệp vụ này chưa nằm trong scope.

==================================================
17. SHARED DATA
==================================================

Toàn bộ update trên phải sử dụng shared mock data hiện tại.

Không tạo data riêng chỉ để demo modal.

Ví dụ Bank Transaction:

BANK-TXN-000821

nếu xuất hiện trong:

Bill thiếu

thì khi vào:

Chi tiết giải trình

và:

Confirm Accept

phải vẫn là chính:

BANK-TXN-000821.

Không duplicate record.

==================================================
18. KIỂM TRA DATA SAU ACTION
==================================================

Test scenario:

Một CS còn:

15 Bill
$488

đang Chờ duyệt.

Trước Accept:

Bill thiếu:
15 · $488

Chờ duyệt:
1 case

Phiên:
Bank chưa đối soát = $488 tương ứng

Sau Accept:

Bill thiếu:
giảm 15 Bill

Chờ duyệt:
giảm 1 case

Phiên:
Bank chưa đối soát giảm $488

Đã đối soát tăng $488

Records xuất hiện trong:

Phiên → Đã đối soát

Hình thức:
Duyệt giải trình.

==================================================
19. KHÔNG REDESIGN
==================================================

Giữ visual style hiện tại.

Chỉ điều chỉnh layout cần thiết cho:

- Hành động gần nhất
- Bank Detail
- Explanation Detail
- Accept Confirm Modal

Không redesign toàn màn.

==================================================
20. SAU KHI IMPLEMENT
==================================================

Sau khi update, báo lại:

1. Logic Quá hạn đã sửa thế nào.
2. Hành động gần nhất đã sửa ở những màn nào.
3. Bank Detail còn field TKQC hay không.
4. Danh sách Bill giải trình hiện lấy từ entity nào.
5. Confirm Accept có hiển thị full Bill list hay không.
6. Accept cập nhật những module nào.
7. Reject cập nhật những module nào.
8. Có tạo Facebook Bill giả hay không.
9. Các component/file đã thay đổi.

QUAN TRỌNG:

Update trực tiếp implementation hiện tại.

Không chỉ lưu yêu cầu vào pasted_text/spec.
Phải thực sự sửa React component đang được application render.