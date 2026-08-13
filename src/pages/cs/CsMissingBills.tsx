import { useAuth } from '../../auth/AuthContext'
import { useCsScope } from '../../domain/csScope'

// Still a shell — Module 2 (Bill thiếu CS/Leader) is planned/implemented in
// a follow-up task. This only proves the Dashboard -> Bill thiếu
// navigation/drill-down contract (csId + sessionId + read-only) actually
// reaches this page, so Module 2 can consume it directly instead of the
// contract being invented later.
export default function CsMissingBills() {
  const { currentUser } = useAuth()
  const { missingBillFocus } = useCsScope()
  if (!currentUser) return null

  return (
    <div className="page-content">
      <div style={{ fontSize: 18, fontWeight: 700, color: '#182230', marginBottom: 4 }}>Bill thiếu</div>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 18 }}>
        Danh sách Bill thiếu cần bổ sung/giải trình — coming soon.
      </div>

      <div className="card" style={{ padding: '16px 18px', maxWidth: 520 }}>
        {missingBillFocus ? (
          <>
            <div style={{ fontSize: 12.5, color: '#344054', marginBottom: 4 }}>
              Yêu cầu mở: <b>{missingBillFocus.csName}</b>
              {missingBillFocus.sessionId ? <> · Phiên <span className="mono">{missingBillFocus.sessionId}</span></> : ' · tất cả phiên'}
            </div>
            <div style={{ fontSize: 12.5, color: '#667085' }}>
              Chế độ: {missingBillFocus.readOnly ? 'Chỉ xem (Leader xem CS khác)' : 'Có thể xử lý'}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12.5, color: '#667085' }}>
            Chưa có yêu cầu drill-down nào từ Bảng điều hành.
          </div>
        )}
        <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 10 }}>
          Giao diện chi tiết Module Bill thiếu sẽ được bổ sung ở bước tiếp theo.
        </div>
      </div>
    </div>
  )
}
