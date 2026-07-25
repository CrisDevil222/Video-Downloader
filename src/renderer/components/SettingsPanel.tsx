import React, { useEffect, useState } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import type { BinaryStatus, UpdateInfo } from '../types/electron'

export const SettingsPanel: React.FC = () => {
  const t = useSettingsStore(s => s.t)
  const theme = useSettingsStore(s => s.theme)
  const language = useSettingsStore(s => s.language)
  const concurrency = useSettingsStore(s => s.concurrency)
  const setTheme = useSettingsStore(s => s.setTheme)
  const setLanguage = useSettingsStore(s => s.setLanguage)
  const setConcurrency = useSettingsStore(s => s.setConcurrency)

  const [binaryStatus, setBinaryStatus] = useState<BinaryStatus | null>(null)
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'done' | 'error'>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateError, setUpdateError] = useState('')

  // Load binary status
  useEffect(() => {
    window.electronAPI.getBinaryStatus().then(setBinaryStatus).catch(console.error)
  }, [])

  // Subscribe to ytdlp update download progress
  useEffect(() => {
    const handler = (pct: number) => setUpdateProgress(pct)
    window.electronAPI.onYtdlpUpdateProgress(handler)
    return () => window.electronAPI.offYtdlpUpdateProgress(handler)
  }, [])

  const handleCheckUpdate = async () => {
    setUpdateState('checking')
    setUpdateError('')
    try {
      const result = await window.electronAPI.checkYtdlpUpdate()
      if (result.success && result.data) {
        setUpdateInfo(result.data)
        setUpdateState(result.data.hasUpdate ? 'available' : 'up-to-date')
      } else {
        setUpdateError(result.error ?? t.errorUnknown)
        setUpdateState('error')
      }
    } catch {
      setUpdateState('error')
      setUpdateError(t.errorUnknown)
    }
  }

  const handleDownloadUpdate = async () => {
    if (!updateInfo) return
    setUpdateState('downloading')
    setUpdateProgress(0)
    try {
      const result = await window.electronAPI.downloadYtdlpUpdate(updateInfo.downloadUrl)
      if (result.success) {
        setUpdateState('done')
        // Refresh binary status
        window.electronAPI.getBinaryStatus().then(setBinaryStatus)
      } else {
        setUpdateError(result.error ?? t.errorUnknown)
        setUpdateState('error')
      }
    } catch {
      setUpdateState('error')
      setUpdateError(t.errorUnknown)
    }
  }

  return (
    <div className="page" style={{ overflowY: 'auto' }}>
      <h1 style={{ fontSize: '1.3rem' }}>{t.settingsTitle}</h1>

      {/* Appearance */}
      <div className="card">
        <div className="settings-section-title">🎨 Appearance</div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">{t.settingsTheme}</div>
          </div>
          <div className="toggle-group">
            <button
              id="theme-dark"
              className={`toggle-option${theme === 'dark' ? ' active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              🌙 {t.settingsThemeDark}
            </button>
            <button
              id="theme-light"
              className={`toggle-option${theme === 'light' ? ' active' : ''}`}
              onClick={() => setTheme('light')}
            >
              ☀️ {t.settingsThemeLight}
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">{t.settingsLanguage}</div>
          </div>
          <div className="toggle-group">
            <button
              id="lang-vi"
              className={`toggle-option${language === 'vi' ? ' active' : ''}`}
              onClick={() => setLanguage('vi')}
            >
              🇻🇳 Tiếng Việt
            </button>
            <button
              id="lang-en"
              className={`toggle-option${language === 'en' ? ' active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              🇬🇧 English
            </button>
          </div>
        </div>
      </div>

      {/* Download */}
      <div className="card">
        <div className="settings-section-title">⬇ Download</div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">{t.settingsConcurrency}</div>
            <div className="settings-row-hint">1–5 {t.settingsConcurrencyHint}</div>
          </div>
          <div className="concurrency-control">
            <button
              id="concurrency-dec"
              className="btn btn-secondary btn-icon"
              onClick={() => setConcurrency(Math.max(1, concurrency - 1))}
              disabled={concurrency <= 1}
            >−</button>
            <span className="concurrency-display">{concurrency}</span>
            <button
              id="concurrency-inc"
              className="btn btn-secondary btn-icon"
              onClick={() => setConcurrency(Math.min(5, concurrency + 1))}
              disabled={concurrency >= 5}
            >+</button>
          </div>
        </div>
      </div>

      {/* Binary status */}
      <div className="card">
        <div className="settings-section-title">⚙ {t.settingsBinaryStatus}</div>

        {binaryStatus ? (
          <>
            <div className="settings-row">
              <div className="settings-row-label">yt-dlp.exe</div>
              <span className={`badge ${binaryStatus.ytdlp.ok ? 'badge-1080' : 'badge-sd'}`} style={{ borderRadius: 6 }}>
                {binaryStatus.ytdlp.ok ? '✓ ' + t.settingsBinaryOk : '✗ ' + t.settingsBinaryMissing}
              </span>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-row-label">ffmpeg.exe</div>
                {binaryStatus.ffmpeg.ok && (
                  <div className="settings-row-hint text-mono">{binaryStatus.ffmpeg.version}</div>
                )}
              </div>
              <span className={`badge ${binaryStatus.ffmpeg.ok ? 'badge-1080' : 'badge-sd'}`} style={{ borderRadius: 6 }}>
                {binaryStatus.ffmpeg.ok ? '✓ ' + t.settingsBinaryOk : '✗ ' + t.settingsBinaryMissing}
              </span>
            </div>

            {(!binaryStatus.ytdlp.ok || !binaryStatus.ffmpeg.ok) && (
              <div className="alert alert-warning" style={{ marginTop: 10 }}>
                ⚠ {t.errorBinaryMissing('yt-dlp / ffmpeg')} Please read the README.md.
              </div>
            )}
          </>
        ) : (
          <div className="flex-row" style={{ padding: '8px 0' }}>
            <span className="spinner" />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Checking...</span>
          </div>
        )}
      </div>

      {/* yt-dlp Updater */}
      <div className="card">
        <div className="settings-section-title">🔄 {t.settingsYtdlpSection}</div>

        {updateInfo && (
          <div className="settings-row">
            <div className="settings-row-label">{t.settingsCurrentVersion}</div>
            <span className="text-mono">{updateInfo.currentVersion}</span>
          </div>
        )}

        {updateState === 'available' && updateInfo && (
          <div className="alert alert-info" style={{ marginBottom: 10 }}>
            🆕 {t.settingsUpdateAvailable}: <strong>{updateInfo.latestVersion}</strong>
          </div>
        )}

        {updateState === 'up-to-date' && (
          <div className="alert alert-success" style={{ marginBottom: 10 }}>
            ✓ {t.settingsUpToDate}
          </div>
        )}

        {updateState === 'done' && (
          <div className="alert alert-success" style={{ marginBottom: 10 }}>
            ✓ {t.settingsUpdateDone}
          </div>
        )}

        {updateState === 'error' && (
          <div className="alert alert-error" style={{ marginBottom: 10 }}>
            ✗ {updateError}
          </div>
        )}

        {updateState === 'downloading' && (
          <div style={{ marginBottom: 10 }}>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${updateProgress}%` }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {t.settingsDownloading} {updateProgress}%
            </div>
          </div>
        )}

        <div className="flex-row" style={{ gap: 8 }}>
          <button
            id="btn-check-update"
            className="btn btn-secondary"
            onClick={handleCheckUpdate}
            disabled={updateState === 'checking' || updateState === 'downloading'}
          >
            {updateState === 'checking' ? (
              <><span className="spinner" /> {t.settingsChecking}</>
            ) : t.settingsCheckUpdate}
          </button>

          {updateState === 'available' && (
            <button
              id="btn-download-update"
              className="btn btn-primary"
              onClick={handleDownloadUpdate}
            >
              ⬇ {t.settingsDownloadUpdate}
            </button>
          )}
        </div>
      </div>

      {/* Log file */}
      <div className="card">
        <div className="settings-section-title">📋 Logs</div>
        <button
          id="btn-open-log"
          className="btn btn-secondary"
          onClick={() => window.electronAPI.openLogFile()}
        >
          📄 {t.settingsOpenLog}
        </button>
      </div>
    </div>
  )
}
