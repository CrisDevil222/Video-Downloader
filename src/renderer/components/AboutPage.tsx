import React, { useEffect, useState } from 'react'
import { useSettingsStore } from '../store/settingsStore'

export const AboutPage: React.FC = () => {
  const t = useSettingsStore(s => s.t)
  const [version, setVersion] = useState<string>('Loading...')
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    window.electronAPI.getAppVersion().then(v => setVersion(`v${v}`))
  }, [])

  const handleCheckUpdate = async () => {
    setIsChecking(true)
    try {
      const res = await window.electronAPI.checkAppUpdate()
      if (!res.success) {
        if (res.error?.includes('dev mode')) {
          alert('Không thể kiểm tra cập nhật trong môi trường Dev (Dev Mode).')
        } else {
          alert('Lỗi kiểm tra cập nhật: ' + res.error)
        }
      } else {
        // electron-updater will emit update-available or update-not-available internally
        const data = res.data as Record<string, unknown> | undefined
        const updateInfo = data?.['updateInfo'] as Record<string, unknown> | undefined
        if (updateInfo && updateInfo['version'] !== version.replace('v', '')) {
           alert('Có bản cập nhật mới: v' + updateInfo['version'] + '. Đang tải ngầm trong nền...')
        } else {
           alert('Bạn đang dùng phiên bản mới nhất!')
        }
      }
    } catch (e) {
      alert('Lỗi kiểm tra cập nhật: ' + e)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="about-hero">
          <div className="about-app-icon">🎬</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 6 }}>VidSaver</h1>
          <div className="about-version" style={{ marginTop: 8 }}>{version}</div>
          <p style={{ marginTop: 10, maxWidth: 340, margin: '10px auto 16px' }}>
            {t.aboutDescription}
          </p>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={handleCheckUpdate}
            disabled={isChecking}
          >
            {isChecking ? 'Đang kiểm tra...' : '🔄 Kiểm tra cập nhật (App)'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="settings-section-title">{t.aboutPoweredBy}</div>
        <div className="powered-by-list">
          {[
            { icon: '⬇', name: 'yt-dlp', desc: 'Video downloader engine' },
            { icon: '🎞', name: 'FFmpeg', desc: 'Audio/video processing' },
            { icon: '⚡', name: 'Electron', desc: 'Cross-platform desktop framework' },
            { icon: '⚛', name: 'React + Vite', desc: 'UI framework' },
          ].map(item => (
            <div key={item.name} className="powered-by-item">
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="settings-section-title">⚖ Legal</div>
        <p style={{ fontSize: 13, lineHeight: 1.7 }}>
          VidSaver is intended for personal, lawful use only. Users are responsible for complying with applicable copyright laws and platform terms of service. See <strong>LEGAL.md</strong> for full disclaimer.
        </p>
      </div>
    </div>
  )
}
