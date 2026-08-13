import { useRef, useState } from 'react'
import type { EvidenceImage } from '../../../data/mock'

let evidenceSeq = 0

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function nowTime(): string {
  const d = new Date()
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

interface Props {
  evidence: EvidenceImage[]
  onChange: (next: EvidenceImage[]) => void
  disabled?: boolean
}

// §30-31: at least 1 image required (enforced by the caller/store, not
// here), multiple images, upload + paste, thumbnail preview, lightbox,
// delete before submit. Evidence is never mapped 1:1 to a Bill — it belongs
// to the explanation attempt as a whole.
export default function EvidenceUploader({ evidence, onChange, disabled }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function addFiles(files: FileList | File[]) {
    const imgFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imgFiles.length === 0) return
    const added: EvidenceImage[] = []
    for (const f of imgFiles) {
      const dataUrl = await readFileAsDataUrl(f)
      added.push({ id: `evidence-${Date.now()}-${++evidenceSeq}`, name: f.name || 'pasted-image.png', uploadedAt: nowTime(), dataUrl })
    }
    onChange([...evidence, ...added])
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (disabled) return
    const files: File[] = []
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile()
        if (f) files.push(f)
      }
    }
    if (files.length) { e.preventDefault(); addFiles(files) }
  }

  function removeAt(idx: number) {
    onChange(evidence.filter((_, i) => i !== idx))
  }

  return (
    <div onPaste={handlePaste}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        {evidence.map((img, idx) => (
          <div
            key={img.id}
            style={{
              width: 84, height: 84, borderRadius: 8, overflow: 'hidden', position: 'relative',
              border: '1px solid #E4E7EC', cursor: 'pointer', flexShrink: 0,
              background: img.colorBg || '#F2F4F7',
            }}
            onClick={() => setLightboxIdx(idx)}
          >
            {img.dataUrl && (
              <img src={img.dataUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            {!disabled && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); removeAt(idx) }}
                style={{
                  position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(16,24,40,0.65)', color: '#fff', border: 'none', cursor: 'pointer',
                  fontSize: 12, lineHeight: '20px', padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="upload-zone"
            style={{ width: 84, height: 84, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, fontSize: 11, color: '#667085', flexShrink: 0 }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
            Thêm ảnh
          </button>
        )}
      </div>
      {!disabled && (
        <div style={{ fontSize: 11.5, color: '#98A2B3' }}>
          Chọn ảnh hoặc dán (Ctrl/Cmd+V) ảnh chụp màn hình vào đây. Cần ít nhất 1 ảnh.
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
      />

      {lightboxIdx != null && evidence[lightboxIdx] && (
        <div
          className="modal-overlay"
          style={{ alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLightboxIdx(null)}
        >
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 480, maxHeight: 480, borderRadius: 12, overflow: 'hidden',
                background: evidence[lightboxIdx].colorBg || '#1D2939',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {evidence[lightboxIdx].dataUrl && (
                <img src={evidence[lightboxIdx].dataUrl} alt={evidence[lightboxIdx].name} style={{ maxWidth: '100%', maxHeight: 480 }} />
              )}
            </div>
            <div style={{ color: '#fff', fontSize: 13, textAlign: 'center' }}>
              <div>{evidence[lightboxIdx].name}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                {lightboxIdx + 1} / {evidence.length} · Upload lúc {evidence[lightboxIdx].uploadedAt}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
