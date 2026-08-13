export type SessionStatus = 'active' | 'processing' | 'closed'
export type ExceptionType = 'missing_bill' | 'amount_mismatch' | 'duplicate_ref' | 'fb_without_bank'
export type ExceptionStatus = 'open' | 'explained' | 'pending_review' | 'resolved'
export type BillStatus = 'pending' | 'uploaded' | 'explained' | 'overdue'

export interface Session {
  id: string
  date: string
  status: SessionStatus
  bankBills: number
  reconciledBills: number
  bankTotal: number
  fbTotal: number
  reconciledAmount: number
  exceptions: number
  processingDeadline: string
}

export interface DashboardSession extends Session {
  dayOfProcessing: number
  totalProcessingDays: number
  hoursRemaining: number
  csIncomplete: number
}

export interface Exception {
  id: string
  sessionDate: string
  type: ExceptionType
  referenceCode: string
  cardLast4: string
  tkqc: string
  cs: string
  team: string
  bankAmount: number
  fbAmount: number | null
  status: ExceptionStatus
  t0: string
  lastAction: string | null
  explanation?: string
}

export interface MissingBill {
  id: string
  sessionDate: string
  referenceCode: string
  cardLast4: string
  tkqc: string
  cs: string
  team: string
  amount: number
  t0: string
  status: BillStatus
  reminderSent: boolean
  reminderTime?: string
}

export interface AuditEntry {
  id: string
  timestamp: string
  action: string
  actor: string
  target: string
  detail: string
  category: 'upload' | 'reconciliation' | 'assignment' | 'cs_action' | 'admin_action' | 'session' | 'notification'
}

export interface CsAttentionItem {
  cs: string
  team: string
  missingBills: number
  missingAmount: number
  status: 'chua_xu_ly' | 'dang_xu_ly' | 'da_nhac'
  lastActionAgo: string
  session: string
}

// ─── Teams & CS ──────────────────────────────────────────────────────────────

export const teams = ['Team Dũng', 'Team Growth', 'Team Scale']

export const csMembers = ['Mạnh', 'Huyền', 'Nam', 'Trang', 'Long', 'Diệp', 'Mai', 'Dũng']

export const csTeamMap: Record<string, string> = {
  'Mạnh': 'Team Dũng',
  'Huyền': 'Team Dũng',
  'Dũng': 'Team Dũng',
  'Nam': 'Team Growth',
  'Trang': 'Team Growth',
  'Long': 'Team Growth',
  'Diệp': 'Team Scale',
  'Mai': 'Team Scale',
}

// Scaling factors for team/CS filter in prototype
export const teamFactors: Record<string, number> = {
  'Team Dũng': 0.38,
  'Team Growth': 0.42,
  'Team Scale': 0.20,
}
export const csFactors: Record<string, number> = {
  'Mạnh': 0.18, 'Huyền': 0.15, 'Dũng': 0.05,
  'Nam': 0.14, 'Trang': 0.12, 'Long': 0.10,
  'Diệp': 0.08, 'Mai': 0.12,
}

// ─── Sessions (for Phiên đối soát page) ──────────────────────────────────────

export const sessions: Session[] = [
  {
    id: 's1', date: '2026-08-08', status: 'closed',
    bankBills: 5284, reconciledBills: 5201,
    bankTotal: 52480, fbTotal: 50130, reconciledAmount: 48920,
    exceptions: 83, processingDeadline: '2026-08-10',
  },
  {
    id: 's2', date: '2026-08-09', status: 'closed',
    bankBills: 4917, reconciledBills: 4832,
    bankTotal: 41220, fbTotal: 39100, reconciledAmount: 37800,
    exceptions: 85, processingDeadline: '2026-08-11',
  },
  {
    id: 's3', date: '2026-08-10', status: 'active',
    bankBills: 5102, reconciledBills: 4901,
    bankTotal: 47600, fbTotal: 44200, reconciledAmount: 42100,
    exceptions: 201, processingDeadline: '2026-08-12',
  },
  {
    id: 's4', date: '2026-08-11', status: 'active',
    bankBills: 4856, reconciledBills: 4412,
    bankTotal: 39800, fbTotal: 37600, reconciledAmount: 34900,
    exceptions: 444, processingDeadline: '2026-08-13',
  },
  {
    id: 's5', date: '2026-08-12', status: 'processing',
    bankBills: 2341, reconciledBills: 1876,
    bankTotal: 22100, fbTotal: 20800, reconciledAmount: 18600,
    exceptions: 465, processingDeadline: '2026-08-14',
  },
]

// ─── Dashboard Sessions (rich data for Dashboard display) ─────────────────────

export const dashboardSessions: DashboardSession[] = [
  {
    id: 'ds1', date: '2026-08-08', status: 'active',
    bankBills: 5284, reconciledBills: 4901,
    bankTotal: 52480, fbTotal: 50130, reconciledAmount: 48920,
    exceptions: 383, processingDeadline: '2026-08-10',
    dayOfProcessing: 2, totalProcessingDays: 2,
    hoursRemaining: 11, csIncomplete: 8,
  },
  {
    id: 'ds2', date: '2026-08-09', status: 'active',
    bankBills: 5106, reconciledBills: 4742,
    bankTotal: 41220, fbTotal: 39100, reconciledAmount: 37800,
    exceptions: 364, processingDeadline: '2026-08-11',
    dayOfProcessing: 1, totalProcessingDays: 2,
    hoursRemaining: 35, csIncomplete: 11,
  },
  {
    id: 'ds3', date: '2026-08-10', status: 'processing',
    bankBills: 4890, reconciledBills: 4521,
    bankTotal: 47600, fbTotal: 44200, reconciledAmount: 42100,
    exceptions: 369, processingDeadline: '2026-08-12',
    dayOfProcessing: 1, totalProcessingDays: 2,
    hoursRemaining: 22, csIncomplete: 7,
  },
]

// ─── CS Cần Chú Ý ─────────────────────────────────────────────────────────────

export const csAttentionData: CsAttentionItem[] = [
  { cs: 'Mạnh', team: 'Team Dũng', missingBills: 35, missingAmount: 1208, status: 'chua_xu_ly', lastActionAgo: '22 giờ trước', session: '08/08/2026' },
  { cs: 'Huyền', team: 'Team Dũng', missingBills: 18, missingAmount: 829, status: 'dang_xu_ly', lastActionAgo: '2 giờ trước', session: '08/08/2026' },
  { cs: 'Nam', team: 'Team Growth', missingBills: 11, missingAmount: 302, status: 'da_nhac', lastActionAgo: '26 giờ trước', session: '08/08/2026' },
  { cs: 'Trang', team: 'Team Growth', missingBills: 8, missingAmount: 215, status: 'chua_xu_ly', lastActionAgo: '14 giờ trước', session: '09/08/2026' },
  { cs: 'Long', team: 'Team Growth', missingBills: 5, missingAmount: 180, status: 'dang_xu_ly', lastActionAgo: '1 giờ trước', session: '09/08/2026' },
  { cs: 'Diệp', team: 'Team Scale', missingBills: 9, missingAmount: 244, status: 'chua_xu_ly', lastActionAgo: '18 giờ trước', session: '09/08/2026' },
  { cs: 'Mai', team: 'Team Scale', missingBills: 6, missingAmount: 162, status: 'da_nhac', lastActionAgo: '30 giờ trước', session: '08/08/2026' },
]

// ─── Chart data (7 ngày) ──────────────────────────────────────────────────────

export const chartData = [
  { date: '04/08', bank: 38200, facebook: 35400, reconciled: 33800 },
  { date: '05/08', bank: 42100, facebook: 39800, reconciled: 37200 },
  { date: '06/08', bank: 39500, facebook: 37100, reconciled: 35600 },
  { date: '07/08', bank: 44800, facebook: 41900, reconciled: 40200 },
  { date: '08/08', bank: 52480, facebook: 50130, reconciled: 48920 },
  { date: '09/08', bank: 41220, facebook: 39100, reconciled: 37800 },
  { date: '10/08', bank: 47600, facebook: 44200, reconciled: 42100 },
]

// ─── Exceptions ───────────────────────────────────────────────────────────────

export const exceptions: Exception[] = [
  {
    id: 'e1', sessionDate: '2026-08-10', type: 'missing_bill',
    referenceCode: 'FB-2026-081023451', cardLast4: '4521', tkqc: 'TKQC-A',
    cs: 'Mạnh', team: 'Team Dũng', bankAmount: 1200, fbAmount: null,
    status: 'open', t0: '2026-08-11 09:14', lastAction: null,
  },
  {
    id: 'e2', sessionDate: '2026-08-10', type: 'amount_mismatch',
    referenceCode: 'FB-2026-081018823', cardLast4: '7734', tkqc: 'TKQC-B',
    cs: 'Huyền', team: 'Team Dũng', bankAmount: 850, fbAmount: 800,
    status: 'pending_review', t0: '2026-08-11 09:14', lastAction: '2026-08-11 14:22',
    explanation: 'Bill đã upload — thẻ được nạp lại, amount phản ánh giá trị thực sau khi hoàn tiền.',
  },
  {
    id: 'e3', sessionDate: '2026-08-10', type: 'missing_bill',
    referenceCode: 'FB-2026-081031105', cardLast4: '2291', tkqc: 'TKQC-B',
    cs: 'Trang', team: 'Team Growth', bankAmount: 2400, fbAmount: null,
    status: 'explained', t0: '2026-08-11 09:14', lastAction: '2026-08-11 16:48',
    explanation: 'Không tìm thấy Bill. Campaign khách hàng đã dừng — khoản phí đã được hoàn trên Facebook. Link bằng chứng: drive.google.com/file/d/1aBc.',
  },
  {
    id: 'e4', sessionDate: '2026-08-10', type: 'duplicate_ref',
    referenceCode: 'FB-2026-081009982', cardLast4: '6615', tkqc: 'TKQC-C',
    cs: 'Long', team: 'Team Growth', bankAmount: 650, fbAmount: 650,
    status: 'open', t0: '2026-08-11 09:14', lastAction: null,
  },
  {
    id: 'e5', sessionDate: '2026-08-10', type: 'fb_without_bank',
    referenceCode: 'FB-2026-081044201', cardLast4: '8847', tkqc: 'TKQC-D',
    cs: 'Mai', team: 'Team Scale', bankAmount: 0, fbAmount: 1800,
    status: 'open', t0: '2026-08-11 09:14', lastAction: null,
  },
  {
    id: 'e6', sessionDate: '2026-08-11', type: 'missing_bill',
    referenceCode: 'FB-2026-081112334', cardLast4: '3309', tkqc: 'TKQC-C',
    cs: 'Diệp', team: 'Team Scale', bankAmount: 3200, fbAmount: null,
    status: 'open', t0: '2026-08-12 09:30', lastAction: null,
  },
  {
    id: 'e7', sessionDate: '2026-08-11', type: 'amount_mismatch',
    referenceCode: 'FB-2026-081127891', cardLast4: '1182', tkqc: 'TKQC-A',
    cs: 'Mạnh', team: 'Team Dũng', bankAmount: 1500, fbAmount: 1450,
    status: 'open', t0: '2026-08-12 09:30', lastAction: null,
  },
  {
    id: 'e8', sessionDate: '2026-08-11', type: 'missing_bill',
    referenceCode: 'FB-2026-081133672', cardLast4: '9923', tkqc: 'TKQC-A',
    cs: 'Huyền', team: 'Team Dũng', bankAmount: 900, fbAmount: null,
    status: 'open', t0: '2026-08-12 09:30', lastAction: null,
  },
  {
    id: 'e9', sessionDate: '2026-08-12', type: 'missing_bill',
    referenceCode: 'FB-2026-081245892', cardLast4: '5571', tkqc: 'TKQC-D',
    cs: 'Long', team: 'Team Growth', bankAmount: 720, fbAmount: null,
    status: 'open', t0: '2026-08-12 11:05', lastAction: null,
  },
  {
    id: 'e10', sessionDate: '2026-08-12', type: 'missing_bill',
    referenceCode: 'FB-2026-081261034', cardLast4: '4412', tkqc: 'TKQC-B',
    cs: 'Trang', team: 'Team Growth', bankAmount: 550, fbAmount: null,
    status: 'open', t0: '2026-08-12 11:05', lastAction: null,
  },
  {
    id: 'e11', sessionDate: '2026-08-09', type: 'amount_mismatch',
    referenceCode: 'FB-2026-080917723', cardLast4: '3348', tkqc: 'TKQC-C',
    cs: 'Mai', team: 'Team Scale', bankAmount: 2100, fbAmount: 1950,
    status: 'resolved', t0: '2026-08-10 09:20', lastAction: '2026-08-10 15:44',
    explanation: 'Chênh lệch làm tròn tiền tệ đã xác nhận theo sao kê ngân hàng.',
  },
  {
    id: 'e12', sessionDate: '2026-08-10', type: 'amount_mismatch',
    referenceCode: 'FB-2026-081055123', cardLast4: '2210', tkqc: 'TKQC-A',
    cs: 'Nam', team: 'Team Growth', bankAmount: 980, fbAmount: 920,
    status: 'explained', t0: '2026-08-11 09:14', lastAction: '2026-08-11 18:30',
    explanation: 'Chênh lệch do phí chuyển đổi ngoại tệ. Đã đính kèm sao kê.',
  },
  {
    id: 'e13', sessionDate: '2026-08-10', type: 'fb_without_bank',
    referenceCode: 'FB-2026-081067890', cardLast4: '7123', tkqc: 'TKQC-B',
    cs: 'Huyền', team: 'Team Dũng', bankAmount: 0, fbAmount: 2200,
    status: 'open', t0: '2026-08-11 09:14', lastAction: null,
  },
  {
    id: 'e14', sessionDate: '2026-08-10', type: 'duplicate_ref',
    referenceCode: 'FB-2026-081078901', cardLast4: '5432', tkqc: 'TKQC-C',
    cs: 'Diệp', team: 'Team Scale', bankAmount: 1100, fbAmount: 1100,
    status: 'pending_review', t0: '2026-08-11 09:14', lastAction: '2026-08-11 15:00',
    explanation: 'Reference trùng do lỗi hệ thống FB tạo 2 bill cho cùng 1 giao dịch.',
  },
]

// ─── Missing Bills ─────────────────────────────────────────────────────────────

export const missingBills: MissingBill[] = [
  { id: 'm1', sessionDate: '2026-08-10', referenceCode: 'FB-2026-081023451', cardLast4: '4521', tkqc: 'TKQC-A', cs: 'Mạnh', team: 'Team Dũng', amount: 1200, t0: '2026-08-11 09:14', status: 'pending', reminderSent: true, reminderTime: '2026-08-12 09:14' },
  { id: 'm2', sessionDate: '2026-08-10', referenceCode: 'FB-2026-081031105', cardLast4: '2291', tkqc: 'TKQC-B', cs: 'Trang', team: 'Team Growth', amount: 2400, t0: '2026-08-11 09:14', status: 'explained', reminderSent: false },
  { id: 'm3', sessionDate: '2026-08-11', referenceCode: 'FB-2026-081112334', cardLast4: '3309', tkqc: 'TKQC-C', cs: 'Diệp', team: 'Team Scale', amount: 3200, t0: '2026-08-12 09:30', status: 'pending', reminderSent: false },
  { id: 'm4', sessionDate: '2026-08-11', referenceCode: 'FB-2026-081133672', cardLast4: '9923', tkqc: 'TKQC-A', cs: 'Huyền', team: 'Team Dũng', amount: 900, t0: '2026-08-12 09:30', status: 'pending', reminderSent: false },
  { id: 'm5', sessionDate: '2026-08-09', referenceCode: 'FB-2026-080944112', cardLast4: '5571', tkqc: 'TKQC-D', cs: 'Long', team: 'Team Growth', amount: 720, t0: '2026-08-10 09:20', status: 'overdue', reminderSent: true, reminderTime: '2026-08-11 09:20' },
  { id: 'm6', sessionDate: '2026-08-11', referenceCode: 'FB-2026-081127891', cardLast4: '1182', tkqc: 'TKQC-A', cs: 'Mạnh', team: 'Team Dũng', amount: 1500, t0: '2026-08-12 09:30', status: 'pending', reminderSent: false },
  { id: 'm7', sessionDate: '2026-08-12', referenceCode: 'FB-2026-081245892', cardLast4: '5571', tkqc: 'TKQC-D', cs: 'Long', team: 'Team Growth', amount: 720, t0: '2026-08-12 11:05', status: 'pending', reminderSent: false },
  { id: 'm8', sessionDate: '2026-08-12', referenceCode: 'FB-2026-081261034', cardLast4: '4412', tkqc: 'TKQC-B', cs: 'Trang', team: 'Team Growth', amount: 550, t0: '2026-08-12 11:05', status: 'pending', reminderSent: false },
]

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditLog: AuditEntry[] = [
  { id: 'a1', timestamp: '2026-08-12 11:05', action: 'Kích hoạt đối soát', actor: 'system', target: 'Phiên 12/08/2026', detail: '2.341 giao dịch — 1.876 khớp', category: 'reconciliation' },
  { id: 'a2', timestamp: '2026-08-12 11:05', action: 'Tải lên dữ liệu Bank', actor: 'admin@aez.vn', target: 'Phiên 12/08/2026', detail: 'File: bank_txn_20260812.xlsx — 2.341 giao dịch SUCCESS hợp lệ', category: 'upload' },
  { id: 'a3', timestamp: '2026-08-12 09:30', action: 'Giao Bill thiếu', actor: 'system', target: 'FB-2026-081112334', detail: 'Giao cho Diệp (Team Scale) — chủ sở hữu TKQC-C từ 10/08', category: 'assignment' },
  { id: 'a4', timestamp: '2026-08-12 09:30', action: 'Gửi thông báo Telegram', actor: 'system', target: 'Diệp', detail: 'Bill thiếu FB-2026-081112334 — $3.200', category: 'notification' },
  { id: 'a5', timestamp: '2026-08-12 09:14', action: 'Gửi nhắc nhở Telegram', actor: 'system', target: 'Mạnh', detail: 'Chưa có hành động sau 24h — FB-2026-081023451', category: 'notification' },
  { id: 'a6', timestamp: '2026-08-11 16:48', action: 'CS nộp giải trình', actor: 'trang@aez.vn', target: 'FB-2026-081031105', detail: 'Lý do: Campaign dừng — khoản phí đã hoàn trên Facebook. Đính kèm bằng chứng.', category: 'cs_action' },
  { id: 'a7', timestamp: '2026-08-11 14:22', action: 'Gắn cờ lệch Amount để duyệt', actor: 'system', target: 'FB-2026-081018823', detail: 'Bank $850 vs FB $800 — chênh lệch $50', category: 'reconciliation' },
  { id: 'a8', timestamp: '2026-08-11 09:14', action: 'Tạo phiên đối soát', actor: 'system', target: 'Phiên 10/08/2026', detail: 'Thời gian xử lý: 11/08 – 12/08/2026', category: 'session' },
  { id: 'a9', timestamp: '2026-08-11 09:14', action: 'Kích hoạt đối soát', actor: 'system', target: 'Phiên 10/08/2026', detail: '5.102 giao dịch — 4.901 khớp', category: 'reconciliation' },
  { id: 'a10', timestamp: '2026-08-10 18:30', action: 'Đóng phiên đối soát', actor: 'system', target: 'Phiên 08/08/2026', detail: '83 mục chưa xử lý — đã tạo báo cáo', category: 'session' },
  { id: 'a11', timestamp: '2026-08-10 15:44', action: 'Xác nhận lệch Amount', actor: 'admin@aez.vn', target: 'FB-2026-080917723', detail: 'Xác nhận: làm tròn tiền tệ — đã phê duyệt', category: 'admin_action' },
  { id: 'a12', timestamp: '2026-08-10 09:20', action: 'Tạo phiên đối soát', actor: 'system', target: 'Phiên 09/08/2026', detail: 'Thời gian xử lý: 10/08 – 11/08/2026', category: 'session' },
  { id: 'a13', timestamp: '2026-08-09 09:00', action: 'Upload Bill Facebook', actor: 'huyen@aez.vn', target: 'Phiên 08/08/2026', detail: 'File: fb_bills_0808.csv — 421 bill — 12 khớp mới', category: 'upload' },
  { id: 'a14', timestamp: '2026-08-09 08:55', action: 'Thay đổi cài đặt', actor: 'admin@aez.vn', target: 'Ngưỡng nhắc nhở', detail: 'Đổi từ 36h → 24h', category: 'admin_action' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const exceptionTypeLabel: Record<ExceptionType, string> = {
  missing_bill: 'Bill thiếu',
  amount_mismatch: 'Lệch Amount',
  duplicate_ref: 'Trùng Reference',
  fb_without_bank: 'FB không có Bank',
}

export function fmt(n: number) {
  return '$' + n.toLocaleString('en-US')
}

export function fmtDate(d: string) {
  const [year, month, day] = d.split('-')
  return `${day}/${month}/${year}`
}

// ─── Session Record Interfaces (for Phiên đối soát detail tabs) ───────────────

export interface ReconciledPair {
  id: string
  bankDate: string
  fbDate: string
  cs: string
  team: string
  tkqc: string
  reference: string
  last4: string
  bankAmount: number
  fbAmount: number
  diff: number
  bankTxnId: string
  bankDesc: string
  bankSourceFile: string
  bankUploadTime: string
  fbBillId: string
  fbSourceFile: string
  fbUploadTime: string
}

export interface ExceptionRecord {
  id: string
  type: 'amount_mismatch' | 'duplicate_ref'
  date: string
  cs: string
  team: string
  tkqc: string
  reference: string
  last4: string
  bankAmount: number
  fbAmount: number
  diff: number
  status: 'can_kiem_tra' | 'can_xac_minh'
  duplicateRecords?: Array<{ source: 'bank' | 'facebook'; amount: number; date: string; txnId: string }>
  bankTxnId?: string
  fbBillId?: string
}

export interface BankUnreconciledRecord {
  id: string
  bankDate: string
  cs: string
  team: string
  tkqc: string
  reference: string
  last4: string
  amount: number
  csStatus: 'chua_xu_ly' | 'dang_xu_ly' | 'da_nhac' | 'cho_duyet'
  hoursRemaining: number
  hasMissingBillCase: boolean
  bankTxnId: string
  bankDesc: string
  bankSourceFile: string
  bankUploadTime: string
}

export interface FbUnreconciledRecord {
  id: string
  fbDate: string
  cs: string
  team: string
  tkqc: string
  reference: string
  last4: string
  amount: number
  uploadDate: string
  status: 'chua_tim_thay_bank' | 'added_after_close'
  fbBillId: string
  fbSourceFile: string
}

export interface SessionDetail {
  sessionId: string
  reconciled: ReconciledPair[]
  exceptions: ExceptionRecord[]
  bankUnreconciled: BankUnreconciledRecord[]
  fbUnreconciled: FbUnreconciledRecord[]
}

// ─── Extended Session (Phiên đối soát page) ───────────────────────────────────
// New status: active=Đang đối soát, closing_soon=Sắp đóng, closed=Đã đóng, closed_pending=Đã đóng còn tồn đọng
export type SessionStatusV2 = 'active' | 'closing_soon' | 'closed' | 'closed_pending'

export interface SessionV2 {
  id: string
  date: string
  status: SessionStatusV2
  sheetTotal: number
  bankTotal: number
  bankBills: number
  fbTotal: number
  fbBills: number
  reconciledAmount: number
  reconciledBills: number
  unreconciledAmount: number
  unreconciledBills: number
  fbUnreconciledAmount: number
  fbUnreconciledBills: number
  exceptionsAmount: number
  exceptionsBills: number
  processingDeadline: string
  hoursRemaining: number
  closedDate?: string
}

export const sessionsV2: SessionV2[] = [
  {
    id: 'sv1', date: '2026-08-09', status: 'active',
    sheetTotal: 42080, bankTotal: 41220, bankBills: 4122, fbTotal: 39870, fbBills: 3987,
    reconciledAmount: 37950, reconciledBills: 3795,
    unreconciledAmount: 3270, unreconciledBills: 327,
    fbUnreconciledAmount: 1400, fbUnreconciledBills: 192,
    exceptionsAmount: 520, exceptionsBills: 18,
    processingDeadline: '2026-08-11', hoursRemaining: 35,
  },
  {
    id: 'sv2', date: '2026-08-08', status: 'closing_soon',
    sheetTotal: 53120, bankTotal: 52480, bankBills: 5284, fbTotal: 50130, fbBills: 5013,
    reconciledAmount: 48920, reconciledBills: 4901,
    unreconciledAmount: 3560, unreconciledBills: 383,
    fbUnreconciledAmount: 1210, fbUnreconciledBills: 126,
    exceptionsAmount: 840, exceptionsBills: 31,
    processingDeadline: '2026-08-10', hoursRemaining: 5,
  },
  {
    id: 'sv3', date: '2026-08-07', status: 'closed',
    sheetTotal: 45200, bankTotal: 44800, bankBills: 4480, fbTotal: 42100, fbBills: 4210,
    reconciledAmount: 44800, reconciledBills: 4480,
    unreconciledAmount: 0, unreconciledBills: 0,
    fbUnreconciledAmount: 0, fbUnreconciledBills: 0,
    exceptionsAmount: 0, exceptionsBills: 0,
    processingDeadline: '2026-08-09', hoursRemaining: 0,
    closedDate: '2026-08-09',
  },
  {
    id: 'sv4', date: '2026-08-06', status: 'closed_pending',
    sheetTotal: 39800, bankTotal: 38920, bankBills: 3892, fbTotal: 37200, fbBills: 3720,
    reconciledAmount: 35100, reconciledBills: 3510,
    unreconciledAmount: 2180, unreconciledBills: 218,
    fbUnreconciledAmount: 820, fbUnreconciledBills: 84,
    exceptionsAmount: 1640, exceptionsBills: 15,
    processingDeadline: '2026-08-08', hoursRemaining: 0,
    closedDate: '2026-08-08',
  },
]

// ─── Session Detail Records (sv2 = Phiên 08/08, primary demo) ─────────────────

export const sessionDetails: Record<string, SessionDetail> = {
  sv2: {
    sessionId: 'sv2',
    reconciled: [
      { id: 'r1', bankDate: '10/08', fbDate: '08/08', cs: 'Mạnh', team: 'Team Dũng', tkqc: '238472918...', reference: '4KQ8X2', last4: '8821', bankAmount: 126.42, fbAmount: 126.42, diff: 0, bankTxnId: 'BNK-2082601', bankDesc: 'THANH TOAN THE TIN DUNG 8821', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14', fbBillId: 'FB-2026-08081023', fbSourceFile: 'fb_bills_0808.csv', fbUploadTime: '08/08 21:02' },
      { id: 'r2', bankDate: '10/08', fbDate: '08/08', cs: 'Huyền', team: 'Team Dũng', tkqc: '238472918...', reference: 'P9WZ31', last4: '4411', bankAmount: 842.00, fbAmount: 842.00, diff: 0, bankTxnId: 'BNK-2082602', bankDesc: 'THANH TOAN THE TIN DUNG 4411', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14', fbBillId: 'FB-2026-08081024', fbSourceFile: 'fb_bills_0808.csv', fbUploadTime: '08/08 21:02' },
      { id: 'r3', bankDate: '10/08', fbDate: '08/08', cs: 'Nam', team: 'Team Growth', tkqc: '917238142...', reference: 'QWE782', last4: '4482', bankAmount: 84.20, fbAmount: 84.20, diff: 0, bankTxnId: 'BNK-2082603', bankDesc: 'THANH TOAN THE TIN DUNG 4482', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14', fbBillId: 'FB-2026-08081025', fbSourceFile: 'fb_bills_0808.csv', fbUploadTime: '08/08 21:02' },
      { id: 'r4', bankDate: '10/08', fbDate: '08/08', cs: 'Trang', team: 'Team Growth', tkqc: '917238142...', reference: 'LMN442', last4: '2219', bankAmount: 315.00, fbAmount: 315.00, diff: 0, bankTxnId: 'BNK-2082604', bankDesc: 'THANH TOAN THE TIN DUNG 2219', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14', fbBillId: 'FB-2026-08081026', fbSourceFile: 'fb_bills_0808.csv', fbUploadTime: '08/08 21:02' },
      { id: 'r5', bankDate: '10/08', fbDate: '08/08', cs: 'Long', team: 'Team Growth', tkqc: '917238142...', reference: 'KPO771', last4: '9901', bankAmount: 1200.00, fbAmount: 1200.00, diff: 0, bankTxnId: 'BNK-2082605', bankDesc: 'THANH TOAN THE TIN DUNG 9901', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14', fbBillId: 'FB-2026-08081027', fbSourceFile: 'fb_bills_0808.csv', fbUploadTime: '08/08 21:05' },
      { id: 'r6', bankDate: '10/08', fbDate: '08/08', cs: 'Diệp', team: 'Team Scale', tkqc: '562841290...', reference: 'ZBX119', last4: '3344', bankAmount: 560.80, fbAmount: 560.80, diff: 0, bankTxnId: 'BNK-2082606', bankDesc: 'THANH TOAN THE TIN DUNG 3344', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14', fbBillId: 'FB-2026-08081028', fbSourceFile: 'fb_bills_0808.csv', fbUploadTime: '08/08 21:05' },
      { id: 'r7', bankDate: '10/08', fbDate: '08/08', cs: 'Mai', team: 'Team Scale', tkqc: '562841290...', reference: 'TYP284', last4: '7762', bankAmount: 420.00, fbAmount: 420.00, diff: 0, bankTxnId: 'BNK-2082607', bankDesc: 'THANH TOAN THE TIN DUNG 7762', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14', fbBillId: 'FB-2026-08081029', fbSourceFile: 'fb_bills_0808.csv', fbUploadTime: '08/08 21:05' },
      { id: 'r8', bankDate: '10/08', fbDate: '08/08', cs: 'Dũng', team: 'Team Dũng', tkqc: '238472918...', reference: 'WRX902', last4: '5512', bankAmount: 180.60, fbAmount: 180.60, diff: 0, bankTxnId: 'BNK-2082608', bankDesc: 'THANH TOAN THE TIN DUNG 5512', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14', fbBillId: 'FB-2026-08081030', fbSourceFile: 'fb_bills_0808.csv', fbUploadTime: '08/08 21:08' },
    ],
    exceptions: [
      { id: 'ex1', type: 'amount_mismatch', date: '08/08', cs: 'Mạnh', team: 'Team Dũng', tkqc: '238472918...', reference: 'ABC123', last4: '8821', bankAmount: 100.42, fbAmount: 99.98, diff: 0.44, status: 'can_kiem_tra', bankTxnId: 'BNK-2082610', fbBillId: 'FB-2026-08081040' },
      { id: 'ex2', type: 'amount_mismatch', date: '08/08', cs: 'Huyền', team: 'Team Dũng', tkqc: '238472918...', reference: 'DEF456', last4: '4411', bankAmount: 500.00, fbAmount: 497.20, diff: 2.80, status: 'can_kiem_tra', bankTxnId: 'BNK-2082611', fbBillId: 'FB-2026-08081041' },
      { id: 'ex3', type: 'amount_mismatch', date: '08/08', cs: 'Nam', team: 'Team Growth', tkqc: '917238142...', reference: 'GHI789', last4: '4482', bankAmount: 240.00, fbAmount: 238.50, diff: 1.50, status: 'can_kiem_tra', bankTxnId: 'BNK-2082612', fbBillId: 'FB-2026-08081042' },
      {
        id: 'ex4', type: 'duplicate_ref', date: '08/08', cs: 'Huyền', team: 'Team Dũng', tkqc: '238472918...', reference: 'XYZ789', last4: '4411', bankAmount: 320.00, fbAmount: 320.00, diff: 0, status: 'can_xac_minh',
        duplicateRecords: [
          { source: 'bank', amount: 320.00, date: '08/08', txnId: 'BNK-2082613' },
          { source: 'facebook', amount: 320.00, date: '08/08', txnId: 'FB-2026-08081043' },
          { source: 'facebook', amount: 320.00, date: '07/08', txnId: 'FB-2026-07081011' },
        ],
      },
      {
        id: 'ex5', type: 'duplicate_ref', date: '08/08', cs: 'Trang', team: 'Team Growth', tkqc: '917238142...', reference: 'MNO321', last4: '2219', bankAmount: 175.00, fbAmount: 175.00, diff: 0, status: 'can_xac_minh',
        duplicateRecords: [
          { source: 'bank', amount: 175.00, date: '08/08', txnId: 'BNK-2082614' },
          { source: 'facebook', amount: 175.00, date: '08/08', txnId: 'FB-2026-08081044' },
          { source: 'bank', amount: 175.00, date: '08/08', txnId: 'BNK-2082615' },
        ],
      },
    ],
    bankUnreconciled: [
      { id: 'bu1', bankDate: '10/08', cs: 'Mạnh', team: 'Team Dũng', tkqc: '238472918...', reference: 'ABC123', last4: '8821', amount: 152.00, csStatus: 'chua_xu_ly', hoursRemaining: 11, hasMissingBillCase: true, bankTxnId: 'BNK-2082620', bankDesc: 'THANH TOAN THE TIN DUNG 8821', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14' },
      { id: 'bu2', bankDate: '10/08', cs: 'Mạnh', team: 'Team Dũng', tkqc: '238472918...', reference: 'RST664', last4: '8821', amount: 310.00, csStatus: 'dang_xu_ly', hoursRemaining: 11, hasMissingBillCase: true, bankTxnId: 'BNK-2082621', bankDesc: 'THANH TOAN THE TIN DUNG 8821', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14' },
      { id: 'bu3', bankDate: '10/08', cs: 'Huyền', team: 'Team Dũng', tkqc: '238472918...', reference: 'UVW221', last4: '4411', amount: 88.40, csStatus: 'da_nhac', hoursRemaining: 11, hasMissingBillCase: true, bankTxnId: 'BNK-2082622', bankDesc: 'THANH TOAN THE TIN DUNG 4411', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14' },
      { id: 'bu4', bankDate: '10/08', cs: 'Nam', team: 'Team Growth', tkqc: '917238142...', reference: 'JKL881', last4: '4482', amount: 450.00, csStatus: 'cho_duyet', hoursRemaining: 11, hasMissingBillCase: false, bankTxnId: 'BNK-2082623', bankDesc: 'THANH TOAN THE TIN DUNG 4482', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14' },
      { id: 'bu5', bankDate: '10/08', cs: 'Trang', team: 'Team Growth', tkqc: '917238142...', reference: 'PQR556', last4: '2219', amount: 220.00, csStatus: 'chua_xu_ly', hoursRemaining: 11, hasMissingBillCase: true, bankTxnId: 'BNK-2082624', bankDesc: 'THANH TOAN THE TIN DUNG 2219', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14' },
      { id: 'bu6', bankDate: '10/08', cs: 'Long', team: 'Team Growth', tkqc: '917238142...', reference: 'STU993', last4: '9901', amount: 680.00, csStatus: 'dang_xu_ly', hoursRemaining: 11, hasMissingBillCase: false, bankTxnId: 'BNK-2082625', bankDesc: 'THANH TOAN THE TIN DUNG 9901', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14' },
      { id: 'bu7', bankDate: '10/08', cs: 'Diệp', team: 'Team Scale', tkqc: '562841290...', reference: 'VWX772', last4: '3344', amount: 125.00, csStatus: 'chua_xu_ly', hoursRemaining: 11, hasMissingBillCase: true, bankTxnId: 'BNK-2082626', bankDesc: 'THANH TOAN THE TIN DUNG 3344', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14' },
      { id: 'bu8', bankDate: '10/08', cs: 'Mai', team: 'Team Scale', tkqc: '562841290...', reference: 'YZA114', last4: '7762', amount: 190.00, csStatus: 'da_nhac', hoursRemaining: 11, hasMissingBillCase: true, bankTxnId: 'BNK-2082627', bankDesc: 'THANH TOAN THE TIN DUNG 7762', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:14' },
    ],
    fbUnreconciled: [
      { id: 'fu1', fbDate: '08/08', cs: 'Nam', team: 'Team Growth', tkqc: '917238142...', reference: 'QWE782', last4: '4482', amount: 84.20, uploadDate: '10/08 09:42', status: 'chua_tim_thay_bank', fbBillId: 'FB-2026-08081050', fbSourceFile: 'fb_bills_0808.csv' },
      { id: 'fu2', fbDate: '08/08', cs: 'Trang', team: 'Team Growth', tkqc: '917238142...', reference: 'LMN442', last4: '2219', amount: 210.00, uploadDate: '10/08 09:42', status: 'chua_tim_thay_bank', fbBillId: 'FB-2026-08081051', fbSourceFile: 'fb_bills_0808.csv' },
      { id: 'fu3', fbDate: '08/08', cs: 'Huyền', team: 'Team Dũng', tkqc: '238472918...', reference: 'PKQ284', last4: '4411', amount: 360.00, uploadDate: '10/08 09:42', status: 'chua_tim_thay_bank', fbBillId: 'FB-2026-08081052', fbSourceFile: 'fb_bills_0808.csv' },
      { id: 'fu4', fbDate: '07/08', cs: 'Mạnh', team: 'Team Dũng', tkqc: '238472918...', reference: 'LMN910', last4: '8821', amount: 420.00, uploadDate: '11/08 14:20', status: 'added_after_close', fbBillId: 'FB-2026-07081088', fbSourceFile: 'fb_bills_0807_late.csv' },
      { id: 'fu5', fbDate: '08/08', cs: 'Long', team: 'Team Growth', tkqc: '917238142...', reference: 'OPQ551', last4: '9901', amount: 136.00, uploadDate: '10/08 09:43', status: 'chua_tim_thay_bank', fbBillId: 'FB-2026-08081053', fbSourceFile: 'fb_bills_0808.csv' },
    ],
  },
  sv1: {
    sessionId: 'sv1',
    reconciled: [
      { id: 'r1b', bankDate: '11/08', fbDate: '09/08', cs: 'Mạnh', team: 'Team Dũng', tkqc: '238472918...', reference: 'AAA111', last4: '8821', bankAmount: 200.00, fbAmount: 200.00, diff: 0, bankTxnId: 'BNK-2090101', bankDesc: 'THANH TOAN THE TIN DUNG 8821', bankSourceFile: 'bank_txn_20260809.xlsx', bankUploadTime: '10/08 07:10', fbBillId: 'FB-2026-09091001', fbSourceFile: 'fb_bills_0809.csv', fbUploadTime: '09/08 22:00' },
      { id: 'r2b', bankDate: '11/08', fbDate: '09/08', cs: 'Nam', team: 'Team Growth', tkqc: '917238142...', reference: 'BBB222', last4: '4482', bankAmount: 480.00, fbAmount: 480.00, diff: 0, bankTxnId: 'BNK-2090102', bankDesc: 'THANH TOAN THE TIN DUNG 4482', bankSourceFile: 'bank_txn_20260809.xlsx', bankUploadTime: '10/08 07:10', fbBillId: 'FB-2026-09091002', fbSourceFile: 'fb_bills_0809.csv', fbUploadTime: '09/08 22:01' },
    ],
    exceptions: [
      { id: 'ex1b', type: 'amount_mismatch', date: '09/08', cs: 'Trang', team: 'Team Growth', tkqc: '917238142...', reference: 'CCC333', last4: '2219', bankAmount: 650.00, fbAmount: 648.00, diff: 2.00, status: 'can_kiem_tra', bankTxnId: 'BNK-2090110', fbBillId: 'FB-2026-09091010' },
    ],
    bankUnreconciled: [
      { id: 'bu1b', bankDate: '11/08', cs: 'Diệp', team: 'Team Scale', tkqc: '562841290...', reference: 'DDD444', last4: '3344', amount: 280.00, csStatus: 'chua_xu_ly', hoursRemaining: 35, hasMissingBillCase: true, bankTxnId: 'BNK-2090120', bankDesc: 'THANH TOAN THE TIN DUNG 3344', bankSourceFile: 'bank_txn_20260809.xlsx', bankUploadTime: '10/08 07:10' },
    ],
    fbUnreconciled: [
      { id: 'fu1b', fbDate: '09/08', cs: 'Mai', team: 'Team Scale', tkqc: '562841290...', reference: 'EEE555', last4: '7762', amount: 310.00, uploadDate: '10/08 08:55', status: 'chua_tim_thay_bank', fbBillId: 'FB-2026-09091020', fbSourceFile: 'fb_bills_0809.csv' },
    ],
  },
  sv4: {
    sessionId: 'sv4',
    reconciled: [
      { id: 'r1c', bankDate: '08/08', fbDate: '06/08', cs: 'Mạnh', team: 'Team Dũng', tkqc: '238472918...', reference: 'FFF666', last4: '8821', bankAmount: 340.00, fbAmount: 340.00, diff: 0, bankTxnId: 'BNK-2060601', bankDesc: 'THANH TOAN THE TIN DUNG 8821', bankSourceFile: 'bank_txn_20260806.xlsx', bankUploadTime: '07/08 07:05', fbBillId: 'FB-2026-06061001', fbSourceFile: 'fb_bills_0806.csv', fbUploadTime: '06/08 22:00' },
    ],
    exceptions: [
      { id: 'ex1c', type: 'amount_mismatch', date: '06/08', cs: 'Long', team: 'Team Growth', tkqc: '917238142...', reference: 'GGG777', last4: '9901', bankAmount: 900.00, fbAmount: 895.00, diff: 5.00, status: 'can_kiem_tra', bankTxnId: 'BNK-2060610', fbBillId: 'FB-2026-06061010' },
      { id: 'ex2c', type: 'amount_mismatch', date: '06/08', cs: 'Huyền', team: 'Team Dũng', tkqc: '238472918...', reference: 'HHH888', last4: '4411', bankAmount: 1200.00, fbAmount: 1195.00, diff: 5.00, status: 'can_kiem_tra', bankTxnId: 'BNK-2060611', fbBillId: 'FB-2026-06061011' },
    ],
    bankUnreconciled: [
      { id: 'bu1c', bankDate: '08/08', cs: 'Trang', team: 'Team Growth', tkqc: '917238142...', reference: 'III999', last4: '2219', amount: 420.00, csStatus: 'chua_xu_ly', hoursRemaining: 0, hasMissingBillCase: true, bankTxnId: 'BNK-2060620', bankDesc: 'THANH TOAN THE TIN DUNG 2219', bankSourceFile: 'bank_txn_20260806.xlsx', bankUploadTime: '07/08 07:05' },
      { id: 'bu2c', bankDate: '08/08', cs: 'Diệp', team: 'Team Scale', tkqc: '562841290...', reference: 'JJJ000', last4: '3344', amount: 310.00, csStatus: 'da_nhac', hoursRemaining: 0, hasMissingBillCase: true, bankTxnId: 'BNK-2060621', bankDesc: 'THANH TOAN THE TIN DUNG 3344', bankSourceFile: 'bank_txn_20260806.xlsx', bankUploadTime: '07/08 07:05' },
    ],
    fbUnreconciled: [
      { id: 'fu1c', fbDate: '06/08', cs: 'Nam', team: 'Team Growth', tkqc: '917238142...', reference: 'KKK101', last4: '4482', amount: 280.00, uploadDate: '07/08 09:10', status: 'chua_tim_thay_bank', fbBillId: 'FB-2026-06061020', fbSourceFile: 'fb_bills_0806.csv' },
    ],
  },
  sv3: {
    sessionId: 'sv3',
    reconciled: [
      { id: 'r1d', bankDate: '09/08', fbDate: '07/08', cs: 'Mạnh', team: 'Team Dũng', tkqc: '238472918...', reference: 'LLL202', last4: '8821', bankAmount: 520.00, fbAmount: 520.00, diff: 0, bankTxnId: 'BNK-2070701', bankDesc: 'THANH TOAN THE TIN DUNG 8821', bankSourceFile: 'bank_txn_20260807.xlsx', bankUploadTime: '08/08 07:00', fbBillId: 'FB-2026-07071001', fbSourceFile: 'fb_bills_0807.csv', fbUploadTime: '07/08 22:00' },
    ],
    exceptions: [],
    bankUnreconciled: [],
    fbUnreconciled: [],
  },
}

// ═══════════════════════════════════════════════════════════════
// MODULE BILL THIẾU
// ═══════════════════════════════════════════════════════════════

export type MBCaseStatus = 'chua_xu_ly' | 'dang_xu_ly' | 'cho_duyet' | 'qua_han'

export interface MissingBillCase {
  id: string
  cs: string
  team: string
  sessionId: string
  sessionDate: string
  initialBills: number
  initialAmount: number
  supplementedBills: number
  supplementedAmount: number
  remainingBills: number
  remainingAmount: number
  pendingExplanationBills: number
  pendingExplanationAmount: number
  status: MBCaseStatus
  lastActionDesc: string
  processingDeadline: string
  hoursRemaining: number
  t0: string
  notifiedAt: string
  reminderSentAt?: string
}

export interface MissingBillRecord {
  id: string
  caseId: string
  bankDate: string
  tkqcId: string
  reference: string
  last4: string
  amount: number
  status: 'chua_bo_sung' | 'da_doi_soat' | 'cho_duyet_giai_trinh'
  txnId: string
  bankDesc: string
  bankSourceFile: string
  bankUploadTime: string
}

export interface EvidenceImage {
  id: string
  name: string
  uploadedAt: string
  colorBg: string
}

export interface ExplanationCase {
  id: string
  caseId: string
  cs: string
  team: string
  sessionDate: string
  bills: number
  totalAmount: number
  reasons: ('acc_die' | 'no_share' | 'back' | 'other')[]
  otherReason?: string
  submittedAt: string
  waitingDuration: string
  evidenceImages: EvidenceImage[]
  billList: { id: string; tkqcId: string; last4: string; reference: string; amount: number }[]
}

export interface FbSurplusBill {
  id: string
  fbDate: string
  cs: string
  team: string
  tkqcId: string
  reference: string
  last4: string
  amount: number
  uploadedAt: string
  uploadSource: string
  billId: string
  sourceFile: string
  relatedSession?: string
}

export const mbTeams = ['Team Dũng', 'Team Linh', 'Team Anh', 'Team Growth', 'Team Scale']

export const mbCsTeamMap: Record<string, string> = {
  Mạnh: 'Team Dũng', Trang: 'Team Dũng', Hùng: 'Team Dũng',
  Huyền: 'Team Linh', Nam: 'Team Linh', Ngân: 'Team Linh',
  Lan: 'Team Anh', Minh: 'Team Anh', Quân: 'Team Anh',
  Long: 'Team Growth', Diệp: 'Team Growth',
  Mai: 'Team Scale', Khoa: 'Team Scale',
}

export const missingBillCases: MissingBillCase[] = [
  // Scenario A – Mạnh, đang xử lý
  {
    id: 'mb1', cs: 'Mạnh', team: 'Team Dũng', sessionId: 'sv2', sessionDate: '2026-08-08',
    initialBills: 35, initialAmount: 1208,
    supplementedBills: 20, supplementedAmount: 720,
    remainingBills: 15, remainingAmount: 488,
    pendingExplanationBills: 0, pendingExplanationAmount: 0,
    status: 'dang_xu_ly',
    lastActionDesc: 'Upload Bill bổ sung · 2 giờ trước',
    processingDeadline: '2026-08-10', hoursRemaining: 11,
    t0: '09/08 10:24', notifiedAt: '09/08 10:25', reminderSentAt: '10/08 10:25',
  },
  // Scenario B – Huyền, chưa xử lý
  {
    id: 'mb2', cs: 'Huyền', team: 'Team Linh', sessionId: 'sv2', sessionDate: '2026-08-08',
    initialBills: 18, initialAmount: 829,
    supplementedBills: 0, supplementedAmount: 0,
    remainingBills: 18, remainingAmount: 829,
    pendingExplanationBills: 0, pendingExplanationAmount: 0,
    status: 'chua_xu_ly',
    lastActionDesc: 'Chưa có',
    processingDeadline: '2026-08-10', hoursRemaining: 11,
    t0: '09/08 10:24', notifiedAt: '09/08 10:25',
  },
  // Scenario C – Nam, chờ duyệt giải trình
  {
    id: 'mb3', cs: 'Nam', team: 'Team Linh', sessionId: 'sv2', sessionDate: '2026-08-08',
    initialBills: 12, initialAmount: 420,
    supplementedBills: 0, supplementedAmount: 0,
    remainingBills: 12, remainingAmount: 420,
    pendingExplanationBills: 12, pendingExplanationAmount: 420,
    status: 'cho_duyet',
    lastActionDesc: 'Gửi giải trình · 3 giờ trước',
    processingDeadline: '2026-08-10', hoursRemaining: 11,
    t0: '09/08 10:24', notifiedAt: '09/08 10:25',
  },
  // Scenario D – Trang, giải trình bị từ chối
  {
    id: 'mb4', cs: 'Trang', team: 'Team Dũng', sessionId: 'sv2', sessionDate: '2026-08-08',
    initialBills: 24, initialAmount: 936,
    supplementedBills: 14, supplementedAmount: 584,
    remainingBills: 10, remainingAmount: 352,
    pendingExplanationBills: 0, pendingExplanationAmount: 0,
    status: 'dang_xu_ly',
    lastActionDesc: 'Giải trình bị từ chối · 1 giờ trước',
    processingDeadline: '2026-08-10', hoursRemaining: 11,
    t0: '09/08 09:30', notifiedAt: '09/08 09:31', reminderSentAt: '10/08 09:31',
  },
  // Scenario E – Minh, quá hạn
  {
    id: 'mb5', cs: 'Minh', team: 'Team Anh', sessionId: 'sv2', sessionDate: '2026-08-08',
    initialBills: 22, initialAmount: 680,
    supplementedBills: 0, supplementedAmount: 0,
    remainingBills: 22, remainingAmount: 680,
    pendingExplanationBills: 0, pendingExplanationAmount: 0,
    status: 'qua_han',
    lastActionDesc: 'Chưa có',
    processingDeadline: '2026-08-10', hoursRemaining: 0,
    t0: '09/08 10:24', notifiedAt: '09/08 10:25', reminderSentAt: '10/08 10:25',
  },
  // sv1 cases
  {
    id: 'mb6', cs: 'Lan', team: 'Team Anh', sessionId: 'sv1', sessionDate: '2026-08-09',
    initialBills: 16, initialAmount: 611,
    supplementedBills: 8, supplementedAmount: 285,
    remainingBills: 8, remainingAmount: 326,
    pendingExplanationBills: 0, pendingExplanationAmount: 0,
    status: 'dang_xu_ly',
    lastActionDesc: 'Upload Bill bổ sung · 5 giờ trước',
    processingDeadline: '2026-08-11', hoursRemaining: 35,
    t0: '10/08 08:15', notifiedAt: '10/08 08:16',
  },
  {
    id: 'mb7', cs: 'Hùng', team: 'Team Dũng', sessionId: 'sv1', sessionDate: '2026-08-09',
    initialBills: 9, initialAmount: 342,
    supplementedBills: 0, supplementedAmount: 0,
    remainingBills: 9, remainingAmount: 342,
    pendingExplanationBills: 0, pendingExplanationAmount: 0,
    status: 'chua_xu_ly',
    lastActionDesc: 'Chưa có',
    processingDeadline: '2026-08-11', hoursRemaining: 35,
    t0: '10/08 08:15', notifiedAt: '10/08 08:16',
  },
  {
    id: 'mb8', cs: 'Ngân', team: 'Team Linh', sessionId: 'sv1', sessionDate: '2026-08-09',
    initialBills: 11, initialAmount: 418,
    supplementedBills: 3, supplementedAmount: 124,
    remainingBills: 8, remainingAmount: 294,
    pendingExplanationBills: 8, pendingExplanationAmount: 294,
    status: 'cho_duyet',
    lastActionDesc: 'Gửi giải trình · 1 giờ trước',
    processingDeadline: '2026-08-11', hoursRemaining: 35,
    t0: '10/08 08:15', notifiedAt: '10/08 08:16',
  },
]

export const missingBillRecords: MissingBillRecord[] = [
  // Mạnh (mb1) – 15 remaining
  { id: 'mbr101', caseId: 'mb1', bankDate: '08/08', tkqcId: '238472918...', reference: 'ABK291', last4: '8821', amount: 152, status: 'chua_bo_sung', txnId: 'BNK-0808-0291', bankDesc: 'THANH TOAN THE TIN DUNG 8821', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr102', caseId: 'mb1', bankDate: '08/08', tkqcId: '238472918...', reference: 'ABK314', last4: '8821', amount: 88, status: 'chua_bo_sung', txnId: 'BNK-0808-0314', bankDesc: 'THANH TOAN THE TIN DUNG 8821', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr103', caseId: 'mb1', bankDate: '08/08', tkqcId: '238472918...', reference: 'ABK382', last4: '8821', amount: 65, status: 'chua_bo_sung', txnId: 'BNK-0808-0382', bankDesc: 'THANH TOAN THE TIN DUNG 8821', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr104', caseId: 'mb1', bankDate: '08/08', tkqcId: '349182047...', reference: 'ACX109', last4: '3312', amount: 44, status: 'chua_bo_sung', txnId: 'BNK-0808-0109', bankDesc: 'THANH TOAN THE TIN DUNG 3312', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr105', caseId: 'mb1', bankDate: '08/08', tkqcId: '349182047...', reference: 'ACX221', last4: '3312', amount: 29, status: 'chua_bo_sung', txnId: 'BNK-0808-0221', bankDesc: 'THANH TOAN THE TIN DUNG 3312', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr106', caseId: 'mb1', bankDate: '08/08', tkqcId: '238472918...', reference: 'ABK455', last4: '8821', amount: 18, status: 'chua_bo_sung', txnId: 'BNK-0808-0455', bankDesc: 'THANH TOAN THE TIN DUNG 8821', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr107', caseId: 'mb1', bankDate: '08/08', tkqcId: '238472918...', reference: 'ABK502', last4: '8821', amount: 33, status: 'chua_bo_sung', txnId: 'BNK-0808-0502', bankDesc: 'THANH TOAN THE TIN DUNG 8821', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr108', caseId: 'mb1', bankDate: '08/08', tkqcId: '349182047...', reference: 'ACX318', last4: '3312', amount: 27, status: 'chua_bo_sung', txnId: 'BNK-0808-0318', bankDesc: 'THANH TOAN THE TIN DUNG 3312', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  // Mạnh – 5 supplemented (already matched)
  { id: 'mbr109', caseId: 'mb1', bankDate: '08/08', tkqcId: '238472918...', reference: 'ABK101', last4: '8821', amount: 210, status: 'da_doi_soat', txnId: 'BNK-0808-0101', bankDesc: 'THANH TOAN THE TIN DUNG 8821', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr110', caseId: 'mb1', bankDate: '08/08', tkqcId: '238472918...', reference: 'ABK102', last4: '8821', amount: 190, status: 'da_doi_soat', txnId: 'BNK-0808-0102', bankDesc: 'THANH TOAN THE TIN DUNG 8821', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  // Nam (mb3) – 12 chờ duyệt giải trình
  { id: 'mbr301', caseId: 'mb3', bankDate: '08/08', tkqcId: '917238142...', reference: 'CCA011', last4: '4482', amount: 58, status: 'cho_duyet_giai_trinh', txnId: 'BNK-0808-1011', bankDesc: 'THANH TOAN THE TIN DUNG 4482', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr302', caseId: 'mb3', bankDate: '08/08', tkqcId: '917238142...', reference: 'CCA022', last4: '4482', amount: 44, status: 'cho_duyet_giai_trinh', txnId: 'BNK-0808-1022', bankDesc: 'THANH TOAN THE TIN DUNG 4482', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr303', caseId: 'mb3', bankDate: '08/08', tkqcId: '917238142...', reference: 'CCA033', last4: '4482', amount: 31, status: 'cho_duyet_giai_trinh', txnId: 'BNK-0808-1033', bankDesc: 'THANH TOAN THE TIN DUNG 4482', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr304', caseId: 'mb3', bankDate: '08/08', tkqcId: '917238142...', reference: 'CCA044', last4: '4482', amount: 72, status: 'cho_duyet_giai_trinh', txnId: 'BNK-0808-1044', bankDesc: 'THANH TOAN THE TIN DUNG 4482', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr305', caseId: 'mb3', bankDate: '08/08', tkqcId: '917238142...', reference: 'CCA055', last4: '4482', amount: 38, status: 'cho_duyet_giai_trinh', txnId: 'BNK-0808-1055', bankDesc: 'THANH TOAN THE TIN DUNG 4482', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr306', caseId: 'mb3', bankDate: '08/08', tkqcId: '917238142...', reference: 'CCA066', last4: '4482', amount: 26, status: 'cho_duyet_giai_trinh', txnId: 'BNK-0808-1066', bankDesc: 'THANH TOAN THE TIN DUNG 4482', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr307', caseId: 'mb3', bankDate: '08/08', tkqcId: '917238142...', reference: 'CCA077', last4: '4482', amount: 49, status: 'cho_duyet_giai_trinh', txnId: 'BNK-0808-1077', bankDesc: 'THANH TOAN THE TIN DUNG 4482', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  // Huyền (mb2)
  { id: 'mbr201', caseId: 'mb2', bankDate: '08/08', tkqcId: '562841290...', reference: 'BBQ119', last4: '7744', amount: 96, status: 'chua_bo_sung', txnId: 'BNK-0808-0119', bankDesc: 'THANH TOAN THE TIN DUNG 7744', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr202', caseId: 'mb2', bankDate: '08/08', tkqcId: '562841290...', reference: 'BBQ220', last4: '7744', amount: 54, status: 'chua_bo_sung', txnId: 'BNK-0808-0220', bankDesc: 'THANH TOAN THE TIN DUNG 7744', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  { id: 'mbr203', caseId: 'mb2', bankDate: '08/08', tkqcId: '562841290...', reference: 'BBQ331', last4: '7744', amount: 112, status: 'chua_bo_sung', txnId: 'BNK-0808-0331', bankDesc: 'THANH TOAN THE TIN DUNG 7744', bankSourceFile: 'bank_txn_20260808.xlsx', bankUploadTime: '09/08 07:10' },
  // Ngân (mb8)
  { id: 'mbr801', caseId: 'mb8', bankDate: '09/08', tkqcId: '449182047...', reference: 'DDF011', last4: '5519', amount: 62, status: 'cho_duyet_giai_trinh', txnId: 'BNK-0809-0011', bankDesc: 'THANH TOAN THE TIN DUNG 5519', bankSourceFile: 'bank_txn_20260809.xlsx', bankUploadTime: '10/08 07:05' },
  { id: 'mbr802', caseId: 'mb8', bankDate: '09/08', tkqcId: '449182047...', reference: 'DDF022', last4: '5519', amount: 88, status: 'cho_duyet_giai_trinh', txnId: 'BNK-0809-0022', bankDesc: 'THANH TOAN THE TIN DUNG 5519', bankSourceFile: 'bank_txn_20260809.xlsx', bankUploadTime: '10/08 07:05' },
  { id: 'mbr803', caseId: 'mb8', bankDate: '09/08', tkqcId: '449182047...', reference: 'DDF033', last4: '5519', amount: 44, status: 'cho_duyet_giai_trinh', txnId: 'BNK-0809-0033', bankDesc: 'THANH TOAN THE TIN DUNG 5519', bankSourceFile: 'bank_txn_20260809.xlsx', bankUploadTime: '10/08 07:05' },
]

export const explanationCases: ExplanationCase[] = [
  // Nam – Scenario C
  {
    id: 'exp1', caseId: 'mb3', cs: 'Nam', team: 'Team Linh', sessionDate: '2026-08-08',
    bills: 12, totalAmount: 420,
    reasons: ['acc_die', 'back'],
    submittedAt: '10/08/2026 09:42', waitingDuration: '2 giờ 15 phút',
    evidenceImages: [
      { id: 'ei1', name: 'chung_minh_01.jpg', uploadedAt: '10/08 09:38', colorBg: '#E0E7FF' },
      { id: 'ei2', name: 'chung_minh_02.jpg', uploadedAt: '10/08 09:39', colorBg: '#FCE7F3' },
      { id: 'ei3', name: 'chung_minh_03.jpg', uploadedAt: '10/08 09:40', colorBg: '#D1FAE5' },
    ],
    billList: [
      { id: 'bl1', tkqcId: '917238142...', last4: '4482', reference: 'CCA011', amount: 58 },
      { id: 'bl2', tkqcId: '917238142...', last4: '4482', reference: 'CCA022', amount: 44 },
      { id: 'bl3', tkqcId: '917238142...', last4: '4482', reference: 'CCA033', amount: 31 },
      { id: 'bl4', tkqcId: '917238142...', last4: '4482', reference: 'CCA044', amount: 72 },
      { id: 'bl5', tkqcId: '917238142...', last4: '4482', reference: 'CCA055', amount: 38 },
      { id: 'bl6', tkqcId: '917238142...', last4: '4482', reference: 'CCA066', amount: 26 },
      { id: 'bl7', tkqcId: '917238142...', last4: '4482', reference: 'CCA077', amount: 49 },
      { id: 'bl8', tkqcId: '917238142...', last4: '4482', reference: 'CCA088', amount: 33 },
      { id: 'bl9', tkqcId: '917238142...', last4: '4482', reference: 'CCA099', amount: 22 },
      { id: 'bl10', tkqcId: '917238142...', last4: '4482', reference: 'CCA100', amount: 18 },
      { id: 'bl11', tkqcId: '917238142...', last4: '4482', reference: 'CCA111', amount: 17 },
      { id: 'bl12', tkqcId: '917238142...', last4: '4482', reference: 'CCA122', amount: 12 },
    ],
  },
  // Ngân – Scenario from sv1
  {
    id: 'exp2', caseId: 'mb8', cs: 'Ngân', team: 'Team Linh', sessionDate: '2026-08-09',
    bills: 8, totalAmount: 294,
    reasons: ['no_share', 'other'],
    otherReason: 'Tài khoản quảng cáo bị khoá không thể truy cập Bill',
    submittedAt: '10/08/2026 13:15', waitingDuration: '45 phút',
    evidenceImages: [
      { id: 'ei4', name: 'screenshot_khoa_acc.png', uploadedAt: '10/08 13:10', colorBg: '#FEF3C7' },
      { id: 'ei5', name: 'screenshot_error.png', uploadedAt: '10/08 13:12', colorBg: '#DBEAFE' },
    ],
    billList: [
      { id: 'bl21', tkqcId: '449182047...', last4: '5519', reference: 'DDF011', amount: 62 },
      { id: 'bl22', tkqcId: '449182047...', last4: '5519', reference: 'DDF022', amount: 88 },
      { id: 'bl23', tkqcId: '449182047...', last4: '5519', reference: 'DDF033', amount: 44 },
      { id: 'bl24', tkqcId: '449182047...', last4: '5519', reference: 'DDF044', amount: 37 },
      { id: 'bl25', tkqcId: '449182047...', last4: '5519', reference: 'DDF055', amount: 28 },
      { id: 'bl26', tkqcId: '449182047...', last4: '5519', reference: 'DDF066', amount: 15 },
      { id: 'bl27', tkqcId: '449182047...', last4: '5519', reference: 'DDF077', amount: 11 },
      { id: 'bl28', tkqcId: '449182047...', last4: '5519', reference: 'DDF088', amount: 9 },
    ],
  },
]

export const fbSurplusBills: FbSurplusBill[] = [
  { id: 'fbs1', fbDate: '08/08', cs: 'Mạnh', team: 'Team Dũng', tkqcId: '238472918...', reference: 'ABX782', last4: '8821', amount: 126, uploadedAt: '10/08 14:22', uploadSource: 'Bổ sung Bill thiếu', billId: 'FB-2026-08081201', sourceFile: 'fb_bill_sup_manh.csv', relatedSession: 'sv2' },
  { id: 'fbs2', fbDate: '08/08', cs: 'Huyền', team: 'Team Linh', tkqcId: '562841290...', reference: 'BBQ901', last4: '7744', amount: 88, uploadedAt: '10/08 10:05', uploadSource: 'Bổ sung Bill thiếu', billId: 'FB-2026-08080901', sourceFile: 'fb_bill_sup_huyen.csv', relatedSession: 'sv2' },
  { id: 'fbs3', fbDate: '08/08', cs: 'Nam', team: 'Team Linh', tkqcId: '917238142...', reference: 'CCA199', last4: '4482', amount: 55, uploadedAt: '09/08 22:15', uploadSource: 'Upload thông thường', billId: 'FB-2026-08081301', sourceFile: 'fb_bills_0808.csv', relatedSession: 'sv2' },
  { id: 'fbs4', fbDate: '08/08', cs: 'Trang', team: 'Team Dũng', tkqcId: '238472918...', reference: 'IIX441', last4: '2219', amount: 210, uploadedAt: '10/08 15:10', uploadSource: 'Bổ sung Bill thiếu', billId: 'FB-2026-08081401', sourceFile: 'fb_bill_sup_trang.csv', relatedSession: 'sv2' },
  { id: 'fbs5', fbDate: '09/08', cs: 'Lan', team: 'Team Anh', tkqcId: '781920304...', reference: 'EEX112', last4: '6691', amount: 74, uploadedAt: '10/08 09:40', uploadSource: 'Bổ sung Bill thiếu', billId: 'FB-2026-09090901', sourceFile: 'fb_bill_sup_lan.csv', relatedSession: 'sv1' },
  { id: 'fbs6', fbDate: '09/08', cs: 'Hùng', team: 'Team Dũng', tkqcId: '238472918...', reference: 'FFF229', last4: '8821', amount: 164, uploadedAt: '10/08 11:20', uploadSource: 'Upload thông thường', billId: 'FB-2026-09090201', sourceFile: 'fb_bills_0809.csv', relatedSession: 'sv1' },
  { id: 'fbs7', fbDate: '08/08', cs: 'Long', team: 'Team Growth', tkqcId: '917238142...', reference: 'GGX772', last4: '9901', amount: 340, uploadedAt: '09/08 18:30', uploadSource: 'Upload thông thường', billId: 'FB-2026-08081501', sourceFile: 'fb_bills_0808.csv', relatedSession: 'sv2' },
  { id: 'fbs8', fbDate: '08/08', cs: 'Diệp', team: 'Team Growth', tkqcId: '917238142...', reference: 'HHX884', last4: '3344', amount: 92, uploadedAt: '09/08 20:45', uploadSource: 'Bổ sung Bill thiếu', billId: 'FB-2026-08081601', sourceFile: 'fb_bill_sup_diep.csv', relatedSession: 'sv2' },
  { id: 'fbs9', fbDate: '09/08', cs: 'Mai', team: 'Team Scale', tkqcId: '562841290...', reference: 'IIX995', last4: '7762', amount: 148, uploadedAt: '10/08 07:55', uploadSource: 'Upload thông thường', billId: 'FB-2026-09090301', sourceFile: 'fb_bills_0809.csv', relatedSession: 'sv1' },
  { id: 'fbs10', fbDate: '08/08', cs: 'Khoa', team: 'Team Scale', tkqcId: '562841290...', reference: 'JJX116', last4: '7762', amount: 129, uploadedAt: '09/08 16:00', uploadSource: 'Upload thông thường', billId: 'FB-2026-08081701', sourceFile: 'fb_bills_0808.csv', relatedSession: 'sv2' },
]
