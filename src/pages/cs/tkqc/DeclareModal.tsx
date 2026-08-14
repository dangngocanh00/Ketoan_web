import { useState } from 'react'
import { validateTkqcInput } from '../../../domain/sharedCardOwnership'
import { useTkqcDeclarationStore } from '../../../domain/tkqcDeclarationStore'
import type { CurrentUser } from '../../../auth/types'
import { Badge } from '../shared'

interface Props {
  cardLast4: string
  // The full authenticated user, not a separately-threaded csId/csName —
  // so `actorUserId`/`declaredByCsId` below are provably the SAME value,
  // never two independently-editable fields (hardening task §9/10/13).
  currentUser: CurrentUser
  onClose: () => void
  onSaved: () => void
}

// §8-13: CS actively types/pastes their own TKQC list — never a checklist of
// the whole Sheet (§8) — then reviews a validation preview against the
// Sheet BEFORE anything is saved (§11), and only the "Lưu" click commits
// (§31: REPLACE semantics, enforced in the domain layer — see
// tkqcDeclarationStore.submitOwnDeclaration).
export default function DeclareModal({ cardLast4, currentUser, onClose, onSaved }: Props) {
  const { getDeclaredTkqcIdsForCs, submitOwnDeclaration } = useTkqcDeclarationStore()
  const [input, setInput] = useState(() => getDeclaredTkqcIdsForCs(currentUser.id, cardLast4).join('\n'))
  const [mode, setMode] = useState<'input' | 'preview'>('input')
  const [preview, setPreview] = useState<ReturnType<typeof validateTkqcInput> | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function handleCheck() {
    setPreview(validateTkqcInput(cardLast4, input))
    setMode('preview')
  }

  function handleSave() {
    if (!preview) return
    setSaving(true)
    const result = submitOwnDeclaration({
      actorUserId: currentUser.id, actorRole: currentUser.role, actorName: currentUser.displayName,
      declaredByCsId: currentUser.id, cardLast4, validTkqcIds: preview.validTkqcIds,
    })
    setSaving(false)
    if (result.ok) onSaved()
    else setErrorMsg(result.error)
  }

  const validCount = preview?.rows.filter(r => r.status === 'valid').length ?? 0
  const invalidCount = preview?.rows.filter(r => r.status === 'not_in_card').length ?? 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 620 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E4E7EC' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#182230' }}>Khai TKQC của tôi</div>
          <div className="mono" style={{ fontSize: 12.5, color: '#667085', marginTop: 3 }}>Thẻ •••• {cardLast4}</div>
        </div>

        <div style={{ padding: '18px 24px', flex: 1, overflowY: 'auto' }}>
          {mode === 'input' ? (
            <>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#344054', marginBottom: 8 }}>TKQC của tôi</div>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={'Nhập ID TKQC, mỗi TKQC một dòng'}
                rows={8}
                className="text-input"
                style={{ width: '100%', height: 'auto', padding: 10, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
              <div style={{ fontSize: 11.5, color: '#98A2B3', marginTop: 6 }}>
                Hỗ trợ paste nhiều dòng trực tiếp từ Excel/Google Sheets. Hệ thống sẽ tự bỏ dòng trống và dòng trùng.
              </div>
            </>
          ) : (
            <>
              <div className="mono" style={{ fontSize: 13.5, fontWeight: 700, color: '#182230', marginBottom: 4 }}>
                {preview?.rows.length ?? 0} TKQC đã nhập
              </div>
              <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 14 }}>
                <span style={{ color: '#027A48', fontWeight: 600 }}>{validCount} hợp lệ</span>
                {invalidCount > 0 && <span style={{ color: '#B42318', fontWeight: 600 }}> · {invalidCount} không tìm thấy trong Sheet tổng</span>}
              </div>
              <div className="card" style={{ overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ overflowX: 'auto', maxHeight: 280 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr><th>TKQC</th><th>Kết quả</th></tr>
                    </thead>
                    <tbody>
                      {preview?.rows.map(r => (
                        <tr key={r.raw}>
                          <td className="mono">{r.raw}</td>
                          <td>
                            {r.status === 'valid'
                              ? <Badge tone="success">Hợp lệ</Badge>
                              : <Badge tone="error">Không tìm thấy trong Sheet tổng</Badge>}
                          </td>
                        </tr>
                      ))}
                      {(preview?.rows.length ?? 0) === 0 && (
                        <tr><td colSpan={2} style={{ textAlign: 'center', color: '#98A2B3', padding: '14px' }}>Chưa nhập TKQC nào.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {errorMsg && (
            <div style={{ background: '#FEF3F2', color: '#B42318', border: '1px solid #FEE4E2', borderRadius: 8, padding: '9px 12px', fontSize: 12.5 }}>
              {errorMsg}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #E4E7EC', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {mode === 'input' ? (
            <>
              <button className="btn-secondary" onClick={onClose}>Hủy</button>
              <button className="btn-primary" onClick={handleCheck}>Kiểm tra</button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => setMode('input')} disabled={saving}>Quay lại chỉnh sửa</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu TKQC của tôi'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
