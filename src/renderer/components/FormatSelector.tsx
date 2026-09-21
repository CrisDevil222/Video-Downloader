import React, { useState } from 'react'
import type { VideoInfo, VideoFormat } from '../types/electron'
import { useSettingsStore } from '../store/settingsStore'

interface FormatSelectorProps {
  info: VideoInfo
  onStartDownload: (opts: {
    formatId: string
    audioFormatId?: string
    isAudioOnly: boolean
    audioBitrate?: '128' | '192' | '320'
    contentType?: 'video' | 'audio' | 'photo'
    outputDir?: string
    downloadAudio?: boolean
  }) => void
  isDownloading: boolean
}

type Tab = 'video' | 'audio' | 'photo'

function formatFilesize(bytes: number | null): string {
  if (!bytes) return '?'
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function getResolutionBadgeClass(height: number | null): string {
  if (!height) return 'badge-mp3'
  if (height >= 2160) return 'badge-4k'
  if (height >= 1440) return 'badge-2k'
  if (height >= 1080) return 'badge-1080'
  if (height >= 720) return 'badge-720'
  return 'badge-sd'
}

function getResolutionLabel(height: number | null): string {
  if (!height) return 'Audio'
  if (height >= 2160) return '4K'
  if (height >= 1440) return '2K'
  if (height >= 1080) return '1080p'
  if (height >= 720) return '720p'
  if (height >= 480) return '480p'
  return `${height}p`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function getPlatformLabel(key: string): string {
  const map: Record<string, string> = {
    Youtube: 'YouTube', YoutubeTab: 'YouTube',
    TikTok: 'TikTok',
    Facebook: 'Facebook', FacebookReel: 'Facebook',
    Instagram: 'Instagram',
    Twitter: 'Twitter/X', XiaoHongShu: 'Twitter/X',
    Twitch: 'Twitch',
    Vimeo: 'Vimeo',
  }
  return map[key] ?? key
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({ info, onStartDownload, isDownloading }) => {
  const t = useSettingsStore(s => s.t)
  // If this is a photo post, start on 'photo' tab; otherwise 'video'
  const [tab, setTab] = useState<Tab>(info.contentType === 'photo' ? 'photo' : 'video')
  const [selectedFormatId, setSelectedFormatId] = useState<string>('')
  const [audioBitrate, setAudioBitrate] = useState<'128' | '192' | '320'>('192')
  // Photo-specific state
  const [downloadAudio, setDownloadAudio] = useState(false)
  const [outputDir, setOutputDir] = useState<string | undefined>(undefined)
  const [isChoosingFolder, setIsChoosingFolder] = useState(false)

  // Deduplicate and sort video formats
  const videoFormats: VideoFormat[] = React.useMemo(() => {
    const seen = new Set<string>()
    return info.formats
      .filter(f => f.hasVideo)
      .filter(f => {
        const key = `${f.height}-${f.vcodec}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))
  }, [info.formats])

  // Find best audio-only track for DASH pairing
  const bestAudioFormat: VideoFormat | undefined = React.useMemo(() => {
    return info.formats
      .filter(f => !f.hasVideo && f.hasAudio)
      .sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0))[0]
  }, [info.formats])

  const selectedFormat = videoFormats.find(f => f.formatId === selectedFormatId)
  const needsMux = selectedFormat ? selectedFormat.hasVideo && !selectedFormat.hasAudio : false

  const handleChooseFolder = async () => {
    setIsChoosingFolder(true)
    try {
      const result = await window.electronAPI.showSaveFolderDialog()
      if (!result.canceled && result.folderPath) {
        setOutputDir(result.folderPath)
      }
    } finally {
      setIsChoosingFolder(false)
    }
  }

  const handleDownload = () => {
    if (tab === 'photo') {
      onStartDownload({
        formatId: '',
        isAudioOnly: false,
        contentType: 'photo',
        outputDir,
        downloadAudio,
      })
    } else if (tab === 'audio') {
      onStartDownload({ formatId: 'bestaudio', isAudioOnly: true, audioBitrate, contentType: 'audio' })
    } else if (selectedFormatId) {
      onStartDownload({
        formatId: selectedFormatId,
        audioFormatId: needsMux ? bestAudioFormat?.formatId : undefined,
        isAudioOnly: false,
        contentType: 'video',
      })
    }
  }

  const canDownload = tab === 'photo' || tab === 'audio' || !!selectedFormatId

  return (
    <div className="card">
      {/* Video info header */}
      <div className="video-info-card" style={{ marginBottom: 16 }}>
        {info.thumbnail ? (
          <img src={info.thumbnail} alt="" className="video-thumbnail" />
        ) : (
          <div className="video-thumbnail-placeholder">🎬</div>
        )}
        <div className="video-meta">
          <div className="video-title">{info.title}</div>
          <div className="video-uploader">
            <span className="platform-tag">{getPlatformLabel(info.platform)}</span>
            <span>{info.uploader}</span>
            {info.duration > 0 && (
              <>
                <span>·</span>
                <span>{formatDuration(info.duration)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="format-tabs">
        {info.contentType === 'photo' ? (
          // Photo post: only show photo tab
          <button id="tab-photo" className="format-tab active">
            {t.photoTab}
          </button>
        ) : (
          // Normal video post: show video + audio tabs
          <>
            <button
              id="tab-video"
              className={`format-tab${tab === 'video' ? ' active' : ''}`}
              onClick={() => setTab('video')}
            >
              🎬 {t.videoFormats}
            </button>
            <button
              id="tab-audio"
              className={`format-tab${tab === 'audio' ? ' active' : ''}`}
              onClick={() => setTab('audio')}
            >
              🎵 {t.audioFormats}
            </button>
          </>
        )}
      </div>

      {/* Photo tab */}
      {tab === 'photo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 28 }}>🖼</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t.photoCount(info.photoCount || info.photos?.length || 0)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>TikTok Slideshow · JPG</div>
            </div>
          </div>

          {/* Preview thumbnails (first 4) */}
          {info.photos && info.photos.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {info.photos.slice(0, 4).map((photo, i) => (
                <div key={i} style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-active)', border: '1px solid var(--border)', flexShrink: 0 }}>
                  <img
                    src={photo.url}
                    alt={`Photo ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              ))}
              {info.photos.length > 4 && (
                <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--bg-active)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                  +{info.photos.length - 4}
                </div>
              )}
            </div>
          )}

          {/* Folder chooser */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleChooseFolder}
              disabled={isChoosingFolder}
              style={{ flexShrink: 0 }}
            >
              📁 {t.chooseFolder}
            </button>
            {outputDir && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {outputDir}
              </span>
            )}
          </div>

          {/* Download audio checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={downloadAudio}
              onChange={e => setDownloadAudio(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            🎵 {t.downloadAudioLabel}
          </label>
        </div>
      )}

      {/* Video formats */}
      {tab === 'video' && (
        <div className="format-list">
          {videoFormats.length === 0 ? (
            <div className="empty-state">{t.noFormats}</div>
          ) : videoFormats.map(fmt => {
            const filesize = fmt.filesize ?? fmt.filesizeApprox
            const dashMux = fmt.hasVideo && !fmt.hasAudio
            return (
              <div
                key={fmt.formatId}
                id={`format-${fmt.formatId}`}
                className={`format-item${selectedFormatId === fmt.formatId ? ' selected' : ''}`}
                onClick={() => setSelectedFormatId(fmt.formatId)}
                role="radio"
                aria-checked={selectedFormatId === fmt.formatId}
              >
                <div
                  className={`format-item-radio`}
                  style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: `2px solid ${selectedFormatId === fmt.formatId ? 'var(--accent)' : 'var(--border-strong)'}`,
                    background: selectedFormatId === fmt.formatId ? 'var(--accent)' : 'transparent',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                />
                <div className="format-item-info">
                  <div className="flex-row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <span className="format-resolution">{fmt.resolution}</span>
                    <span className={`badge ${getResolutionBadgeClass(fmt.height)}`}>
                      {getResolutionLabel(fmt.height)}
                    </span>
                    {dashMux && (
                      <span className="badge badge-dash" title={t.dashNote}>DASH</span>
                    )}
                  </div>
                  <div className="format-detail">
                    {fmt.fps && <span>{fmt.fps}fps</span>}
                    {fmt.vcodec && <span>{fmt.vcodec.split('.')[0]}</span>}
                    {fmt.tbr && <span>{fmt.tbr.toFixed(0)} kbps</span>}
                    {dashMux && <span style={{ color: 'var(--info)', fontSize: 10 }}>+ {t.dashNote}</span>}
                  </div>
                </div>
                <span className="format-filesize">{formatFilesize(filesize)}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Audio / MP3 tab */}
      {tab === 'audio' && (
        <div>
          <div style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
            📀 {t.bitrateLabel}
          </div>
          <div className="bitrate-selector">
            {(['128', '192', '320'] as const).map(br => (
              <button
                key={br}
                id={`bitrate-${br}`}
                className={`bitrate-btn${audioBitrate === br ? ' selected' : ''}`}
                onClick={() => setAudioBitrate(br)}
              >
                {br} kbps
                {br === '320' && <div style={{ fontSize: 9, marginTop: 2 }}>HQ</div>}
                {br === '192' && <div style={{ fontSize: 9, marginTop: 2 }}>Recommended</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Download button */}
      <div style={{ marginTop: 16 }}>
        <button
          id="btn-download"
          className="btn btn-primary"
          onClick={handleDownload}
          disabled={!canDownload || isDownloading}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {isDownloading ? (
            <><span className="spinner" /> {t.btnFetching.split('...')[0]}</>
          ) : (
            <>⬇ {t.btnDownload}</>
          )}
        </button>
      </div>
    </div>
  )
}
