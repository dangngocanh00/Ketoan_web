# UPDATE MODULE "TẢI LÊN DỮ LIỆU" – UPLOAD BILL BANK
# ROLE: ADMIN / KẾ TOÁN

QUAN TRỌNG:

Đây là UPDATE TIẾP vào hệ thống đối soát HIỆN TẠI.

KHÔNG tạo application mới.
KHÔNG tạo UploadV2.
KHÔNG thay sidebar.
KHÔNG thay routing.
KHÔNG rollback UI hiện tại.
KHÔNG tạo module Upload Bill Facebook trong prompt này.
KHÔNG thay đổi các module Dashboard / Phiên đối soát / Bill thiếu / Báo cáo.

Giữ nguyên:
- Design system hiện tại
- Sidebar hiện tại
- Header hiện tại
- Shared mock data hiện tại
- Role Admin / Kế toán hiện tại
- Các business rule reconciliation đã chốt

Tên menu/sidebar hiện tại:

"Tải lên dữ liệu"

GIỮ NGUYÊN tên này.

Trong giao diện Admin/Kế toán hiện tại:

"Tải lên dữ liệu"
=
CHỈ UPLOAD BILL BANK.

Không tạo tab:
Bill Bank | Bill Facebook.

Bill Facebook sẽ được thiết kế riêng khi build UI cho role CS.

Toàn bộ UI bằng TIẾNG VIỆT.

==================================================
1. MỤC TIÊU MÀN HÌNH
==================================================

Module dùng để:

1. Chọn Phiên đối soát.
2. Upload file Bill Bank.
3. Hệ thống tự đọc toàn bộ các sheet/tab trong file.
4. Nhận diện format Bank.
5. Chuẩn hóa dữ liệu.
6. Validate dữ liệu.
7. Loại duplicate hoàn toàn.
8. Phát hiện các lỗi/nghi vấn.
9. Import các transaction hợp lệ.
10. Hiển thị KẾT QUẢ UPLOAD.
11. Lưu lịch sử upload.

QUAN TRỌNG:

Sau upload chỉ hiển thị:

KẾT QUẢ UPLOAD.

KHÔNG hiển thị:

- Kết quả đối soát
- Đã đối soát
- Chưa đối soát
- Bill thiếu sau matching

Các kết quả reconciliation phải được xem tại:

Phiên đối soát
Bill thiếu
các module nghiệp vụ tương ứng.

==================================================
2. FLOW CHÍNH
==================================================

Flow UI:

Chọn Phiên
↓
Chọn / kéo thả file Bank
↓
Đọc file
↓
Đọc toàn bộ tab
↓
Nhận diện format
↓
Chuẩn hóa
↓
Validate
↓
Preview kết quả
↓
Xác nhận Import
↓
Import dữ liệu hợp lệ
↓
Kết quả Upload

Không cho phép Upload trước rồi mới chọn Phiên.

==================================================
3. CHỌN PHIÊN
==================================================

Đầu màn hình hiển thị:

Phiên đối soát

Sử dụng:

DATE PICKER.

Ví dụ:

08/08/2026

Không dùng input text tự nhập ngày.

Người dùng BẮT BUỘC chọn Phiên trước khi chọn/import file.

Nếu chưa chọn Phiên:

disable khu vực Upload hoặc disable button xử lý.

Helper:

"Chọn phiên đối soát trước khi tải dữ liệu Bank."

==================================================
4. RULE NGÀY GIAO DỊCH BANK
==================================================

Đây là business rule bắt buộc.

Nếu chọn:

Phiên 08/08/2026

thì chỉ Bank Transaction có:

Ngày giao dịch = 08/08/2026

mới được phép Import vào phiên.

Ví dụ file có:

1.000 transaction ngày 08/08
20 transaction ngày 07/08

Kết quả:

1.000 transaction:
được phép Import.

20 transaction:
KHÔNG Import.

Lỗi:

"Ngày giao dịch không khớp ngày phiên."

KHÔNG tự động chuyển 20 transaction đó sang Phiên 07/08.

Rule này CHỈ áp dụng cho Bank.

Không áp dụng cho Facebook Bill.

==================================================
5. UPLOAD FILE
==================================================

Tạo dropzone rõ ràng:

"Kéo thả file Bank vào đây"

hoặc:

"Chọn file"

Hiển thị:
- Tên file
- Dung lượng
- Thời gian chọn file
- Action xóa/thay file

Hỗ trợ format file phù hợp với file Bank hiện tại.

Prototype ưu tiên:

XLSX / XLS

Không cần build uploader Facebook tại đây.

==================================================
6. FILE BANK CÓ NHIỀU TAB
==================================================

File Bank thực tế có thể gồm 4 tab.

Khi upload 1 file:

HỆ THỐNG TỰ ĐỌC TOÀN BỘ 4 TAB.

Không bắt Admin/Kế toán:

- chọn từng tab;
- upload từng tab;
- import từng tab.

Flow phải là:

1 file
→ tự đọc tất cả tab
→ xử lý từng tab
→ tổng hợp kết quả.

==================================================
7. 4 TAB NHƯNG CHỈ CÓ 2 FORMAT
==================================================

Theo file Bank thực tế đã phân tích:

4 tab thuộc 2 FORMAT BANK.

Không coi 4 tab là 4 schema khác nhau.

Architecture parser phải theo hướng:

Sheet/tab
↓
Detect schema
↓
Format Bank 1 hoặc Format Bank 2
↓
Normalize về Bank Transaction Schema chung.

Không cần build Dynamic Mapping UI trong phase hiện tại.

==================================================
8. FORMAT BANK
==================================================

Prototype hiện tại chỉ cần support:

FORMAT BANK CŨ

và:

FORMAT BANK MỚI

Không cần tạo:

Custom Mapping Builder

trong module hiện tại.

Phần mapping nâng cao sẽ được planning trong Settings/Spec sau.

==================================================
9. BANK TRANSACTION SCHEMA CHUNG
==================================================

Sau normalize, dữ liệu Bank phải có schema chung đủ phục vụ hệ thống.

Các field chính gồm:

- Transaction ID
- Ngày giao dịch
- Thời gian nếu có
- Merchant / Description
- Reference Number
- Last 4
- Card / Card Name nếu source có
- Card Group nếu source có
- Amount
- Currency
- Status
- Source File
- Source Sheet
- Uploaded At
- Uploaded By

QUAN TRỌNG:

Bank Transaction KHÔNG có TKQC như raw field.

Không tự sinh TKQC vào Bank Transaction.

==================================================
10. PREVIEW SAU KHI ĐỌC FILE
==================================================

Sau khi parse/validate file:

KHÔNG import ngay.

Hiển thị màn:

"Kết quả kiểm tra file"

KPI ví dụ:

Tổng dòng đọc được
1.286

Hợp lệ
1.241

Không hợp lệ
17

Sai ngày phiên
20

Trùng hoàn toàn
8

Trùng Reference khác thông tin
3

Các con số phải derive từ file/mock processing result.

Không hard-code riêng trên UI.

==================================================
11. PREVIEW THEO TAB
==================================================

Vì một file có 4 tab:

hiển thị breakdown theo từng tab.

Ví dụ:

Tab                  Đọc     Hợp lệ     Lỗi     Duplicate
TN1 - Bank cũ        320      315        3          2
TN2 - Bank cũ        310      304        4          2
TN1 - Bank mới       340      330        6          4
TN2 - Bank mới       316      292        4          0

Tên tab sử dụng đúng tên sheet trong file.

Cho phép click:

"Xem chi tiết"

để xem kết quả từng tab.

==================================================
12. VALIDATION – FILE LỖI MỘT PHẦN
==================================================

Một phần file lỗi:

KHÔNG làm fail toàn bộ file.

Ví dụ:

1.000 transaction hợp lệ
20 transaction lỗi

thì:

1.000 transaction vẫn được phép Import.

20 transaction lỗi:

không Import.

Có action:

"Xem danh sách lỗi"

==================================================
13. DANH SÁCH LỖI
==================================================

Mở Drawer/Modal:

DANH SÁCH DỮ LIỆU KHÔNG HỢP LỆ

Table có thể gồm:

- Tab
- Dòng
- Ngày
- Reference
- Last 4
- Amount
- Lỗi

Ví dụ:

TN1_Bank
Row 128
07/08/2026
ABC123
8821
$120
Ngày giao dịch không khớp ngày phiên

Không tạo workflow riêng tên:

"Cần kiểm tra"

cho các lỗi validation thông thường.

Đây chỉ là dữ liệu bị loại khỏi lần Import.

==================================================
14. DUPLICATE HOÀN TOÀN
==================================================

Business rule:

Nếu 2 record:

- cùng Reference
- và toàn bộ thông tin nghiệp vụ liên quan giống nhau

thì coi là:

DUPLICATE HOÀN TOÀN.

Hệ thống:

- giữ 1 record;
- bỏ record trùng;
- KHÔNG coi đây là Ngoại lệ;
- KHÔNG cảnh báo nghiệp vụ.

Trong Kết quả Upload chỉ cần hiển thị:

"8 bản ghi trùng hoàn toàn đã được bỏ qua."

Có thể click xem danh sách nếu cần.

==================================================
15. TRÙNG REFERENCE NHƯNG KHÁC THÔNG TIN
==================================================

Nếu:

Reference giống nhau

NHƯNG

ít nhất một hoặc nhiều thông tin nghiệp vụ khác nhau

thì:

KHÔNG coi là duplicate hoàn toàn.

Ghi nhận:

"Trùng mã tham chiếu"

Ví dụ:

ABC123
Last 4: 8821
Amount: $100

ABC123
Last 4: 8821
Amount: $120

→ TRÙNG REFERENCE KHÁC THÔNG TIN.

==================================================
16. RESULT SUMMARY – TRÙNG REFERENCE
==================================================

Trong Kết quả Upload:

hiển thị card/count:

"Trùng Reference khác thông tin"

Ví dụ:

3 case

Cho phép click:

"Xem chi tiết"

==================================================
17. CHI TIẾT TRÙNG REFERENCE
==================================================

Khi click:

hiển thị FULL thông tin tất cả Bank Transactions liên quan.

Không chỉ hiển thị:

Reference + Amount.

Phải cho Admin/Kế toán so sánh được các record.

Có thể dùng layout:

Reference: ABC123

Record 1
- Transaction ID
- Ngày
- Time
- Description
- Last 4
- Card
- Card Group
- Amount
- Currency
- Status
- Source Tab

Record 2
- cùng toàn bộ field tương ứng.

Highlight những field khác nhau.

Ví dụ:

Amount
$100 → $120

==================================================
18. CROSS-MODULE – TRÙNG REFERENCE
==================================================

Case:

Trùng Reference khác thông tin

được xem ngay trong:

Kết quả Upload

NHƯNG việc quản lý nghiệp vụ lâu dài nằm tại:

Phiên đối soát
→ Ngoại lệ.

Sau Import:

case này phải xuất hiện trong:

Phiên tương ứng
→ Tab Ngoại lệ.

Không tạo một hệ thống quản lý ngoại lệ riêng trong Upload.

==================================================
19. STATUS BANK
==================================================

File Bank có thể chứa nhiều status.

Theo nghiệp vụ hiện tại:

chỉ giao dịch Bank thành công mới tham gia reconciliation.

Các status khác:

vẫn có thể được đọc/lưu phục vụ nguồn dữ liệu/audit

nhưng không đưa vào reconciliation pool.

Normalize status giữa 2 format Bank nếu cách viết khác nhau.

==================================================
20. XÁC NHẬN IMPORT
==================================================

Sau khi Preview:

có button chính:

"Import dữ liệu hợp lệ"

Ví dụ:

"Import 1.241 giao dịch hợp lệ"

Khi click:

mở Confirm Modal.

==================================================
21. CONFIRM MODAL
==================================================

Title:

XÁC NHẬN IMPORT BILL BANK

Hiển thị:

Phiên:
08/08/2026

File:
bank_0808.xlsx

Tab đã đọc:
4

Tổng dòng:
1.286

Sẽ Import:
1.241

Không hợp lệ:
17

Sai ngày phiên:
20

Duplicate hoàn toàn bỏ qua:
8

Trùng Reference khác thông tin:
3

Actions:

Hủy

Xác nhận Import

==================================================
22. UPLOAD LẠI / DATA ĐÃ TỒN TẠI
==================================================

Nếu transaction đã tồn tại trong hệ thống:

KHÔNG tạo duplicate mới.

Detect và skip.

Kết quả Upload phải cho biết:

"[N] giao dịch đã tồn tại được bỏ qua."

Không fail toàn bộ upload.

==================================================
23. SAU KHI IMPORT
==================================================

Sau Import thành công:

hiển thị:

KẾT QUẢ UPLOAD

QUAN TRỌNG:

Đây chỉ là kết quả kỹ thuật/nghiệp vụ của lần Upload.

KHÔNG hiển thị kết quả reconciliation.

==================================================
24. KẾT QUẢ UPLOAD
==================================================

Hiển thị các KPI phù hợp:

- Tổng dòng đã đọc
- Giao dịch đã Import
- Không hợp lệ
- Sai ngày phiên
- Duplicate hoàn toàn đã bỏ qua
- Dữ liệu đã tồn tại được bỏ qua
- Trùng Reference khác thông tin

Ví dụ:

Đã đọc
1.286

Đã Import
1.241

Không hợp lệ
17

Sai ngày phiên
20

Duplicate bỏ qua
8

Đã tồn tại
5

Trùng Reference khác thông tin
3

==================================================
25. TUYỆT ĐỐI KHÔNG HIỂN THỊ SAU UPLOAD
==================================================

KHÔNG hiển thị:

- 1.035 Đã đối soát
- 124 Chưa đối soát
- 8 Lệch Amount
- Bill thiếu
- Progress reconciliation

Không hiển thị bất kỳ Result Summary nào mô tả:

KẾT QUẢ ĐỐI SOÁT.

Upload screen chỉ chịu trách nhiệm:

KẾT QUẢ UPLOAD.

==================================================
26. RECONCILIATION SAU IMPORT
==================================================

Sau khi dữ liệu Bank được Import:

hệ thống có thể tự động trigger reconciliation với dữ liệu Facebook hiện có.

NHƯNG:

kết quả không render tại Upload screen.

Người dùng xem kết quả tại:

Phiên đối soát
Bill thiếu
Dashboard
các module nghiệp vụ liên quan.

==================================================
27. ACTION SAU UPLOAD
==================================================

Sau khi Upload thành công có thể có:

"Xem Phiên đối soát"

→ điều hướng đến đúng Phiên vừa upload.

Không cần hiển thị kết quả matching trong màn Upload.

==================================================
28. LỊCH SỬ UPLOAD
==================================================

Phía dưới màn:

LỊCH SỬ TẢI LÊN

Table:

- Thời gian
- Phiên
- File
- Người upload
- Số tab
- Tổng dòng
- Đã Import
- Lỗi
- Duplicate
- Trạng thái
- Action

Action:

Xem chi tiết

==================================================
29. TRẠNG THÁI LẦN UPLOAD
==================================================

Có thể sử dụng:

- Thành công
- Thành công một phần
- Thất bại

Ví dụ:

Thành công:
toàn bộ dữ liệu cần import được xử lý.

Thành công một phần:
có record hợp lệ đã Import nhưng đồng thời có record lỗi/bị loại.

Thất bại:
không thể parse file hoặc không có dữ liệu hợp lệ để Import.

==================================================
30. CHI TIẾT LỊCH SỬ UPLOAD
==================================================

Click:

Xem chi tiết

mở Drawer/Full Modal.

Hiển thị:

- File
- Người upload
- Thời gian
- Phiên
- Số tab
- Tổng dòng
- Kết quả Import

và:

BREAKDOWN THEO TAB.

Ví dụ:

TN1_Bank cũ
Format: Bank cũ
Đọc: 320
Import: 315
Lỗi: 3
Duplicate: 2

...

==================================================
31. LỊCH SỬ PHẢI LIÊN KẾT SHARED DATA
==================================================

Không tạo lịch sử upload giả độc lập.

Upload record phải liên kết với:

- session_id
- uploaded_by
- source_file
- imported transaction IDs
- source sheets
- timestamp

để các module khác có thể sử dụng.

==================================================
32. DASHBOARD – TRẠNG THÁI UPLOAD BANK
==================================================

Shared data phải cho phép Dashboard biết:

- ai đã upload Bank;
- lần upload gần nhất;
- file nào;
- phiên nào;
- trạng thái lần upload.

Nếu Dashboard hiện tại có card trạng thái nguồn:

click Bill Bank

phải có khả năng hiển thị lịch sử/người upload tương ứng.

Không cần redesign Dashboard trong prompt này.

==================================================
33. KHÔNG CÓ TKQC TRONG RAW BANK
==================================================

Nhắc lại:

Bank Transaction không có raw TKQC.

Không thêm:

TKQC

vào schema Bank chỉ để phục vụ UI.

Nếu module khác suy luận TKQC từ ownership/card data:

đó phải là derived data riêng.

==================================================
34. KHÔNG BUILD DYNAMIC MAPPING UI
==================================================

Phase hiện tại:

KHÔNG build:

- Map Column
- Mapping Builder
- Custom Bank Format
- Add New Format

Parser chỉ cần support 2 format Bank đã biết.

Architecture có thể để mở cho tương lai.

Chi tiết mapping production sẽ được viết kỹ trong Spec.

==================================================
35. SHARED DATA
==================================================

Phải sử dụng shared data hiện tại.

Không tạo một dataset Bank riêng chỉ để màn Upload nhìn đẹp.

Sau Import:

Bank Transactions phải là chính các records được sử dụng bởi:

- Phiên đối soát
- Dashboard
- Bill thiếu
- Báo cáo khi phiên đóng

==================================================
36. DEMO DATA
==================================================

Để prototype có đủ interaction:

tạo/mô phỏng các lần upload gồm:

- Upload hoàn toàn hợp lệ
- Upload có một số row sai ngày
- Upload có duplicate hoàn toàn
- Upload có Reference trùng khác thông tin
- Upload lại file có transaction đã tồn tại
- Upload thành công một phần

Nhưng các data này phải xuyên suốt shared dataset.

==================================================
37. VISUAL STYLE
==================================================

Giữ nguyên style hệ thống hiện tại.

Ưu tiên:

- Upload dropzone rõ
- Date Picker rõ
- KPI validation dễ đọc
- Table preview
- Drawer/modal chi tiết
- Badge trạng thái
- Layout clean
- Data-heavy nhưng không rối

Không redesign Sidebar/Header.

==================================================
38. ERROR STATE
==================================================

Có UI cho các trường hợp:

- File không đọc được
- File không có tab hợp lệ
- Không nhận diện được 2 format hỗ trợ
- Không có transaction đúng ngày phiên
- Toàn bộ transaction đã tồn tại
- Không có dữ liệu hợp lệ để Import

Thông báo phải nói rõ nguyên nhân.

Không chỉ hiển thị:

"Có lỗi xảy ra."

==================================================
39. LOADING / PROCESSING
==================================================

Khi đang đọc file:

hiển thị trạng thái:

"Đang đọc dữ liệu Bank..."

Sau đó:

"Đang kiểm tra dữ liệu..."

Sau khi hoàn thành:

hiển thị Preview.

Không cần giả progress % nếu không có progress thật.

==================================================
40. KHÔNG BUILD UI CS
==================================================

Prompt này chỉ dành cho:

ADMIN / KẾ TOÁN.

Không build:

- Upload Bill Facebook
- Giải trình CS
- Dashboard CS

Các phần đó sẽ được build riêng khi chuyển sang UI role CS.

==================================================
41. SAU KHI IMPLEMENT
==================================================

Sau khi hoàn thành, báo lại:

1. Module "Tải lên dữ liệu" hiện xử lý loại dữ liệu nào.
2. Người dùng có bắt buộc chọn Phiên trước Upload không.
3. Một file 4 tab được xử lý thế nào.
4. Có bao nhiêu format Bank được support.
5. Rule kiểm tra ngày phiên được implement thế nào.
6. File lỗi một phần có Import phần hợp lệ không.
7. Duplicate hoàn toàn được xử lý thế nào.
8. Trùng Reference khác thông tin được xử lý thế nào.
9. Sau Upload đang hiển thị Kết quả Upload hay Kết quả đối soát.
10. Lịch sử Upload có breakdown theo tab không.
11. Bank Transaction có raw TKQC hay không.
12. Có build Dynamic Mapping UI hay không.
13. Các component/file đã tạo hoặc chỉnh sửa.

QUAN TRỌNG CUỐI:

UPDATE trực tiếp component "Tải lên dữ liệu" hiện tại.

Nếu đã có Upload.tsx hoặc component tương đương:
SỬA COMPONENT ĐÓ.

Không tạo UploadV2.
Không tạo application mới.
Không chỉ viết spec/pasted text.
Không làm hỏng các module hiện tại.