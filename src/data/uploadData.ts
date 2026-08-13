/**
 * uploadData.ts — Upload history for Bank Bill upload module.
 * Linked to sessionsV2 via sessionId/sessionDate.
 */

export interface UploadTabResult {
  tabName: string
  format: 'Bank cũ' | 'Bank mới'
  read: number
  valid: number
  error: number
  duplicate: number
  wrongDate: number
}

export interface RefConflictRecord {
  reference: string
  records: {
    txId: string
    date: string
    time: string
    description: string
    last4: string
    card: string
    cardGroup: string
    amount: number
    currency: string
    status: string
    sourceTab: string
    diffFields: string[]
  }[]
}

export interface UploadHistoryRecord {
  id: string
  sessionId: string
  sessionDate: string
  filename: string
  uploadedBy: string
  uploadedByName: string
  timestamp: string
  tabs: UploadTabResult[]
  totalRead: number
  totalImported: number
  totalError: number
  totalDuplicate: number
  totalWrongDate: number
  totalExisting: number
  totalRefConflict: number
  status: 'success' | 'partial' | 'failed'
  importedTransactionIds: string[]
  refConflicts: RefConflictRecord[]
}

export const uploadHistory: UploadHistoryRecord[] = [
  // 1. Upload hoàn toàn hợp lệ — 12/08
  {
    id: 'UPL-001',
    sessionId: 'SES-20260812',
    sessionDate: '2026-08-12',
    filename: 'bank_txn_20260812.xlsx',
    uploadedBy: 'USR-KT1',
    uploadedByName: 'Kế toán',
    timestamp: '2026-08-12 11:02',
    tabs: [
      { tabName: 'TN1 - Bank cũ', format: 'Bank cũ', read: 320, valid: 315, error: 2, duplicate: 3, wrongDate: 0 },
      { tabName: 'TN2 - Bank cũ', format: 'Bank cũ', read: 310, valid: 308, error: 1, duplicate: 1, wrongDate: 0 },
      { tabName: 'TN1 - Bank mới', format: 'Bank mới', read: 340, valid: 337, error: 1, duplicate: 2, wrongDate: 0 },
      { tabName: 'TN2 - Bank mới', format: 'Bank mới', read: 316, valid: 316, error: 0, duplicate: 0, wrongDate: 0 },
    ],
    totalRead: 1286,
    totalImported: 1276,
    totalError: 4,
    totalDuplicate: 6,
    totalWrongDate: 0,
    totalExisting: 0,
    totalRefConflict: 0,
    status: 'success',
    importedTransactionIds: [],
    refConflicts: [],
  },
  // 2. Upload có row sai ngày — 11/08
  {
    id: 'UPL-002',
    sessionId: 'SES-20260811',
    sessionDate: '2026-08-11',
    filename: 'bank_txn_20260811.xlsx',
    uploadedBy: 'USR-KT1',
    uploadedByName: 'Kế toán',
    timestamp: '2026-08-11 09:01',
    tabs: [
      { tabName: 'TN1 - Bank cũ', format: 'Bank cũ', read: 310, valid: 300, error: 3, duplicate: 2, wrongDate: 5 },
      { tabName: 'TN2 - Bank cũ', format: 'Bank cũ', read: 298, valid: 287, error: 4, duplicate: 2, wrongDate: 5 },
      { tabName: 'TN1 - Bank mới', format: 'Bank mới', read: 330, valid: 320, error: 2, duplicate: 3, wrongDate: 5 },
      { tabName: 'TN2 - Bank mới', format: 'Bank mới', read: 318, valid: 313, error: 0, duplicate: 0, wrongDate: 5 },
    ],
    totalRead: 1256,
    totalImported: 1220,
    totalError: 9,
    totalDuplicate: 7,
    totalWrongDate: 20,
    totalExisting: 0,
    totalRefConflict: 0,
    status: 'partial',
    importedTransactionIds: [],
    refConflicts: [],
  },
  // 3. Upload có duplicate và Ref conflict — 10/08
  {
    id: 'UPL-003',
    sessionId: 'SES-20260810',
    sessionDate: '2026-08-10',
    filename: 'bank_0810_v2.xlsx',
    uploadedBy: 'USR-000',
    uploadedByName: 'Admin',
    timestamp: '2026-08-10 08:58',
    tabs: [
      { tabName: 'TN1 - Bank cũ', format: 'Bank cũ', read: 320, valid: 310, error: 3, duplicate: 5, wrongDate: 2 },
      { tabName: 'TN2 - Bank cũ', format: 'Bank cũ', read: 310, valid: 300, error: 4, duplicate: 4, wrongDate: 2 },
      { tabName: 'TN1 - Bank mới', format: 'Bank mới', read: 340, valid: 325, error: 6, duplicate: 7, wrongDate: 2 },
      { tabName: 'TN2 - Bank mới', format: 'Bank mới', read: 316, valid: 303, error: 4, duplicate: 6, wrongDate: 3 },
    ],
    totalRead: 1286,
    totalImported: 1238,
    totalError: 17,
    totalDuplicate: 8,
    totalWrongDate: 9,
    totalExisting: 0,
    totalRefConflict: 3,
    status: 'partial',
    importedTransactionIds: [],
    refConflicts: [
      {
        reference: 'ABC123',
        records: [
          { txId: 'TX-00441', date: '2026-08-10', time: '08:22:14', description: 'FACEBOOK IRELAND LTD', last4: '8821', card: 'Visa Platinum 8821', cardGroup: 'TN1', amount: 100, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN1 - Bank cũ', diffFields: ['amount'] },
          { txId: 'TX-00442', date: '2026-08-10', time: '08:22:14', description: 'FACEBOOK IRELAND LTD', last4: '8821', card: 'Visa Platinum 8821', cardGroup: 'TN1', amount: 120, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN2 - Bank cũ', diffFields: ['amount'] },
        ],
      },
      {
        reference: 'XYZ789',
        records: [
          { txId: 'TX-00551', date: '2026-08-10', time: '09:11:00', description: 'META PLATFORMS', last4: '4491', card: 'Mastercard 4491', cardGroup: 'TN2', amount: 250, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN1 - Bank mới', diffFields: ['description'] },
          { txId: 'TX-00552', date: '2026-08-10', time: '09:11:00', description: 'META PLATFORMS INC.', last4: '4491', card: 'Mastercard 4491', cardGroup: 'TN2', amount: 250, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN2 - Bank mới', diffFields: ['description'] },
        ],
      },
      {
        reference: 'DEF456',
        records: [
          { txId: 'TX-00661', date: '2026-08-10', time: '10:05:32', description: 'FACEBOOK ADS', last4: '2231', card: 'Visa Classic 2231', cardGroup: 'TN1', amount: 75.5, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN1 - Bank cũ', diffFields: ['amount', 'card'] },
          { txId: 'TX-00662', date: '2026-08-10', time: '10:05:32', description: 'FACEBOOK ADS', last4: '2231', card: 'Visa Business 2231', cardGroup: 'TN1', amount: 80, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN1 - Bank mới', diffFields: ['amount', 'card'] },
        ],
      },
    ],
  },
  // 4. Upload lại file đã tồn tại — 09/08
  {
    id: 'UPL-004',
    sessionId: 'SES-20260809',
    sessionDate: '2026-08-09',
    filename: 'bank_0809_retry.xlsx',
    uploadedBy: 'USR-KT1',
    uploadedByName: 'Kế toán',
    timestamp: '2026-08-09 14:30',
    tabs: [
      { tabName: 'TN1 - Bank cũ', format: 'Bank cũ', read: 300, valid: 295, error: 2, duplicate: 3, wrongDate: 0 },
      { tabName: 'TN2 - Bank cũ', format: 'Bank cũ', read: 305, valid: 300, error: 3, duplicate: 2, wrongDate: 0 },
      { tabName: 'TN1 - Bank mới', format: 'Bank mới', read: 310, valid: 304, error: 4, duplicate: 2, wrongDate: 0 },
      { tabName: 'TN2 - Bank mới', format: 'Bank mới', read: 295, valid: 289, error: 1, duplicate: 5, wrongDate: 0 },
    ],
    totalRead: 1210,
    totalImported: 0,
    totalError: 10,
    totalDuplicate: 12,
    totalWrongDate: 0,
    totalExisting: 1188,
    totalRefConflict: 0,
    status: 'partial',
    importedTransactionIds: [],
    refConflicts: [],
  },
  // 5. Upload thành công một phần — 08/08
  {
    id: 'UPL-005',
    sessionId: 'SES-20260808',
    sessionDate: '2026-08-08',
    filename: 'bank_0808.xlsx',
    uploadedBy: 'USR-000',
    uploadedByName: 'Admin',
    timestamp: '2026-08-08 08:15',
    tabs: [
      { tabName: 'TN1 - Bank cũ', format: 'Bank cũ', read: 320, valid: 315, error: 3, duplicate: 2, wrongDate: 0 },
      { tabName: 'TN2 - Bank cũ', format: 'Bank cũ', read: 310, valid: 304, error: 4, duplicate: 2, wrongDate: 0 },
      { tabName: 'TN1 - Bank mới', format: 'Bank mới', read: 340, valid: 330, error: 6, duplicate: 4, wrongDate: 0 },
      { tabName: 'TN2 - Bank mới', format: 'Bank mới', read: 316, valid: 292, error: 4, duplicate: 0, wrongDate: 20 },
    ],
    totalRead: 1286,
    totalImported: 1241,
    totalError: 17,
    totalDuplicate: 8,
    totalWrongDate: 20,
    totalExisting: 5,
    totalRefConflict: 3,
    status: 'partial',
    importedTransactionIds: [],
    refConflicts: [
      {
        reference: 'MNO111',
        records: [
          { txId: 'TX-00771', date: '2026-08-08', time: '07:10:00', description: 'FACEBOOK IRELAND', last4: '9921', card: 'Visa 9921', cardGroup: 'TN2', amount: 500, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN1 - Bank cũ', diffFields: ['amount'] },
          { txId: 'TX-00772', date: '2026-08-08', time: '07:10:00', description: 'FACEBOOK IRELAND', last4: '9921', card: 'Visa 9921', cardGroup: 'TN2', amount: 520, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN2 - Bank mới', diffFields: ['amount'] },
        ],
      },
      {
        reference: 'PQR222',
        records: [
          { txId: 'TX-00881', date: '2026-08-08', time: '08:30:00', description: 'META ADS', last4: '3311', card: 'MC 3311', cardGroup: 'TN1', amount: 180, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN1 - Bank mới', diffFields: ['description'] },
          { txId: 'TX-00882', date: '2026-08-08', time: '08:30:00', description: 'META ADVERTISING', last4: '3311', card: 'MC 3311', cardGroup: 'TN1', amount: 180, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN2 - Bank cũ', diffFields: ['description'] },
        ],
      },
      {
        reference: 'STU333',
        records: [
          { txId: 'TX-00991', date: '2026-08-08', time: '09:00:00', description: 'FACEBOOK', last4: '7741', card: 'Visa 7741', cardGroup: 'TN2', amount: 90, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN2 - Bank cũ', diffFields: ['amount'] },
          { txId: 'TX-00992', date: '2026-08-08', time: '09:00:00', description: 'FACEBOOK', last4: '7741', card: 'Visa 7741', cardGroup: 'TN2', amount: 95, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN1 - Bank mới', diffFields: ['amount'] },
        ],
      },
    ],
  },
]

// Simulated invalid records (errors)
export interface InvalidRecord {
  tab: string
  row: number
  date: string
  reference: string
  last4: string
  amount: string
  reason: string
}

export function generateInvalidRecords(sessionDate: string): InvalidRecord[] {
  const d = sessionDate
  const prevDate = d.slice(0, 8) + String(parseInt(d.slice(8)) - 1).padStart(2, '0')
  const fmtPrev = prevDate.slice(8) + '/' + prevDate.slice(5, 7) + '/' + prevDate.slice(0, 4)
  return [
    { tab: 'TN1 - Bank cũ', row: 128, date: fmtPrev, reference: 'ABC' + d.replace(/-/g, '').slice(4), last4: '8821', amount: '$120.00', reason: 'Ngày giao dịch không khớp ngày phiên' },
    { tab: 'TN1 - Bank cũ', row: 204, date: fmtPrev, reference: 'DEF' + d.replace(/-/g, '').slice(4), last4: '4491', amount: '$75.00', reason: 'Ngày giao dịch không khớp ngày phiên' },
    { tab: 'TN2 - Bank cũ', row: 88, date: '', reference: '', last4: '—', amount: '—', reason: 'Thiếu trường bắt buộc: Reference, Last4' },
    { tab: 'TN2 - Bank cũ', row: 141, date: fmtPrev, reference: 'XYZ' + d.replace(/-/g, '').slice(4), last4: '2231', amount: '$200.00', reason: 'Ngày giao dịch không khớp ngày phiên' },
    { tab: 'TN2 - Bank cũ', row: 199, date: '', reference: 'NULL', last4: '—', amount: '$0.00', reason: 'Amount không hợp lệ (0 hoặc âm)' },
    { tab: 'TN1 - Bank mới', row: 55, date: fmtPrev, reference: 'MNO' + d.replace(/-/g, '').slice(4), last4: '9921', amount: '$500.00', reason: 'Ngày giao dịch không khớp ngày phiên' },
    { tab: 'TN1 - Bank mới', row: 212, date: fmtPrev, reference: 'PQR' + d.replace(/-/g, '').slice(4), last4: '3311', amount: '$180.00', reason: 'Ngày giao dịch không khớp ngày phiên' },
    { tab: 'TN1 - Bank mới', row: 309, date: '', reference: '', last4: '7741', amount: '—', reason: 'Thiếu trường bắt buộc: Date, Reference' },
    { tab: 'TN2 - Bank mới', row: 66, date: fmtPrev, reference: 'STU' + d.replace(/-/g, '').slice(4), last4: '5512', amount: '$90.00', reason: 'Ngày giao dịch không khớp ngày phiên' },
    { tab: 'TN2 - Bank mới', row: 102, date: '', reference: 'ERR_002', last4: '—', amount: '$45.00', reason: 'Không nhận diện được format tài khoản' },
  ]
}
