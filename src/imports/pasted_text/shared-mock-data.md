# UPDATE DATA DEMO TOÀN HỆ THỐNG AEZCHECK ACCOUNTING
# SHARED MOCK DATA / CROSS-MODULE DATA

QUAN TRỌNG:

Đây là yêu cầu UPDATE DỮ LIỆU DEMO trên application AezCheck Accounting HIỆN TẠI.

KHÔNG tạo application mới.
KHÔNG redesign UI.
KHÔNG thay sidebar.
KHÔNG thay routing.
KHÔNG thay business rule hiện tại.
KHÔNG build lại các module đã có.
KHÔNG thay đổi layout/component nếu không cần thiết.

Mục tiêu của update này:

Tạo một bộ DATA DEMO ĐỦ LỚN, CÓ QUAN HỆ, DÙNG CHUNG XUYÊN SUỐT TOÀN HỆ THỐNG.

Hiện tại không được để mỗi module tự sử dụng một bộ mock data độc lập dẫn đến số liệu giữa:

Dashboard
Phiên đối soát
Bill thiếu
Chờ duyệt giải trình
Bill Facebook thừa
Upload
Audit Log
Báo cáo

không khớp nhau.

==================================================
1. NGUYÊN TẮC QUAN TRỌNG NHẤT
==================================================

Tạo:

SHARED MOCK DATA / SINGLE SOURCE OF TRUTH

Các module phải derive dữ liệu từ cùng một bộ dữ liệu nguồn.

KHÔNG tạo:

sessionsMock riêng
missingBillsMock riêng
dashboardMock riêng

với các record không có quan hệ với nhau.

Ví dụ:

Một Bank Transaction có ID:

BANK-TXN-000821

Nếu transaction này đang thiếu Facebook Bill thì cùng record đó phải được phản ánh tại:

Phiên đối soát
→ Bank chưa đối soát

và:

Bill thiếu
→ đúng CS
→ đúng Phiên

Không tạo hai transaction khác nhau chỉ để phục vụ hai màn hình.

==================================================
2. QUY MÔ DATA
==================================================

Tạo data demo đủ lớn để mô phỏng hệ thống production.

Mục tiêu khoảng:

1.000 – 2.000 records cho mỗi nhóm dữ liệu nghiệp vụ chính.

Không bắt buộc mọi bảng đều chính xác 2.000 records.

Ưu tiên:
- đủ lớn để test filter;
- đủ lớn để test search;
- đủ lớn để test pagination;
- đủ lớn để Dashboard/Báo cáo có dữ liệu;
- nhưng vẫn giữ logic và performance tốt.

Có thể sử dụng deterministic mock data generator để tránh hard-code hàng nghìn object thủ công.

==================================================
3. CƠ CẤU TEAM
==================================================

Chỉ tạo:

3 TEAM.

Không tạo quá nhiều Team.

Mỗi Team có:

1 Leader
4–5 CS

Tổng khoảng:

13–15 CS.

Ví dụ có thể dùng:

TEAM ALPHA
TEAM BETA
TEAM GAMMA

Nhưng tên hiển thị cho user phải bằng tiếng Việt hoặc tên Team nội bộ tự nhiên.

Tạo tên người Việt Nam thực tế cho data demo.

Ví dụ:

Team Alpha
Leader: Dũng

CS:
- Mạnh
- Huyền
- Nam
- Trang
- Linh

Team Beta
Leader: Hùng

CS:
- Mai
- Đức
- Phương
- Tuấn

Team Gamma
Leader: Quân

CS:
- Thảo
- Long
- Hà
- Minh
- Ngọc

Có thể điều chỉnh tên nhưng giữ:

3 Team
4–5 CS / Team.

==================================================
4. USER ID LÀ IDENTIFIER CHÍNH
==================================================

Mỗi user phải có:

user_id

Ví dụ:

USR-001
USR-002
USR-003

Không sử dụng tên CS làm primary key.

Tên chỉ dùng để hiển thị.

User demo nên có:

- user_id
- full_name
- role
- team_id
- telegram_id
- status

Role tối thiểu:

- Admin
- Kế toán
- Leader
- CS

User/Team/Role được coi là dữ liệu đồng bộ từ hệ thống AezCheck gốc.

Accounting không tạo một hệ User độc lập.

==================================================
5. TEAM MASTER
==================================================

Tạo shared master:

teams

Ví dụ:

TEAM-001
TEAM-002
TEAM-003

Có:

- team_id
- team_name
- leader_user_id
- member_user_ids

Mọi module sử dụng cùng team_id.

==================================================
6. PHIÊN ĐỐI SOÁT
==================================================

Tạo nhiều phiên theo ngày.

Data nên bao phủ ít nhất khoảng:

30 ngày gần nhất

để sau này test:

Dashboard
Báo cáo ngày
Báo cáo tuần
Báo cáo tháng.

Mỗi ngày:

1 phiên đối soát.

Mỗi phiên có:

session_id
session_date
status
opened_at
closed_at
deadline_at

Status có:

- Đang đối soát
- Sắp đóng
- Đã đóng
- Đã đóng còn tồn đọng

Business rule:

Sắp đóng khi còn dưới 6 giờ.

Phiên đóng nhưng còn transaction chưa xử lý:

Đã đóng còn tồn đọng.

==================================================
7. BANK TRANSACTIONS
==================================================

Tạo khoảng:

1.500 – 2.000 Bank Transactions.

Mỗi Bank Transaction có stable ID:

bank_transaction_id

Ví dụ:

BANK-TXN-000001
BANK-TXN-000002
...

Các field tối thiểu:

- bank_transaction_id
- session_id
- transaction_date
- bank_name
- description_raw
- reference_raw
- reference_normalized
- card_last4
- amount
- currency
- bank_status
- source_file
- uploaded_at
- uploaded_by

Không gắn TKQC trực tiếp vào dữ liệu Bank gốc.

Bank Transaction KHÔNG có field TKQC như một field nguồn.

Nếu hệ thống suy luận được TKQC thì phải nằm trong:

matching / derived data

không phải raw Bank Transaction.

==================================================
8. FACEBOOK BILLS
==================================================

Tạo khoảng:

1.300 – 1.800 Facebook Bills.

Mỗi Bill có:

facebook_bill_id

Ví dụ:

FB-BILL-000001

Các field:

- facebook_bill_id
- facebook_date
- account_id / TKQC
- reference
- card_last4
- amount
- currency
- uploaded_by_user_id
- uploaded_at
- source_file
- upload_source

Upload source ví dụ:

- Upload Bill Facebook
- Bổ sung Bill thiếu

==================================================
9. TKQC MASTER DATA
==================================================

Tạo đủ TKQC để phân bổ cho 13–15 CS.

Mỗi TKQC có:

- account_id
- account_name
- status nếu cần
- ownership history

Quan trọng:

Ownership phải có thời gian.

Không chỉ lưu:

TKQC → CS hiện tại.

Phải có khả năng biểu diễn:

TKQC A
01/08–05/08 → Mạnh
06/08 trở đi → Huyền

để transaction ngày 03/08 vẫn thuộc trách nhiệm Mạnh.

==================================================
10. CARD MASTER / OWNERSHIP
==================================================

Tạo dữ liệu thẻ có:

- card_id
- last4
- ownership history
- CS sử dụng
- khoảng thời gian sử dụng

Ownership thẻ cũng phải theo thời gian.

Ví dụ:

CARD-001 / Last4 8821

01/08–07/08 → Mạnh
08/08 trở đi → Nam

Không lấy current owner để xác định trách nhiệm cho transaction lịch sử.

==================================================
11. SHEET CUSTOMER DATA
==================================================

Tạo mock data đại diện cho dữ liệu Sheet khách hàng.

Có quan hệ:

- ngày
- CS
- Team
- TKQC
- chi tiêu ghi nhận

Dùng dữ liệu này để tính:

Tổng chi tiêu Sheet

trong Phiên/Dashboard/Báo cáo.

==================================================
12. MATCHING RECORD
==================================================

Tạo shared matching data giữa:

Bank Transaction
↔
Facebook Bill

Mỗi match có stable ID.

Ví dụ:

MATCH-000001

Có:

- match_id
- bank_transaction_id
- facebook_bill_id nếu có
- match_status
- reconciliation_method
- matched_at

reconciliation_method có:

- bill_match
- explanation_approved

UI hiển thị tiếng Việt:

- Khớp Bill
- Duyệt giải trình

==================================================
13. MATCH THÀNH CÔNG
==================================================

Phần lớn dữ liệu nên là match thành công.

Ví dụ:

Bank:

BANK-TXN-000821
Reference ABC123
Last4 8821
$152

Facebook:

FB-BILL-000721
Reference ABC123
Last4 8821
$152

→ MATCH.

Cùng dữ liệu này phải xuất hiện trong:

Phiên
→ Đã đối soát.

==================================================
14. BANK CHƯA ĐỐI SOÁT / BILL THIẾU
==================================================

Tạo đủ Bank Transaction chưa có Facebook Bill.

Các transaction này phải đồng thời xuất hiện tại:

Phiên
→ Bank chưa đối soát

và:

Bill thiếu
→ đúng CS + đúng Phiên.

Không tạo duplicate data.

==================================================
15. BILL THIẾU GOM THEO CS + PHIÊN
==================================================

Màn Bill thiếu có thể derive:

1 row = user_id + session_id.

Ví dụ:

USR-003 + SESSION-20260808

→ Mạnh
→ Phiên 08/08
→ 35 Bill thiếu
→ $1,208

35 Bill này phải là 35 Bank Transaction thật trong shared data.

Không hard-code:

missing_count = 35

nếu không có đúng 35 transaction tương ứng.

==================================================
16. CS BỔ SUNG BILL
==================================================

Tạo data scenario:

Một số CS đã bổ sung Facebook Bill.

Ví dụ:

Mạnh ban đầu:

35 Bank Transaction thiếu
$1,208

Sau đó:

20 Facebook Bill bổ sung match thành công
$720

Data derive phải ra:

Thiếu ban đầu:
35 bill · $1,208

Đã bổ sung:
20 bill · $720

Còn thiếu:
15 bill · $488

Không hard-code ba con số độc lập.

==================================================
17. GIẢI TRÌNH
==================================================

Tạo khoảng:

50–150 explanation cases

phân bổ trong nhiều phiên.

Mỗi case có:

- explanation_id
- session_id
- user_id
- team_id
- bank_transaction_ids
- total_bill_count
- total_amount
- reasons
- evidence
- submitted_at
- status
- reviewed_by
- reviewed_at
- reject_reason nếu có

Status:

- Chờ duyệt
- Đã chấp nhận
- Bị từ chối

==================================================
18. RULE GIẢI TRÌNH
==================================================

Một:

CS + Phiên

chỉ được có tối đa:

1 giải trình đang Chờ duyệt

tại cùng một thời điểm.

Giải trình áp dụng cho:

TOÀN BỘ Bank Bill còn thiếu tại thời điểm CS gửi.

Không tạo nhiều giải trình nhỏ cho từng Bill.

==================================================
19. EVIDENCE DEMO
==================================================

Một số giải trình phải có nhiều ảnh bằng chứng.

Reason có thể gồm nhiều loại:

- ACC DIE
- Không có quyền SHARE
- BACK
- Lý do khác

Một case có thể có:

ACC DIE + BACK

và:

3–5 ảnh bằng chứng.

Data phải đủ để test gallery/lightbox.

==================================================
20. GIẢI TRÌNH ĐƯỢC DUYỆT
==================================================

Nếu explanation được Admin/Kế toán chấp nhận:

Các Bank Transaction trong explanation:

→ được coi là Đã đối soát.

reconciliation_method:

explanation_approved

UI:

Duyệt giải trình.

Nhưng:

facebook_bill_id = null

KHÔNG tạo Facebook Bill giả.

==================================================
21. GIẢI TRÌNH BỊ TỪ CHỐI
==================================================

Tạo một số case đã bị từ chối.

Sau reject:

Bill vẫn chưa đối soát.

CS case quay lại:

Đang xử lý

Audit data có:

- người từ chối
- thời gian
- lý do từ chối

==================================================
22. FACEBOOK BILL THỪA
==================================================

Tạo khoảng:

50–150 Facebook Bill

không tìm được Bank Transaction tương ứng.

Đây là:

Bill Facebook thừa.

Cùng record này phải được sử dụng xuyên module.

Không tạo Bill FB thừa riêng cho mỗi màn.

Current scope:

chỉ theo dõi.

Không manual match.

==================================================
23. EXCEPTION MATCHING
==================================================

Tạo đủ data để test:

### Lệch Amount

Reference:
khớp

Last4:
khớp

Amount:
khác

### Duplicate Reference

Cùng reference xuất hiện nhiều lần nhưng thông tin khác nhau.

Nếu duplicate hoàn toàn:

không cần cảnh báo.

Không tạo scenario:

- bùng
- hold

trong current scope.

BACK chỉ có thể xuất hiện trong lý do giải trình hiện tại.

==================================================
24. AUDIT LOG
==================================================

Tạo ít nhất:

2.000 Audit Log events.

Audit Log phải liên kết tới record thật.

Mỗi log có:

- audit_id
- event_type
- actor_user_id
- target_type
- target_id
- session_id nếu liên quan
- timestamp
- metadata

Ví dụ:

AUDIT-001921

event:
Phát hiện Bill thiếu

target:
BANK-TXN-000821

Sau đó:

AUDIT-001922

event:
Gửi Telegram cho CS

target:
BANK-TXN-000821

Sau đó:

AUDIT-001923

event:
CS upload Bill bổ sung

target:
FB-BILL-000721

Sau đó:

AUDIT-001924

event:
Đối soát thành công

target:
MATCH-000421

==================================================
25. CROSS-MODULE DATA — BẮT BUỘC
==================================================

Mọi module phải dùng cùng record.

Ví dụ:

BANK-TXN-000821

nếu chưa match:

PHIÊN ĐỐI SOÁT
→ Bank chưa đối soát

BILL THIẾU
→ Mạnh
→ transaction tương ứng

AUDIT LOG
→ Phát hiện Bill thiếu

Nếu sau đó match:

BANK-TXN-000821

phải:

- biến khỏi Bank chưa đối soát;
- biến khỏi Bill thiếu;
- xuất hiện trong Đã đối soát;
- tạo Audit Log matching thành công.

Không duplicate transaction.

==================================================
26. RECONCILIATION CỦA SỐ LIỆU
==================================================

Các Amount phải cộng được.

Ví dụ:

Phiên 08/08:

Tổng Bill Bank:
$41,220

Đã đối soát bằng Bill:
$37,950

Đã đối soát qua giải trình:
$2,100

Bank chưa đối soát:
$1,170

Phải đảm bảo:

$37,950
+
$2,100
+
$1,170
=
$41,220

Tổng đã đối soát:

$40,050

Không hard-code KPI không reconcile được với transaction data.

==================================================
27. FACEBOOK RECONCILIATION
==================================================

Tương tự:

Tổng Facebook Bill

phải derive từ Facebook Bill data.

Phân biệt:

- Facebook Bill đã match Bank
- Facebook Bill chưa match / thừa

Không dùng Amount giả.

==================================================
28. DASHBOARD
==================================================

Dashboard phải derive từ shared data.

Ví dụ filter:

Ngày phiên 08/08

thì:

Tổng Bill Bank
Tổng Bill Facebook
Tổng đã đối soát
Chưa đối soát
Progress

phải khớp với Phiên 08/08.

Không sử dụng KPI hard-code độc lập.

==================================================
29. PROGRESS PHIÊN
==================================================

Progress toàn hệ thống của Phiên:

Tổng Amount đã đối soát
/
Tổng Amount Bill Bank
× 100%

Tính theo AMOUNT.

Không tính theo số lượng Bill.

==================================================
30. BILL THIẾU PROGRESS
==================================================

Riêng progress xử lý của CS trong Bill thiếu:

Số Bill bổ sung thành công
/
Số Bill thiếu ban đầu

Có thể tính theo số lượng Bill theo business rule đã chốt.

Không nhầm với progress tài chính của Phiên.

==================================================
31. REPORT DATA
==================================================

Chuẩn bị shared data đủ để sau này:

Báo cáo ngày
Báo cáo tuần
Báo cáo tháng

derive trực tiếp.

Không cần redesign module Báo cáo trong update này.

Nhưng data 30 ngày phải đủ để aggregate.

==================================================
32. PAGINATION
==================================================

Không render 2.000 rows cùng lúc.

Các bảng lớn sử dụng pagination.

Ví dụ:

50 bản ghi / trang.

Cho phép nếu UI hiện tại hỗ trợ:

25
50
100

records/page.

Giữ performance tốt.

==================================================
33. FILTER PHẢI FILTER DATA THẬT
==================================================

Filter không được chỉ thay text UI.

Ví dụ:

Ngày phiên = 08/08
Team = Team Alpha
CS = Mạnh

thì:

KPI
Tab count
Table
Summary
Export

đều phải derive từ đúng subset đó.

==================================================
34. SEARCH
==================================================

Search:

Reference
Last4
TKQC

phải tìm trên shared data.

Không tạo một search dataset riêng.

==================================================
35. STABLE IDs
==================================================

Tất cả entity phải có stable ID.

Ví dụ:

TEAM-001
USR-001
SESSION-20260808
BANK-TXN-000001
FB-BILL-000001
MATCH-000001
EXPLANATION-000001
AUDIT-000001

Không dựa vào array index làm identity nghiệp vụ.

==================================================
36. DATA DETERMINISTIC
==================================================

Nếu dùng generator:

Data phải deterministic.

Refresh page không được tự random lại toàn bộ số liệu.

Ví dụ có thể dùng seeded generator.

Mục tiêu:

SESSION-20260808 luôn có cùng dữ liệu khi reload.

BANK-TXN-000821 không được đổi CS/Amount ngẫu nhiên sau mỗi refresh.

==================================================
37. SCENARIO END-TO-END CỐ ĐỊNH
==================================================

Tạo một số scenario cố định để demo.

Đặc biệt tạo:

SCENARIO DEMO 01

Phiên:
08/08/2026

CS:
Mạnh

Team:
Team Alpha

Ban đầu:

35 Bill thiếu
$1,208

Đã bổ sung:

20 Bill
$720

Còn:

15 Bill
$488

Trạng thái hiện tại:

Đang xử lý

Các record phải thực sự tồn tại trong shared data.

==================================================
38. SCENARIO DEMO 02 — CHỜ DUYỆT
==================================================

CS:
Nam

Tạo case:

12 Bill
$420

CS không tìm được Bill.

Đã gửi giải trình.

Reasons:

ACC DIE
BACK

Evidence:

ít nhất 3 ảnh demo.

Status:

Chờ duyệt.

Case phải xuất hiện đồng thời:

Bill thiếu
→ Nam
→ Chờ duyệt

và:

Chờ duyệt giải trình.

==================================================
39. SCENARIO DEMO 03 — REJECTED
==================================================

CS:
Trang

Tạo một explanation đã bị từ chối.

Sau reject:

Case hiện:

Đang xử lý.

Hành động gần nhất:

Giải trình bị từ chối

Có timestamp.

Audit Log phải có event tương ứng.

==================================================
40. SCENARIO DEMO 04 — QUÁ HẠN
==================================================

Tạo một case:

Phiên đã ĐÓNG.

CS vẫn còn Bank Transaction chưa đối soát.

Lúc đó mới:

Trạng thái = Quá hạn.

QUAN TRỌNG:

Không tạo case Quá hạn chỉ vì Hạn xử lý hiển thị một ngày nào đó.

Rule:

QUÁ HẠN
=
PHIÊN ĐÃ ĐÓNG
+
CASE VẪN CHƯA ĐỐI SOÁT HOÀN TẤT.

==================================================
41. SCENARIO DEMO 05 — FACEBOOK BILL THỪA
==================================================

Tạo nhiều Facebook Bill:

đã upload

nhưng:

không tìm thấy Bank Transaction tương ứng.

Các record phải xuất hiện tại:

Bill Facebook thừa.

Có:

CS
Team
TKQC
Reference
Last4
Amount
Upload time.

==================================================
42. SCENARIO DEMO 06 — ACCEPT EXPLANATION
==================================================

Chuẩn bị một case có thể demo action:

Admin/Kế toán Accept giải trình.

Trước Accept:

Bank chưa đối soát:
$X

Bill thiếu:
N bill

Chờ duyệt:
1 case

Sau Accept:

Các Bank Transaction:

→ Đã đối soát qua giải trình.

Bill thiếu:

→ giảm N bill.

Bank chưa đối soát:

→ giảm Amount tương ứng.

Tổng đã đối soát:

→ tăng Amount tương ứng.

Chờ duyệt:

→ giảm 1 case.

Audit Log:

→ thêm event duyệt.

Không tạo Facebook Bill giả.

==================================================
43. DATA CHO 3 TEAM PHẢI CÂN ĐỐI
==================================================

Không dồn 80% data vào một Team.

Phân bổ transaction tương đối cân bằng cho:

Team 1
Team 2
Team 3

Nhưng vẫn cho phép có Team chi tiêu cao hơn để Dashboard nhìn tự nhiên.

CS cũng phải có lượng transaction khác nhau.

Không làm mọi CS có số liệu giống hệt nhau.

==================================================
44. DATA PHẢI NHÌN TỰ NHIÊN
==================================================

Không tạo kiểu:

mọi Bill đều $100
mọi CS đều 50 Bill
mọi ngày đều cùng tổng tiền.

Amount cần đa dạng.

Reference đa dạng.

Last4 đa dạng.

Ngày Bank và Facebook có thể lệch nhau hợp lý.

Data phải giống dữ liệu vận hành thực tế.

==================================================
45. KHÔNG THAY UI TRONG UPDATE NÀY
==================================================

Update này tập trung vào:

DATA ARCHITECTURE
SHARED MOCK DATA
CROSS-MODULE CONSISTENCY

KHÔNG dùng update này để redesign:

- Bill thiếu
- Phiên đối soát
- Dashboard
- Audit Log
- Upload
- Sidebar

Nếu cần thay đổi component tối thiểu để chuyển từ hard-coded data sang shared data thì được phép.

Nhưng phải giữ nguyên visual UI hiện tại.

==================================================
46. KHÔNG XÓA BUSINESS RULE ĐÃ CÓ
==================================================

Giữ nguyên:

- Matching rule.
- Session status.
- Bill thiếu workflow.
- Explanation workflow.
- Accept/Reject.
- Facebook Bill thừa.
- Filter.
- Search.
- Existing interactions.

Chỉ thay nguồn dữ liệu demo thành shared data có quan hệ.

==================================================
47. KIỂM TRA SAU KHI IMPLEMENT
==================================================

Sau khi hoàn thành:

Kiểm tra ít nhất:

1. Dashboard 08/08.
2. Phiên 08/08.
3. Bill thiếu 08/08.
4. Mạnh 08/08.
5. Nam 08/08.
6. Chờ duyệt giải trình.
7. Bill Facebook thừa.
8. Audit Log.

Các số liệu phải reconcile.

==================================================
48. REPORT SAU KHI BUILD
==================================================

Sau khi implement, hãy báo:

1. Shared data nằm ở file/module nào.
2. Có bao nhiêu Team.
3. Có bao nhiêu CS.
4. Có bao nhiêu Phiên.
5. Có bao nhiêu Bank Transactions.
6. Có bao nhiêu Facebook Bills.
7. Có bao nhiêu Match records.
8. Có bao nhiêu Bill thiếu.
9. Có bao nhiêu Explanation cases.
10. Có bao nhiêu Facebook Bill thừa.
11. Có bao nhiêu Audit Log events.
12. Những module nào đã chuyển sang dùng shared data.
13. Module nào vẫn còn hard-coded data nếu có.

QUAN TRỌNG:

Không chỉ tạo file mô tả/spec.

Phải thực sự tạo shared mock data và cập nhật implementation React hiện tại để các module sử dụng dữ liệu đó.

Không tạo application mới.
Không tạo UI mới.
Không rollback UI hiện tại.