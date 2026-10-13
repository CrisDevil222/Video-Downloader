import React, { useState, useEffect } from 'react'

interface AppUpdateState {
  status: 'idle' | 'downloading' | 'downloaded' | 'error'
  version: string
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
  error?: string
}

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return ''
  if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
  return `${(bytesPerSec / 1024).toFixed(0)} KB/s`
}

function formatMb(bytes: number): string {
  if (!bytes || bytes <= 0) return ''
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export const AppUpdateProgressBanner: React.FC = () => {
  const [updateState, setUpdateState] = useState<AppUpdateState>({
    status: 'idle',
    version: '',
    percent: 0,
    bytesPerSecond: 0,
    transferred: 0,
    total: 0,
  })

  useEffect(() => {
    if (!window.electronAPI) return

    const unsubAvailable = window.electronAPI.onAppUpdateAvailable?.((info) => {
      setUpdateState(prev => ({
        ...prev,
        status: 'downloading',
        version: info.version,
        percent: 0,
      }))
    })

    const unsubProgress = window.electronAPI.onAppUpdateProgress?.((data) => {
      setUpdateState(prev => ({
        ...prev,
        status: 'downloading',
        percent: data.percent,
        bytesPerSecond: data.bytesPerSecond,
        transferred: data.transferred,
        total: data.total,
      }))
    })

    const unsubDownloaded = window.electronAPI.onAppUpdateDownloaded?.((info) => {
      setUpdateState(prev => ({
        ...prev,
        status: 'downloaded',
        version: info.version,
        percent: 100,
      }))
    })

    const unsubError = window.electronAPI.onAppUpdateError?.((err) => {
      setUpdateState(prev => ({
        ...prev,
        status: 'error',
        error: err.error,
      }))
      const timer = setTimeout(() => {
        setUpdateState(prev => (prev.status === 'error' ? { ...prev, status: 'idle' } : prev))
      }, 7000)
      return () => clearTimeout(timer)
    })

    return () => {
      unsubAvailable?.()
      unsubProgress?.()
      unsubDownloaded?.()
      unsubError?.()
    }
  }, [])

  if (updateState.status === 'idle') {
    return null
  }

  const handleRestartNow = () => {
    window.electronAPI?.restartAndInstallAppUpdate?.()
  }

  return (
    <div className={`app-update-banner status-${updateState.status}`} role="alert">
      <div className="update-banner-header">
        <div className="update-banner-icon">
          {updateState.status === 'downloading' && '🚀'}
          {updateState.status === 'downloaded' && '✅'}
          {updateState.status === 'error' && '⚠'}
        </div>

        <div className="update-banner-text">
          {updateState.status === 'downloading' && (
            <div style={{ fontWeight: 600 }}>
              Đang tải bản cập nhật mới v{updateState.version}... ({updateState.percent}%)
            </div>
          )}
          {updateState.status === 'downloaded' && (
            <div style={{ fontWeight: 600 }}>
              Bản cập nhật v{updateState.version} đã sẵn sàng! Đang chuẩn bị khởi động lại để cài đặt...
            </div>
          )}
          {updateState.status === 'error' && (
            <div>
              Lỗi cập nhật tự động: {updateState.error?.slice(0, 100)}
            </div>
          )}

          {updateState.status === 'downloading' && (
            <div className="update-banner-meta">
              {updateState.bytesPerSecond > 0 && <span>⚡ {formatSpeed(updateState.bytesPerSecond)}</span>}
              {updateState.total > 0 && (
                <span>
                  📦 {formatMb(updateState.transferred)} / {formatMb(updateState.total)}
                </span>
              )}
            </div>
          )}
        </div>

        {updateState.status === 'downloaded' && (
          <button
            id="btn-restart-app-update"
            className="btn btn-primary btn-sm ml-auto"
            onClick={handleRestartNow}
          >
            🔄 Khởi động lại ngay
          </button>
        )}
      </div>

      {(updateState.status === 'downloading' || updateState.status === 'downloaded') && (
        <div className="progress-bar-track update-track" style={{ marginTop: 8, height: 5 }}>
          <div
            className={`progress-bar-fill${updateState.status === 'downloaded' ? ' done' : ''}`}
            style={{ width: `${updateState.percent}%` }}
          />
        </div>
      )}
    </div>
  )
}
