import { useAuth } from '../../auth/AuthContext'
import { fmtDate, sessionsV2 } from '../../data/sharedData'
import { useCsScope } from '../../domain/csScope'
import { useExplanationStore } from '../../domain/explanationStore'

// Module 3 (Upload Bill Facebook) is not built here — this stays a shell.
// It only proves two contracts Module 2 depends on:
//  - §15/24: "+ Bổ sung Bill Facebook" passes a sessionId (never a Bank Bill
//    id, never a csId) — the uploader always acts as currentUser regardless
//    of whatever Leader scope was active on the page that sent it here.
//  - §43: a pending explanation for (currentUser, that session) locks upload
//    for THAT session only — other sessions stay open.
export default function CsUpload() {
  const { currentUser } = useAuth()
  const { uploadFocusSessionId } = useCsScope()
  const { isLockedForUpload } = useExplanationStore()
  if (!currentUser) return null

  const locked = uploadFocusSessionId ? isLockedForUpload(currentUser.id, uploadFocusSessionId) : false
  const focusedSessionDate = uploadFocusSessionId ? sessionsV2.find(s => s.id === uploadFocusSessionId)?.date : undefined

  return (
    <div className="page-content">
      <div style={{ fontSize: 18, fontWeight: 700, color: '#182230', marginBottom: 4 }}>Tải lên Bill Facebook</div>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 18 }}>
        Upload luôn thuộc chính tài khoản đang đăng nhập — coming soon (Module 3).
      </div>

      <div className="card" style={{ padding: '16px 18px', maxWidth: 520 }}>
        <div style={{ fontSize: 12.5, color: '#344054', marginBottom: 4 }}>
          Đăng nhập với <b>{currentUser.displayName}</b> · {currentUser.role === 'LEADER' ? 'Leader' : 'CS'}
        </div>
        <div style={{ fontSize: 12.5, color: '#667085' }}>
          {uploadFocusSessionId
            ? <>Sẽ upload cho phiên <b>{focusedSessionDate ? fmtDate(focusedSessionDate) : uploadFocusSessionId}</b> ({uploadFocusSessionId}).</>
            : 'Chưa có sessionId nào được truyền từ Bill thiếu.'}
        </div>
        {uploadFocusSessionId && (
          <div style={{ fontSize: 12.5, marginTop: 6, color: locked ? '#B42318' : '#027A48' }}>
            {locked
              ? 'Không thể bổ sung Bill trong khi giải trình đang được duyệt.'
              : 'Phiên này đang mở cho upload.'}
          </div>
        )}
        <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 10 }}>
          Giao diện upload/parser/reconciliation thật sẽ được bổ sung ở Module 3.
        </div>
      </div>
    </div>
  )
}
