/**
 * sharedData.ts — Single source of truth for AezCheck Accounting demo data.
 * All modules derive their display data from this file.
 * Generator is deterministic (seeded RNG) — data is stable across reloads.
 */

import type {
  SessionV2, SessionStatusV2, ReconciledPair, ExceptionRecord,
  BankUnreconciledRecord, FbUnreconciledRecord, AuditEntry,
  DashboardSession, CsAttentionItem, MissingBillCase, MissingBillRecord,
  MissingBillLastActionKind, ExplanationCase, FbSurplusBill, EvidenceImage,
} from './mock'

// ── Seeded xorshift32 RNG ────────────────────────────────────────────────────

class RNG {
  private s: number
  constructor(seed: number) { this.s = seed >>> 0 || 1 }
  next(): number {
    this.s ^= this.s << 13; this.s ^= this.s >>> 17; this.s ^= this.s << 5
    return (this.s >>> 0) / 0x100000000
  }
  int(lo: number, hi: number) { return lo + Math.floor(this.next() * (hi - lo + 1)) }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)] }
  amt(lo: number, hi: number) { return Math.round((lo + this.next() * (hi - lo)) * 100) / 100 }
  ref(prefix?: string) {
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const s = (prefix || '') + L[this.int(0, 25)] + L[this.int(0, 25)] + L[this.int(0, 25)] + this.int(100, 999)
    return s
  }
  pad(n: number, w: number) { return String(n).padStart(w, '0') }
}

// ── Master Data ──────────────────────────────────────────────────────────────

export interface SharedUser {
  user_id: string; full_name: string; role: 'Admin' | 'Kế toán' | 'Leader' | 'CS'
  team_id: string; telegram_id: string
}
export interface SharedTeam {
  team_id: string; team_name: string; leader_user_id: string; member_user_ids: string[]
}

export const sharedUsers: SharedUser[] = [
  { user_id: 'USR-000', full_name: 'Admin', role: 'Admin', team_id: '', telegram_id: '@admin_aez' },
  { user_id: 'USR-KT1', full_name: 'Kế toán', role: 'Kế toán', team_id: '', telegram_id: '@ketoan_aez' },
  { user_id: 'USR-001', full_name: 'Dũng', role: 'Leader', team_id: 'TEAM-001', telegram_id: '@dung_alpha' },
  { user_id: 'USR-002', full_name: 'Mạnh', role: 'CS', team_id: 'TEAM-001', telegram_id: '@manh_cs' },
  { user_id: 'USR-003', full_name: 'Huyền', role: 'CS', team_id: 'TEAM-001', telegram_id: '@huyen_cs' },
  { user_id: 'USR-004', full_name: 'Nam', role: 'CS', team_id: 'TEAM-001', telegram_id: '@nam_cs' },
  { user_id: 'USR-005', full_name: 'Trang', role: 'CS', team_id: 'TEAM-001', telegram_id: '@trang_cs' },
  { user_id: 'USR-006', full_name: 'Linh', role: 'CS', team_id: 'TEAM-001', telegram_id: '@linh_cs' },
  { user_id: 'USR-007', full_name: 'Hùng', role: 'Leader', team_id: 'TEAM-002', telegram_id: '@hung_beta' },
  { user_id: 'USR-008', full_name: 'Mai', role: 'CS', team_id: 'TEAM-002', telegram_id: '@mai_cs' },
  { user_id: 'USR-009', full_name: 'Đức', role: 'CS', team_id: 'TEAM-002', telegram_id: '@duc_cs' },
  { user_id: 'USR-010', full_name: 'Phương', role: 'CS', team_id: 'TEAM-002', telegram_id: '@phuong_cs' },
  { user_id: 'USR-011', full_name: 'Tuấn', role: 'CS', team_id: 'TEAM-002', telegram_id: '@tuan_cs' },
  { user_id: 'USR-012', full_name: 'Quân', role: 'Leader', team_id: 'TEAM-003', telegram_id: '@quan_gamma' },
  { user_id: 'USR-013', full_name: 'Thảo', role: 'CS', team_id: 'TEAM-003', telegram_id: '@thao_cs' },
  { user_id: 'USR-014', full_name: 'Long', role: 'CS', team_id: 'TEAM-003', telegram_id: '@long_cs' },
  { user_id: 'USR-015', full_name: 'Hà', role: 'CS', team_id: 'TEAM-003', telegram_id: '@ha_cs' },
  { user_id: 'USR-016', full_name: 'Minh', role: 'CS', team_id: 'TEAM-003', telegram_id: '@minh_cs' },
]

export const sharedTeams: SharedTeam[] = [
  { team_id: 'TEAM-001', team_name: 'Team Alpha', leader_user_id: 'USR-001', member_user_ids: ['USR-002','USR-003','USR-004','USR-005','USR-006'] },
  { team_id: 'TEAM-002', team_name: 'Team Beta', leader_user_id: 'USR-007', member_user_ids: ['USR-008','USR-009','USR-010','USR-011'] },
  { team_id: 'TEAM-003', team_name: 'Team Gamma', leader_user_id: 'USR-012', member_user_ids: ['USR-013','USR-014','USR-015','USR-016'] },
]

export const userById = Object.fromEntries(sharedUsers.map(u => [u.user_id, u]))
export const teamById = Object.fromEntries(sharedTeams.map(t => [t.team_id, t]))
export const csUsersList = sharedUsers.filter(u => u.role === 'CS')

// TKQC per user (truncated display ID). Leaders (USR-001/007/012) get their
// own TKQC too — a Leader is also a CS for their own ownership (see the
// "Leader business-data participation" block below), never a separate
// leader-only dataset.
const USER_TKQC: Record<string, string> = {
  'USR-001': '384756219...', 'USR-002': '238472918...', 'USR-003': '562841290...', 'USR-004': '917238142...',
  'USR-005': '349182047...', 'USR-006': '781920304...', 'USR-007': '827364510...', 'USR-008': '449182803...',
  'USR-009': '618204791...', 'USR-010': '829104812...', 'USR-011': '192837465...', 'USR-012': '739461820...',
  'USR-013': '449182047...', 'USR-014': '917384920...', 'USR-015': '281904723...',
  'USR-016': '562718302...',
}

// Exported TKQC-per-user lookup — Module 2's "TKQC cần tìm Bill" section reads
// this directly instead of re-deriving ownership (current dataset models one
// TKQC per user; see domain/bankBills.ts for the session-date-ownership note).
export const tkqcByUser: Record<string, string> = USER_TKQC

// Cards per user (last4)
const USER_CARDS: Record<string, string[]> = {
  'USR-001': ['6602','1145'], 'USR-002': ['8821','4312'], 'USR-003': ['7744','9201'], 'USR-004': ['4482','6615'],
  'USR-005': ['2219','8834'], 'USR-006': ['5501','3389'], 'USR-007': ['4470','8823'], 'USR-008': ['7762','4421'],
  'USR-009': ['6634','8819'], 'USR-010': ['3312','7703'], 'USR-011': ['9918','4400'], 'USR-012': ['5588','2210'],
  'USR-013': ['5519','2201'], 'USR-014': ['3344','7722'], 'USR-015': ['6691','9900'],
  'USR-016': ['4433','8811'],
}

// ── Session date range (30 days) ─────────────────────────────────────────────

function subtractDays(base: string, n: number): string {
  const d = new Date(base); d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const TODAY = '2026-08-13'
const SESSION_DATES = Array.from({ length: 30 }, (_, i) => subtractDays(TODAY, i))
// [0]='2026-08-13' active, [1]='2026-08-12' active, [4]='2026-08-09' sv1, [5]='2026-08-08' sv2, etc.

function sessionStatus(date: string): SessionStatusV2 {
  if (date >= '2026-08-12') return 'active'
  if (date === '2026-08-11') return 'closing_soon'
  if (date === '2026-08-10') return 'closing_soon'
  if (date === '2026-08-09') return 'active'      // sv1
  if (date === '2026-08-08') return 'closing_soon' // sv2
  if (date === '2026-08-07') return 'closed'       // sv3
  if (date === '2026-08-06') return 'closed_pending' // sv4
  // older: alternate closed/closed_pending
  const idx = SESSION_DATES.indexOf(date)
  return idx % 5 === 0 ? 'closed_pending' : 'closed'
}

const SID = (date: string): string => {
  if (date === '2026-08-09') return 'sv1'
  if (date === '2026-08-08') return 'sv2'
  if (date === '2026-08-07') return 'sv3'
  if (date === '2026-08-06') return 'sv4'
  return `s${date.replace(/-/g, '')}`
}

const fmtDisp = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`
const uploadedAt = (date: string, h = 7) => `${fmtDisp(subtractDays(date, -1))} ${h.toString().padStart(2,'0')}:10`
const bankFile = (date: string) => `bank_txn_${date.replace(/-/g,'')}.xlsx`
const fbFile = (date: string) => `fb_bills_${date.slice(5,7)}${date.slice(8,10)}.csv`

// ── Internal transaction type ────────────────────────────────────────────────

interface Txn {
  id: string; sid: string; date: string; disp: string
  uid: string; team: string; name: string; tkqc: string
  ref: string; last4: string; amt: number
  kind: 'matched' | 'unreconciled' | 'exception' | 'exp_approved'
  fbBillId?: string; fbAmt?: number
}

// ── Main generator (runs once at module load) ────────────────────────────────

const _generated = (() => {
  const rng = new RNG(31415)  // fixed seed
  let bankSeq = 0, fbSeq = 0, auditSeq = 0

  const txns: Txn[] = []

  function makeTxn(date: string, uid: string, kind: Txn['kind'], amt?: number, ref?: string, last4?: string): Txn {
    const u = userById[uid]
    const l4 = last4 || rng.pick(USER_CARDS[uid] || ['0000'])
    const a = amt ?? rng.amt(22, 620)
    const r = ref || rng.ref()
    return {
      id: `BANK-TXN-${rng.pad(++bankSeq, 6)}`,
      sid: SID(date), date, disp: fmtDisp(date),
      uid, team: teamById[u.team_id].team_name, name: u.full_name,
      tkqc: USER_TKQC[uid] || '000000000...',
      ref: r, last4: l4, amt: a, kind,
      fbBillId: (kind === 'matched' || kind === 'exception')
        ? `FB-BILL-${rng.pad(++fbSeq, 6)}` : undefined,
      fbAmt: kind === 'exception' ? Math.round((a - rng.amt(2, 18)) * 100) / 100 : undefined,
    }
  }

  // ── SESSION 2026-08-08 (sv2) — Fixed demo scenarios ────────────────────────

  // Mạnh: 20 matched (supplemented) + 15 unreconciled
  for (let i = 0; i < 20; i++) txns.push(makeTxn('2026-08-08', 'USR-002', 'matched', rng.amt(30, 110), undefined, rng.pick(['8821','8821','8821','4312'])))
  for (let i = 0; i < 15; i++) txns.push(makeTxn('2026-08-08', 'USR-002', 'unreconciled', rng.amt(18, 200), undefined, rng.pick(['8821','4312'])))

  // Huyền: 18 unreconciled
  for (let i = 0; i < 18; i++) txns.push(makeTxn('2026-08-08', 'USR-003', 'unreconciled', rng.amt(20, 150), undefined, rng.pick(['7744','9201'])))

  // Nam: 12 unreconciled (pending explanation)
  for (let i = 0; i < 12; i++) txns.push(makeTxn('2026-08-08', 'USR-004', 'unreconciled', rng.amt(15, 90), undefined, rng.pick(['4482','6615'])))

  // Trang: 10 unreconciled (rejected explanation history)
  for (let i = 0; i < 10; i++) txns.push(makeTxn('2026-08-08', 'USR-005', 'unreconciled', rng.amt(20, 100), undefined, rng.pick(['2219','8834'])))

  // Linh + Team Beta + Team Gamma on sv2: matched
  for (const uid of ['USR-006','USR-008','USR-009','USR-010','USR-011','USR-013','USR-014','USR-015','USR-016']) {
    for (let i = 0; i < rng.int(4, 8); i++) txns.push(makeTxn('2026-08-08', uid, 'matched', rng.amt(25, 550)))
  }
  // 3 exceptions on sv2
  txns.push(makeTxn('2026-08-08', 'USR-014', 'exception', 340))
  txns.push(makeTxn('2026-08-08', 'USR-009', 'exception', 520))
  txns.push(makeTxn('2026-08-08', 'USR-006', 'exception', 185))

  // ── MINH quá hạn scenario: use sv4 (2026-08-06, closed_pending) ────────────
  for (let i = 0; i < 8; i++) txns.push(makeTxn('2026-08-06', 'USR-016', 'unreconciled', rng.amt(25, 120)))

  // ── All other sessions: distribute across CS ────────────────────────────────
  for (const date of SESSION_DATES) {
    if (date === '2026-08-08') continue  // handled above
    for (const u of csUsersList) {
      // skip Minh on sv4 — already handled above
      if (date === '2026-08-06' && u.user_id === 'USR-016') continue
      const count = rng.int(3, 9)
      for (let i = 0; i < count; i++) {
        const roll = rng.next()
        const kind: Txn['kind'] = roll < 0.85 ? 'matched' : roll < 0.91 ? 'unreconciled' : roll < 0.96 ? 'exception' : 'exp_approved'
        txns.push(makeTxn(date, u.user_id, kind, rng.amt(20, 750)))
      }
    }
  }

  // ── FB surplus bills (80 records, unmatched) ────────────────────────────────
  const surplusCS = ['USR-002','USR-003','USR-004','USR-005','USR-008','USR-009','USR-013','USR-014','USR-016']
  const surplusBills: FbSurplusBill[] = []
  for (let i = 0; i < 80; i++) {
    const uid = rng.pick(surplusCS)
    const u = userById[uid]
    const date = rng.pick(SESSION_DATES.slice(0, 12))
    const l4 = rng.pick(USER_CARDS[uid] || ['0000'])
    surplusBills.push({
      id: `FB-BILL-${rng.pad(++fbSeq, 6)}`,
      fbDate: fmtDisp(date),
      cs: u.full_name, team: teamById[u.team_id].team_name,
      tkqcId: USER_TKQC[uid] || '000000000...',
      reference: rng.ref(),
      last4: l4,
      amount: rng.amt(30, 380),
      uploadedAt: `${fmtDisp(subtractDays(date, -1))} ${rng.int(8, 22).toString().padStart(2,'0')}:${rng.int(0, 59).toString().padStart(2,'0')}`,
      uploadSource: rng.next() < 0.6 ? 'Bổ sung Bill thiếu' : 'Upload thông thường',
      billId: `FB-BILL-${rng.pad(fbSeq, 6)}`,
      sourceFile: fbFile(date),
      relatedSession: SID(date),
    })
  }

  // ── Explanation cases ────────────────────────────────────────────────────────
  const expCases: ExplanationCase[] = []
  const evidenceColors = ['#E0E7FF','#FCE7F3','#D1FAE5','#FEF3C7','#DBEAFE','#F0FDF4']

  function makeEvidence(count: number, prefix: string): EvidenceImage[] {
    return Array.from({ length: count }, (_, ei) => ({
      id: `ev-${prefix}-${ei}`,
      name: `chung_minh_${rng.pad(ei + 1, 2)}.jpg`,
      uploadedAt: `10/08 ${rng.int(8,12).toString().padStart(2,'0')}:${rng.int(0,59).toString().padStart(2,'0')}`,
      colorBg: evidenceColors[ei % evidenceColors.length],
    }))
  }

  // Fixed: Nam's pending explanation (sv2)
  const namTxns = txns.filter(t => t.date === '2026-08-08' && t.uid === 'USR-004')
  const namTotal = Math.round(namTxns.reduce((s, t) => s + t.amt, 0) * 100) / 100
  expCases.push({
    id: 'EXPLANATION-000001', caseId: 'mb3', cs: 'Nam', team: 'Team Alpha',
    sessionDate: '2026-08-08', bills: 12, totalAmount: namTotal,
    reasons: ['acc_die', 'back'],
    submittedAt: '10/08/2026 09:42', waitingDuration: '2 giờ 15 phút', status: 'pending' as const,
    evidenceImages: makeEvidence(3, 'nam'),
    billList: namTxns.map((t, i) => ({ id: `bl-n-${i}`, tkqcId: t.tkqc, last4: t.last4, reference: t.ref, amount: t.amt })),
  } as unknown as ExplanationCase)

  // Fixed: Trang's rejected explanation (sv2)
  const trangTxns = txns.filter(t => t.date === '2026-08-08' && t.uid === 'USR-005')
  expCases.push({
    id: 'EXPLANATION-000002', caseId: 'mb4', cs: 'Trang', team: 'Team Alpha',
    sessionDate: '2026-08-08',
    bills: trangTxns.length,
    totalAmount: Math.round(trangTxns.reduce((s, t) => s + t.amt, 0) * 100) / 100,
    reasons: ['back'],
    submittedAt: '10/08/2026 13:00', waitingDuration: '—', status: 'rejected' as const,
    evidenceImages: makeEvidence(1, 'trang'),
    billList: trangTxns.map((t, i) => ({ id: `bl-t-${i}`, tkqcId: t.tkqc, last4: t.last4, reference: t.ref, amount: t.amt })),
  } as unknown as ExplanationCase)

  // Historical explanations (older sessions)
  const histCS = ['USR-003','USR-006','USR-008','USR-011','USR-013','USR-015']
  let expSeqN = 3
  for (const date of SESSION_DATES.slice(7, 22)) {
    for (const uid of histCS.slice(0, rng.int(1, 3))) {
      const unrec = txns.filter(t => t.date === date && t.uid === uid && t.kind === 'unreconciled')
      if (unrec.length < 2) continue
      const subset = unrec.slice(0, rng.int(2, Math.min(6, unrec.length)))
      const roll = rng.next()
      const status = roll < 0.5 ? 'accepted' : roll < 0.75 ? 'rejected' : 'pending'
      const u = userById[uid]
      expCases.push({
        id: `EXPLANATION-${rng.pad(expSeqN++, 6)}`,
        caseId: `mb-hist-${date}-${uid}`,
        cs: u.full_name, team: teamById[u.team_id].team_name,
        sessionDate: date, bills: subset.length,
        totalAmount: Math.round(subset.reduce((s, t) => s + t.amt, 0) * 100) / 100,
        reasons: rng.next() < 0.5 ? ['acc_die'] : rng.next() < 0.5 ? ['acc_die','back'] : ['no_share'],
        submittedAt: `${fmtDisp(subtractDays(date, -2))} ${rng.int(8,20).toString().padStart(2,'0')}:30`,
        waitingDuration: status === 'pending' ? `${rng.int(1,8)} giờ` : '—',
        status: status as 'pending' | 'accepted' | 'rejected',
        evidenceImages: makeEvidence(rng.int(1, 3), `h${expSeqN}`),
        billList: subset.map((t, i) => ({ id: `bl-h-${expSeqN}-${i}`, tkqcId: t.tkqc, last4: t.last4, reference: t.ref, amount: t.amt })),
      } as unknown as ExplanationCase)
    }
  }

  // ── Audit log (2000+ events) ─────────────────────────────────────────────────
  const auditEvents: AuditEntry[] = []

  const EVENT_TYPES: { cat: AuditEntry['category']; templates: [string, string, string][] }[] = [
    { cat: 'upload', templates: [['Upload Bank file', '{actor}', '{ref}'], ['Upload Facebook file', '{actor}', '{ref}'], ['Tải lên file TKQC', '{actor}', '{ref}']] },
    { cat: 'reconciliation', templates: [['Đối soát thành công', 'Hệ thống', '{ref}'], ['Phát hiện Bill thiếu', 'Hệ thống', '{ref}'], ['Giải trình được duyệt', '{actor}', '{ref}']] },
    { cat: 'cs_action', templates: [['CS upload Bill bổ sung', '{actor}', '{ref}'], ['CS gửi giải trình', '{actor}', '{ref}'], ['CS paste Bill', '{actor}', '{ref}']] },
    { cat: 'admin_action', templates: [['Admin chấp nhận giải trình', '{actor}', '{ref}'], ['Admin từ chối giải trình', '{actor}', '{ref}']] },
    { cat: 'session', templates: [['Mở phiên đối soát', 'Hệ thống', '{session}'], ['Đóng phiên đối soát', 'Hệ thống', '{session}']] },
    { cat: 'notification', templates: [['Gửi Telegram cho CS', 'Hệ thống', '{actor}'], ['Nhắc CS sau 24h', 'Hệ thống', '{actor}']] },
    { cat: 'assignment', templates: [['Phân công phiên', 'Admin', '{session}'], ['Cập nhật TKQC mapping', 'Admin', '{actor}']] },
  ]

  const csNames = csUsersList.map(u => u.full_name)
  const adminNames = ['Admin', 'Kế toán']
  const sampleRefs = txns.slice(0, 200).map(t => t.ref)

  for (const date of SESSION_DATES) {
    // Session open/close events
    auditEvents.push({
      id: `AUDIT-${rng.pad(++auditSeq, 6)}`,
      timestamp: `${fmtDisp(date)} 00:01`,
      category: 'session', action: 'Mở phiên đối soát',
      actor: 'Hệ thống', target: SID(date),
      detail: `Phiên ${fmtDisp(date)} được mở tự động`,
    })
    if (sessionStatus(date) !== 'active' && sessionStatus(date) !== 'closing_soon') {
      auditEvents.push({
        id: `AUDIT-${rng.pad(++auditSeq, 6)}`,
        timestamp: `${fmtDisp(subtractDays(date, -2))} 08:00`,
        category: 'session', action: 'Đóng phiên đối soát',
        actor: 'Hệ thống', target: SID(date),
        detail: `Phiên ${fmtDisp(date)} đã đóng sau ${rng.int(40, 52)} giờ xử lý`,
      })
    }

    // Upload events per session
    for (let u = 0; u < rng.int(3, 6); u++) {
      const actor = rng.pick(csNames)
      auditEvents.push({
        id: `AUDIT-${rng.pad(++auditSeq, 6)}`,
        timestamp: `${fmtDisp(subtractDays(date, -1))} ${rng.int(6,10).toString().padStart(2,'0')}:${rng.int(0,59).toString().padStart(2,'0')}`,
        category: 'upload', action: rng.next() < 0.5 ? 'Upload Bank file' : 'Upload Facebook file',
        actor, target: bankFile(date), detail: `${rng.int(800,6000)} dòng dữ liệu`,
      })
    }

    // Per-txn events (sample — not all 50, ~15 per session)
    const dateTxns = txns.filter(t => t.date === date)
    const sample = dateTxns.slice(0, Math.min(15, dateTxns.length))
    for (const t of sample) {
      // Reconciliation event
      if (t.kind === 'matched') {
        auditEvents.push({
          id: `AUDIT-${rng.pad(++auditSeq, 6)}`,
          timestamp: `${fmtDisp(subtractDays(date, -1))} ${rng.int(7,14).toString().padStart(2,'0')}:${rng.int(0,59).toString().padStart(2,'0')}`,
          category: 'reconciliation', action: 'Đối soát thành công',
          actor: 'Hệ thống', target: t.ref,
          detail: `${t.name} · ${t.tkqc} · $${t.amt}`,
        })
      } else if (t.kind === 'unreconciled') {
        auditEvents.push({
          id: `AUDIT-${rng.pad(++auditSeq, 6)}`,
          timestamp: `${fmtDisp(subtractDays(date, -1))} ${rng.int(7,12).toString().padStart(2,'0')}:${rng.int(0,59).toString().padStart(2,'0')}`,
          category: 'reconciliation', action: 'Phát hiện Bill thiếu',
          actor: 'Hệ thống', target: t.id,
          detail: `${t.name} · ${t.ref} · $${t.amt}`,
        })
        auditEvents.push({
          id: `AUDIT-${rng.pad(++auditSeq, 6)}`,
          timestamp: `${fmtDisp(subtractDays(date, -1))} ${rng.int(7,12).toString().padStart(2,'0')}:${rng.int(1,59).toString().padStart(2,'0')}`,
          category: 'notification', action: 'Gửi Telegram cho CS',
          actor: 'Hệ thống', target: t.name,
          detail: `Phát hiện Bill thiếu: ${t.ref}`,
        })
      }
    }

    // CS actions
    for (let i = 0; i < rng.int(2, 5); i++) {
      const actor = rng.pick(csNames)
      const ref = rng.next() < 0.5 ? rng.pick(sampleRefs) : rng.ref()
      auditEvents.push({
        id: `AUDIT-${rng.pad(++auditSeq, 6)}`,
        timestamp: `${fmtDisp(subtractDays(date, -1))} ${rng.int(8,20).toString().padStart(2,'0')}:${rng.int(0,59).toString().padStart(2,'0')}`,
        category: 'cs_action', action: rng.next() < 0.6 ? 'CS upload Bill bổ sung' : 'CS gửi giải trình',
        actor, target: ref, detail: `Phiên ${fmtDisp(date)}`,
      })
    }

    // Admin actions (1-2 per session)
    if (rng.next() < 0.6) {
      const actor = rng.pick(adminNames)
      auditEvents.push({
        id: `AUDIT-${rng.pad(++auditSeq, 6)}`,
        timestamp: `${fmtDisp(subtractDays(date, -1))} ${rng.int(10,18).toString().padStart(2,'0')}:${rng.int(0,59).toString().padStart(2,'0')}`,
        category: 'admin_action', action: rng.next() < 0.7 ? 'Admin chấp nhận giải trình' : 'Admin từ chối giải trình',
        actor, target: rng.pick(csNames), detail: `Phiên ${fmtDisp(date)} · $${rng.int(50, 800)}`,
      })
    }
  }

  // ── Leader business-data participation ────────────────────────────────────
  // Leaders are also a CS for their own TKQC/Card (see USER_TKQC/USER_CARDS
  // above) — this feeds a Leader into the EXACT same makeTxn /
  // deriveMissingCases / sessionsV2 pipeline every CS already goes through,
  // instead of a parallel "leader mock data" object. Deliberately the LAST
  // thing to consume the shared `rng` in this generator, so it cannot shift
  // any CS/exception/surplus/explanation/audit value computed above.
  //
  // Dũng (USR-001, Team Alpha — the `leader01` demo account) gets a small,
  // real workload across 3 currently-open sessions so his Personal Dashboard
  // exercises all three non-"chờ duyệt" states from real shared data:
  //  - 13/08 (active, untouched)        -> "Chưa xử lý"
  //  - 12/08 (active, CS uploaded)       -> "Đang xử lý"
  //  - 11/08 (closing_soon, <6h to due)  -> "Sắp hết hạn"
  for (let i = 0; i < 4; i++) txns.push(makeTxn('2026-08-13', 'USR-001', 'unreconciled', rng.amt(20, 140)))
  for (let i = 0; i < 3; i++) txns.push(makeTxn('2026-08-12', 'USR-001', 'unreconciled', rng.amt(20, 140)))
  for (let i = 0; i < 3; i++) txns.push(makeTxn('2026-08-11', 'USR-001', 'unreconciled', rng.amt(20, 140)))

  auditEvents.push(
    {
      id: `AUDIT-${rng.pad(++auditSeq, 6)}`,
      timestamp: '14/08 07:15',
      category: 'reconciliation', action: 'Phát hiện Bill thiếu',
      actor: 'Hệ thống', target: 'Dũng',
      detail: 'Dũng · phiên 13/08 · 4 Bill chưa đối soát',
    },
    {
      id: `AUDIT-${rng.pad(++auditSeq, 6)}`,
      timestamp: '13/08 20:32',
      category: 'cs_action', action: 'CS upload Bill bổ sung',
      actor: 'Dũng', target: 'Phiên 12/08',
      detail: 'Dũng đã upload Bill bổ sung cho phiên 12/08',
    },
  )

  // Sort audit log by timestamp desc
  auditEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  return { txns, surplusBills, expCases, auditEvents }
})()

const { txns: allTxns, surplusBills: allSurplusBills, expCases: allExpCases, auditEvents: allAuditEvents } = _generated

// ── Derived session stats ────────────────────────────────────────────────────

function deriveSessionV2(date: string): SessionV2 {
  const sid = SID(date)
  const dateTxns = allTxns.filter(t => t.date === date)
  const matchedTxns = dateTxns.filter(t => t.kind === 'matched' || t.kind === 'exp_approved')
  const unreconciledTxns = dateTxns.filter(t => t.kind === 'unreconciled')
  const exceptionTxns = dateTxns.filter(t => t.kind === 'exception')

  const bankTotal = Math.round(dateTxns.reduce((s, t) => s + t.amt, 0) * 100) / 100
  const reconciledAmount = Math.round(matchedTxns.reduce((s, t) => s + t.amt, 0) * 100) / 100
  const unreconciledAmount = Math.round(unreconciledTxns.reduce((s, t) => s + t.amt, 0) * 100) / 100
  const exceptionsAmount = Math.round(exceptionTxns.reduce((s, t) => s + t.amt, 0) * 100) / 100

  // FB unreconciled = surplus bills for this session
  const sessionSurplus = allSurplusBills.filter(b => b.relatedSession === sid)
  const fbUnreconciledAmount = Math.round(sessionSurplus.reduce((s, b) => s + b.amount, 0) * 100) / 100

  // fb total = matched + surplus
  const fbTotal = Math.round((reconciledAmount + fbUnreconciledAmount) * 100) / 100

  const status = sessionStatus(date)
  const deadline = subtractDays(date, -2)
  const hoursRem = status === 'active' ? 35 : status === 'closing_soon' ? 5 : 0

  const rng2 = new RNG(date.split('-').join('') as unknown as number + 7)

  return {
    id: sid, date,
    status,
    sheetTotal: Math.round(bankTotal * 1.02 * 100) / 100,
    bankTotal, bankBills: dateTxns.length,
    fbTotal, fbBills: matchedTxns.length + sessionSurplus.length,
    reconciledAmount, reconciledBills: matchedTxns.length,
    unreconciledAmount, unreconciledBills: unreconciledTxns.length,
    fbUnreconciledAmount, fbUnreconciledBills: sessionSurplus.length,
    exceptionsAmount, exceptionsBills: exceptionTxns.length,
    processingDeadline: deadline,
    hoursRemaining: hoursRem,
    closedDate: (status === 'closed' || status === 'closed_pending') ? subtractDays(date, -2) : undefined,
  }
}

// All 30 sessions
export const sessionsV2: SessionV2[] = SESSION_DATES.map(d => deriveSessionV2(d))

// ── Derived session details ──────────────────────────────────────────────────

function buildSessionDetail(date: string) {
  const sid = SID(date)
  const dateTxns = allTxns.filter(t => t.date === date)

  const reconciled: ReconciledPair[] = dateTxns
    .filter(t => t.kind === 'matched')
    .map(t => ({
      id: `r-${t.id}`, bankDate: t.disp, fbDate: t.disp,
      cs: t.name, team: t.team, tkqc: t.tkqc,
      reference: t.ref, last4: t.last4,
      bankAmount: t.amt, fbAmount: t.amt, diff: 0,
      bankTxnId: t.id, bankDesc: `THANH TOAN THE TIN DUNG ${t.last4}`,
      bankSourceFile: bankFile(t.date), bankUploadTime: uploadedAt(t.date),
      fbBillId: t.fbBillId || '', fbSourceFile: fbFile(t.date), fbUploadTime: uploadedAt(t.date),
    }))

  const exceptions: ExceptionRecord[] = dateTxns
    .filter(t => t.kind === 'exception')
    .map(t => ({
      id: `ex-${t.id}`, type: 'amount_mismatch' as const,
      date: t.disp, cs: t.name, team: t.team, tkqc: t.tkqc,
      reference: t.ref, last4: t.last4,
      bankAmount: t.amt, fbAmount: t.fbAmt ?? t.amt, diff: Math.round((t.amt - (t.fbAmt ?? t.amt)) * 100) / 100,
      status: 'can_kiem_tra' as const,
      bankTxnId: t.id, fbBillId: t.fbBillId,
    }))

  const bankUnreconciled: BankUnreconciledRecord[] = dateTxns
    .filter(t => t.kind === 'unreconciled')
    .map(t => ({
      id: `bu-${t.id}`, bankDate: t.disp,
      cs: t.name, team: t.team, tkqc: t.tkqc,
      reference: t.ref, last4: t.last4, amount: t.amt,
      csStatus: 'chua_xu_ly' as const,
      hoursRemaining: sessionStatus(date) === 'active' ? 35 : sessionStatus(date) === 'closing_soon' ? 5 : 0,
      hasMissingBillCase: true,
      bankTxnId: t.id, bankDesc: `THANH TOAN THE TIN DUNG ${t.last4}`,
      bankSourceFile: bankFile(t.date), bankUploadTime: uploadedAt(t.date),
    }))

  const sessionSurplus = allSurplusBills.filter(b => b.relatedSession === sid)
  const fbUnreconciled: FbUnreconciledRecord[] = sessionSurplus.map(b => ({
    id: `fu-${b.id}`, fbDate: b.fbDate,
    cs: b.cs, team: b.team, tkqc: b.tkqcId,
    reference: b.reference, last4: b.last4, amount: b.amount,
    uploadDate: b.uploadedAt, status: 'chua_tim_thay_bank' as const,
    fbBillId: b.billId, fbSourceFile: b.sourceFile,
  }))

  return { sessionId: sid, reconciled, exceptions, bankUnreconciled, fbUnreconciled }
}

export const sessionDetails: Record<string, ReturnType<typeof buildSessionDetail>> = Object.fromEntries(
  SESSION_DATES.map(d => [SID(d), buildSessionDetail(d)])
)

// ── Missing bill cases (derived from unreconciled txns) ──────────────────────

function deriveMissingCases(): MissingBillCase[] {
  // Group unreconciled txns by uid + date
  const groups = new Map<string, Txn[]>()
  for (const t of allTxns.filter(t => t.kind === 'unreconciled')) {
    const key = `${t.uid}|${t.date}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }

  const rng3 = new RNG(99887)

  return Array.from(groups.entries()).map(([key, grp]) => {
    const [uid, date] = key.split('|')
    const u = userById[uid]
    const t = sharedTeams.find(t => t.team_id === u.team_id)!
    const sid = SID(date)
    const sessStatus = sessionStatus(date)

    const initialBills = grp.length
    const initialAmount = Math.round(grp.reduce((s, t) => s + t.amt, 0) * 100) / 100

    // Scenario overrides
    const isManh0808 = uid === 'USR-002' && date === '2026-08-08'
    const isNam0808  = uid === 'USR-004' && date === '2026-08-08'
    const isTrang0808 = uid === 'USR-005' && date === '2026-08-08'
    const isMinh0806 = uid === 'USR-016' && date === '2026-08-06'
    // Leader (Dũng) participation scenarios — see "Leader business-data
    // participation" above for why these 3 sessions/dates were chosen.
    const isDung0813 = uid === 'USR-001' && date === '2026-08-13'
    const isDung0812 = uid === 'USR-001' && date === '2026-08-12'
    const isDung0811 = uid === 'USR-001' && date === '2026-08-11'

    let suppBills = 0, suppAmt = 0, caseStatus: 'chua_xu_ly' | 'dang_xu_ly' | 'cho_duyet' | 'qua_han'
    let lastActionDesc = 'Chưa có'
    // Structured action-type, set alongside lastActionDesc from the SAME
    // branch decision — csWorkload.ts derives "Đang xử lý" from this field,
    // never by parsing lastActionDesc text (system/admin events stay 'none').
    let lastActionKind: MissingBillLastActionKind = 'none'
    const hasExplanation = isNam0808 || isTrang0808

    if (isManh0808) {
      // Mạnh's 20 already-matched txns for this session are SEPARATE
      // transactions (kind: 'matched', generated earlier — they feed
      // reconciledBills/reconciledAmount, not this case) — they must never be
      // subtracted from `initialBills` (15), which only counts his originally
      // MISSING (unreconciled) bank bills. Bug fix: remainingBills must come
      // from Bank Bills actually matched via reconciliation, bounded by
      // initialBills, never from an unrelated/uploaded-bill count.
      suppBills = Math.min(8, initialBills)
      suppAmt = Math.round(grp.slice(0, suppBills).reduce((s, t) => s + t.amt, 0) * 100) / 100
      caseStatus = 'dang_xu_ly'; lastActionDesc = 'Upload Bill bổ sung · 2 giờ trước'; lastActionKind = 'cs_upload'
    } else if (isNam0808) {
      suppBills = 0; suppAmt = 0; caseStatus = 'cho_duyet'; lastActionDesc = 'Gửi giải trình · 3 giờ trước'; lastActionKind = 'cs_explanation_submitted'
    } else if (isTrang0808) {
      suppBills = 0; suppAmt = 0; caseStatus = 'dang_xu_ly'; lastActionDesc = 'Giải trình bị từ chối · 1 giờ trước'; lastActionKind = 'cs_explanation_rejected'
    } else if (isMinh0806) {
      suppBills = 0; suppAmt = 0; caseStatus = 'qua_han'; lastActionDesc = 'Chưa có'; lastActionKind = 'none'
    } else if (isDung0813) {
      // Untouched — exercises "Chưa xử lý" from real shared data.
      suppBills = 0; suppAmt = 0; caseStatus = 'chua_xu_ly'; lastActionDesc = 'Chưa có'; lastActionKind = 'none'
    } else if (isDung0812) {
      // CS (Dũng himself) uploaded a supplement — exercises "Đang xử lý".
      suppBills = Math.min(2, initialBills)
      suppAmt = Math.round(grp.slice(0, suppBills).reduce((s, t) => s + t.amt, 0) * 100) / 100
      caseStatus = 'dang_xu_ly'; lastActionDesc = 'Upload Bill bổ sung · 3 giờ trước'; lastActionKind = 'cs_upload'
    } else if (isDung0811) {
      // No action yet; session <6h to deadline flips the DISPLAY status to
      // "Sắp hết hạn" in csWorkload.ts regardless of this workflow status.
      suppBills = 0; suppAmt = 0; caseStatus = 'chua_xu_ly'; lastActionDesc = 'Chưa có'; lastActionKind = 'none'
    } else if (sessStatus === 'closed' || sessStatus === 'closed_pending') {
      caseStatus = rng3.next() < 0.3 ? 'qua_han' : 'dang_xu_ly'
      lastActionDesc = caseStatus === 'qua_han' ? 'Chưa có' : `Upload Bill bổ sung · ${rng3.int(1,8)} giờ trước`
      lastActionKind = caseStatus === 'dang_xu_ly' ? 'cs_upload' : 'none'
      suppBills = rng3.int(0, Math.floor(initialBills * 0.6))
      suppAmt = Math.round(grp.slice(0, suppBills).reduce((s, t) => s + t.amt, 0) * 100) / 100
    } else {
      caseStatus = rng3.next() < 0.4 ? 'chua_xu_ly' : 'dang_xu_ly'
      lastActionDesc = caseStatus === 'chua_xu_ly' ? 'Chưa có' : `Upload Bill bổ sung · ${rng3.int(1,6)} giờ trước`
      lastActionKind = caseStatus === 'dang_xu_ly' ? 'cs_upload' : 'none'
      suppBills = rng3.int(0, Math.floor(initialBills * 0.5))
      suppAmt = Math.round(grp.slice(0, suppBills).reduce((s, t) => s + t.amt, 0) * 100) / 100
    }

    // Invariant (fixed at the shared-data source, not patched per-UI): a Bank
    // Bill is only ever "resolved" by successfully matching via
    // reconciliation, counted by suppBills/suppAmt above — never by the count
    // of Facebook Bills uploaded (an upload that doesn't match stays missing
    // and may instead show up in fbSurplusBills). remainingBills/Amount can
    // therefore never go negative; clamp defensively in case any branch above
    // ever picks a supplement larger than what was originally missing.
    //
    // LIMITATION: the current dataset has no live reconciliation pass, so
    // there is no real per-bill "uploaded vs successfully matched" flag —
    // suppBills/suppAmt are themselves the closest proxy for "matched" this
    // generator can express. A true uploaded-vs-matched distinction (and
    // moving genuinely-unmatched uploads into fbSurplusBills automatically)
    // belongs to Module 2's real reconciliation engine, not this generator.
    const suppBillsSafe = Math.max(0, Math.min(suppBills, initialBills))
    const suppAmtSafe = Math.max(0, Math.min(suppAmt, initialAmount))
    const remainingBills = initialBills - suppBillsSafe
    const remainingAmount = Math.round((initialAmount - suppAmtSafe) * 100) / 100
    // The specific bank txn ids the "supplemented" count above refers to —
    // domain/bankBills.ts (Module 2) reads THIS to know exactly which
    // individual Bank Bill records are already resolved, instead of the
    // case-level count. By construction (same slice, same source array as
    // missingBillRecords) this is always consistent with remainingBills.
    const resolvedBankTxnIds = grp.slice(0, suppBillsSafe).map(t => t.id)
    const pendingBills = hasExplanation ? remainingBills : 0
    const pendingAmount = hasExplanation ? remainingAmount : 0

    const sessObj = sessionsV2.find(s => s.id === sid)
    const deadline = sessObj?.processingDeadline || subtractDays(date, -2)
    const hoursRem = sessObj?.hoursRemaining || 0
    const t0 = `${fmtDisp(subtractDays(date, -1))} 10:24`
    const notifiedAt = `${fmtDisp(subtractDays(date, -1))} 10:25`

    return {
      id: `mb-${uid}-${date.replace(/-/g,'')}`,
      cs: u.full_name, team: t.team_name,
      ownerCsId: uid,
      sessionId: sid, sessionDate: date,
      initialBills, initialAmount,
      supplementedBills: suppBillsSafe, supplementedAmount: suppAmtSafe,
      remainingBills, remainingAmount,
      pendingExplanationBills: pendingBills, pendingExplanationAmount: pendingAmount,
      status: caseStatus, lastActionDesc, lastActionKind,
      processingDeadline: deadline, hoursRemaining: hoursRem,
      t0, notifiedAt,
      reminderSentAt: rng3.next() < 0.6 ? `${fmtDisp(date)} 10:25` : undefined,
      resolvedBankTxnIds,
    }
  })
}

export const missingBillCases: MissingBillCase[] = deriveMissingCases()

// ── Missing bill records (individual unreconciled txns) ──────────────────────

export const missingBillRecords: MissingBillRecord[] = allTxns
  .filter(t => t.kind === 'unreconciled')
  .map(t => ({
    id: `mbr-${t.id}`,
    caseId: `mb-${t.uid}-${t.date.replace(/-/g,'')}`,
    bankDate: t.disp,
    tkqcId: t.tkqc,
    reference: t.ref,
    last4: t.last4,
    amount: t.amt,
    status: (() => {
      // Nam's txns → cho_duyet_giai_trinh; Mạnh's extra → chua_bo_sung; others vary
      if (t.uid === 'USR-004' && t.date === '2026-08-08') return 'cho_duyet_giai_trinh' as const
      const mbc = missingBillCases.find(c => c.id === `mb-${t.uid}-${t.date.replace(/-/g,'')}`)
      if (mbc?.status === 'cho_duyet') return 'cho_duyet_giai_trinh' as const
      return 'chua_bo_sung' as const
    })(),
    txnId: t.id,
    bankDesc: `THANH TOAN THE TIN DUNG ${t.last4}`,
    bankSourceFile: bankFile(t.date),
    bankUploadTime: uploadedAt(t.date),
  }))

// ── Exports for each module ──────────────────────────────────────────────────

// Teams / CS lookups (replaces mock.ts teams/csMembers/csTeamMap)
export const teams = sharedTeams.map(t => t.team_name)
export const csMembers = csUsersList.map(u => u.full_name)
export const csTeamMap: Record<string, string> = Object.fromEntries(
  csUsersList.map(u => [u.full_name, teamById[u.team_id].team_name])
)
export const teamFactors: Record<string, number> = {
  'Team Alpha': 0.40, 'Team Beta': 0.35, 'Team Gamma': 0.25,
}
export const csFactors: Record<string, number> = Object.fromEntries(
  csUsersList.map((u, i) => [u.full_name, parseFloat(((0.05 + i * 0.01) % 0.2 + 0.05).toFixed(2))])
)

// Missing bills module
export const mbTeams = teams
export const mbCsTeamMap = csTeamMap

// Explanation cases — only pending ones shown in Tab 2 (ExplanationCase type has no status field)
export const explanationCases: ExplanationCase[] = allExpCases
  .filter(e => (e as unknown as { status: string }).status === 'pending')
  .map(({ ...rest }) => {
    const { ...clean } = rest as Record<string, unknown>
    delete clean['status']
    return clean as unknown as ExplanationCase
  })

// Full explanation history (pending/accepted/rejected), status kept — used by
// domain/explanationStore.tsx to seed the Module 2 case+attempt model with
// the SAME underlying demo cases (Nam/Trang/historical), never a duplicate
// dataset. Admin's existing Tab 2 keeps using the filtered `explanationCases`
// above unchanged.
export const allExplanationCasesRaw: (ExplanationCase & { status: 'pending' | 'accepted' | 'rejected' })[] =
  allExpCases as unknown as (ExplanationCase & { status: 'pending' | 'accepted' | 'rejected' })[]

// FB surplus bills
export const fbSurplusBills: FbSurplusBill[] = allSurplusBills

// Audit log (2000+ events, sorted newest first)
export const auditLog: AuditEntry[] = allAuditEvents

// fmt/fmtDate pass-through (avoid double-import in components)
export function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
export function fmtDate(d: string): string {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return d
}

// Dashboard-compatible data derived from sessionsV2
export const dashboardSessions: DashboardSession[] = sessionsV2.slice(0, 6).map((s, i) => ({
  id: s.id, date: s.date, status: s.status === 'active' ? 'active' : s.status === 'closing_soon' ? 'active' : 'closed',
  bankBills: s.bankBills, reconciledBills: s.reconciledBills,
  bankTotal: s.bankTotal, fbTotal: s.fbTotal, reconciledAmount: s.reconciledAmount,
  exceptions: s.exceptionsBills, processingDeadline: s.processingDeadline,
  dayOfProcessing: [2, 1, 2, 1, 2, 1][i] || 1,
  totalProcessingDays: 2,
  hoursRemaining: s.hoursRemaining,
  csIncomplete: missingBillCases.filter(c => c.sessionId === s.id && c.remainingBills > 0).length,
}))

// CS attention data for Dashboard
export const csAttentionData: CsAttentionItem[] = missingBillCases
  .filter(c => c.remainingBills > 0 && (c.status === 'chua_xu_ly' || c.status === 'dang_xu_ly'))
  .slice(0, 12)
  .map(c => ({
    cs: c.cs, team: c.team,
    missingBills: c.remainingBills, missingAmount: c.remainingAmount,
    status: c.status === 'chua_xu_ly' ? 'chua_xu_ly' as const : 'dang_xu_ly' as const,
    lastActionAgo: c.lastActionDesc, session: fmtDate(c.sessionDate),
  }))

// Chart data for Dashboard (last 14 days) — field names match Dashboard.tsx usage
export const chartData = sessionsV2.slice(0, 14).reverse().map(s => ({
  date: fmtDisp(s.date),
  bank: s.bankTotal, facebook: s.fbTotal, reconciled: s.reconciledAmount,
}))
