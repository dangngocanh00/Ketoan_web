import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { canEditDataRetention } from '../../auth/permissions'
import {
  useReconciliationSettings, MIN_TOLERANCE_PERCENT, MAX_TOLERANCE_PERCENT,
  MIN_DATA_RETENTION_DAYS, MAX_DATA_RETENTION_DAYS,
} from '../../domain/reconciliationSettings'
import { fmt } from '../../data/sharedData'

const EXAMPLE_BANK_AMOUNT = 1_000_000

// §5: only a positive integer — reject 0/negative/decimal/text/NaN, same
// rule the domain layer (setDataRetentionDays) also enforces independently.
function parseRetentionDraft(raw: string): number | null {
  if (raw.trim() === '' || !/^\d+$/.test(raw.trim())) return null
  const n = Number(raw.trim())
  if (!Number.isInteger(n) || n < MIN_DATA_RETENTION_DAYS || n > MAX_DATA_RETENTION_DAYS) return null
  return n
}

function DataRetentionCard() {
  const { currentUser } = useAuth()
  const { dataRetentionDays, setDataRetentionDays } = useReconciliationSettings()
  const editable = canEditDataRetention(currentUser!.role)
  const [draft, setDraft] = useState(String(dataRetentionDays))
  const [error, setError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)
  const [pendingValue, setPendingValue] = useState<number | null>(null) // set while the decrease-confirmation dialog is open

  function commit(value: number) {
    const result = setDataRetentionDays(value, {
      id: currentUser!.id, name: currentUser!.displayName, role: currentUser!.role,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    setSavedNotice(true)
  }

  function handleSave() {
    setSavedNotice(false)
    const parsed = parseRetentionDraft(draft)
    if (parsed == null) {
      setError('Vui lòng nhập một số nguyên dương.')
      return
    }
    // §9: warn before a DECREASE — never on equal/increase.
    if (parsed < dataRetentionDays) {
      setPendingValue(parsed)
      return
    }
    commit(parsed)
  }

  return (
    <div className="card" style={{ padding: '18px 20px', marginBottom: 14 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#182230', marginBottom: 4 }}>Thời gian lưu dữ liệu đối soát</div>
      <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 4 }}>
        Dữ liệu đối soát chi tiết sẽ được lưu trong CSDL theo thời gian cấu hình trước khi đủ điều kiện xóa.
      </div>
      <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 16 }}>
        Phiên đang xử lý hoặc đang được mở lại sẽ không bị xóa.
      </div>

      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 6 }}>
        Thời gian lưu dữ liệu đối soát
      </label>

      {editable ? (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <input
              type="number"
              className="text-input"
              style={{ width: 120 }}
              step={1}
              min={MIN_DATA_RETENTION_DAYS}
              max={MAX_DATA_RETENTION_DAYS}
              value={draft}
              onChange={e => { setDraft(e.target.value); setSavedNotice(false); setError(null) }}
            />
            <span style={{ fontSize: 13, color: '#344054' }}>ngày</span>
            <button className="btn-primary" onClick={handleSave}>Lưu thay đổi</button>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#B42318', marginBottom: 8 }}>{error}</div>
          )}
          {savedNotice && !error && (
            <div style={{ fontSize: 12, color: '#027A48', marginBottom: 8 }}>
              Đã lưu · Mức hiện tại: {dataRetentionDays} ngày
            </div>
          )}

          <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 4 }}>
            Chỉ nhận số nguyên dương. Giới hạn kỹ thuật: {MIN_DATA_RETENTION_DAYS} – {MAX_DATA_RETENTION_DAYS} ngày.
          </div>
        </>
      ) : (
        <div style={{ fontSize: 15, fontWeight: 700, color: '#182230' }}>{dataRetentionDays} ngày</div>
      )}

      {pendingValue != null && (
        <div className="modal-overlay" onClick={() => setPendingValue(null)}>
          <div className="modal-panel" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E7EC' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#182230' }}>XÁC NHẬN GIẢM THỜI GIAN LƯU</div>
            </div>
            <div style={{ padding: '18px 20px', fontSize: 12.5, color: '#344054' }}>
              Việc giảm thời gian lưu có thể khiến một số dữ liệu hiện có đủ điều kiện xóa sớm hơn. Bạn có chắc chắn muốn tiếp tục?
              <div style={{ marginTop: 10, fontSize: 12, color: '#667085' }}>
                {dataRetentionDays} ngày → {pendingValue} ngày
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #E4E7EC', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn-secondary" onClick={() => setPendingValue(null)}>Hủy</button>
              <button className="btn-primary" onClick={() => { const v = pendingValue; setPendingValue(null); commit(v) }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReconciliationTab({ actorRoleLabel }: { actorRoleLabel: string }) {
  const { currentUser } = useAuth()
  const { tolerancePercent, setTolerancePercent } = useReconciliationSettings()
  const [draft, setDraft] = useState(String(tolerancePercent))
  const [error, setError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)

  const draftNumber = draft.trim() === '' ? NaN : Number(draft)
  const draftValid = !Number.isNaN(draftNumber) && Number.isFinite(draftNumber)

  function handleSave() {
    setSavedNotice(false)
    const result = setTolerancePercent(draftNumber, {
      id: currentUser!.id, name: currentUser!.displayName, role: currentUser!.role,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    setSavedNotice(true)
  }

  // §11: dynamic Amount-only illustration — Reference + Last4 + COMPLETED
  // stay mandatory regardless, stated explicitly below rather than implied.
  const previewPercent = draftValid ? Math.max(0, draftNumber) : tolerancePercent
  const lower = Math.round(EXAMPLE_BANK_AMOUNT * (1 - previewPercent / 100))
  const upper = Math.round(EXAMPLE_BANK_AMOUNT * (1 + previewPercent / 100))

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="card" style={{ padding: '18px 20px', marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#182230', marginBottom: 4 }}>Cấu hình đối soát</div>
        <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 16 }}>
          Áp dụng cho mọi phiên đang hoạt động, tồn đọng hoặc phiên bổ sung chưa đóng. Phiên đã đóng (History) giữ nguyên kết quả đã chốt, không bị tính lại khi đổi cấu hình này.
        </div>

        <label style={{ fontSize: 12.5, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 6 }}>
          Sai lệch Amount cho phép (%)
        </label>
        <div style={{ fontSize: 12, color: '#667085', marginBottom: 10 }}>
          Cho phép Amount của Bill Facebook chênh lệch tối đa <strong>{draftValid ? draftNumber : tolerancePercent}%</strong> so với Amount của Bill Bank.
          Mã tham chiếu và Last 4 vẫn phải khớp chính xác.
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
          <input
            type="number"
            className="text-input"
            style={{ width: 120 }}
            step={0.5}
            min={MIN_TOLERANCE_PERCENT}
            max={MAX_TOLERANCE_PERCENT}
            value={draft}
            onChange={e => { setDraft(e.target.value); setSavedNotice(false) }}
          />
          <span style={{ fontSize: 13, color: '#344054' }}>%</span>
          <button className="btn-primary" onClick={handleSave}>Lưu thay đổi</button>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#B42318', marginBottom: 8 }}>{error}</div>
        )}
        {savedNotice && !error && (
          <div style={{ fontSize: 12, color: '#027A48', marginBottom: 8 }}>
            Đã lưu · Cập nhật bởi {actorRoleLabel} · Mức hiện tại: {tolerancePercent}%
          </div>
        )}

        <div style={{ background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#344054', marginTop: 4 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Ví dụ minh họa (chỉ tính riêng điều kiện Amount)</div>
          <div>
            Với Bill Bank <span className="mono" style={{ fontWeight: 600 }}>{fmt(EXAMPLE_BANK_AMOUNT)}</span>, Bill Facebook trong khoảng{' '}
            <span className="mono" style={{ fontWeight: 600 }}>{fmt(lower)} – {fmt(upper)}</span> có thể đạt điều kiện Amount.
          </div>
          <div style={{ marginTop: 4, color: '#667085' }}>
            Mã tham chiếu, Last 4 vẫn phải khớp chính xác, và trạng thái Facebook phải là <strong>COMPLETED</strong> — không có ngoại lệ nào cho các điều kiện này.
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 12 }}>
          Giới hạn kỹ thuật: {MIN_TOLERANCE_PERCENT}% – {MAX_TOLERANCE_PERCENT}%. Đây là giới hạn kỹ thuật của hệ thống, không phải khuyến nghị nghiệp vụ.
        </div>
      </div>

      <DataRetentionCard />

      {/* §15: read-only rule summary — every field here is TEXT, never an
          input. Only the Amount row's percentage reflects the live setting
          above; everything else is a fixed, non-configurable engine rule. */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#182230', marginBottom: 12 }}>Quy tắc đối soát</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Mã tham chiếu', 'Khớp chính xác (sau chuẩn hoá)'],
              ['Last 4', 'Khớp chính xác (sau chuẩn hoá)'],
              ['Amount', `Sai lệch tối đa ±${tolerancePercent}%`],
              ['Trạng thái Facebook', 'COMPLETED'],
              ['Ngày giao dịch', 'Không dùng làm khóa đối soát'],
              ['Matching', 'One-to-one'],
            ].map(([label, value]) => (
              <tr key={label}>
                <td style={{ padding: '7px 0', fontSize: 12.5, color: '#667085', borderBottom: '1px solid #F2F4F7', width: 180 }}>{label}</td>
                <td style={{ padding: '7px 0', fontSize: 12.5, fontWeight: 600, color: '#182230', borderBottom: '1px solid #F2F4F7' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 11.5, color: '#98A2B3', marginTop: 10 }}>
          Các quy tắc cố định không thể thay đổi tại Cài đặt.
        </div>
      </div>
    </div>
  )
}
