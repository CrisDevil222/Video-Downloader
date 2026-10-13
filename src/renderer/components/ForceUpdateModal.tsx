import React from 'react'

interface Props {
  currentVersion: string
  minVersion: string
  message?: string
}

/** Non-dismissible blocking modal: no close button, overlay clicks/Escape are ignored. */
export const ForceUpdateModal: React.FC<Props> = ({ currentVersion, minVersion, message }) => {
  return (
    <div
      className="modal-overlay force-update-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="force-update-title"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === 'Escape') e.preventDefault() }}
    >
      <div className="modal">
        <div className="modal-icon">🔒</div>
        <h2 id="force-update-title" className="modal-title">Cần cập nhật ứng dụng</h2>
        <div className="modal-body">
          Phiên bản này đã quá cũ, vui lòng cập nhật để tiếp tục sử dụng.
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            Phiên bản hiện tại: v{currentVersion} · Yêu cầu tối thiểu: v{minVersion}
          </div>
          {message && <div style={{ marginTop: 8 }}>{message}</div>}
        </div>
        <div className="modal-actions">
          <button
            id="btn-force-update-download"
            className="btn btn-primary"
            style={{ justifyContent: 'center' }}
            autoFocus
            onClick={() => window.electronAPI.openReleasesPage()}
          >
            ⬇ Tải bản mới
          </button>
          <button
            id="btn-force-update-quit"
            className="btn btn-ghost"
            style={{ justifyContent: 'center' }}
            onClick={() => window.electronAPI.quitApp()}
          >
            Thoát ứng dụng
          </button>
        </div>
      </div>
    </div>
  )
}
