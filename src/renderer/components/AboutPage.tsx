import React from 'react'
import { useSettingsStore } from '../store/settingsStore'

export const AboutPage: React.FC = () => {
  const t = useSettingsStore(s => s.t)

  return (
    <div className="page">
      <div className="card">
        <div className="about-hero">
          <div className="about-app-icon">🎬</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 6 }}>VidSaver</h1>
          <div className="about-version">v1.0.0</div>
          <p style={{ marginTop: 10, maxWidth: 340, margin: '10px auto 0' }}>
            {t.aboutDescription}
          </p>
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
