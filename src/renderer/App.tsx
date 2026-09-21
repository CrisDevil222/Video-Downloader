import React, { useState, useEffect } from 'react'
import { useSettingsStore } from './store/settingsStore'
import { useDownloadJob } from './hooks/useDownloadJob'
import { DisclaimerModal } from './components/DisclaimerModal'
import { UrlInputForm } from './components/UrlInputForm'
import { FormatSelector } from './components/FormatSelector'
import { DownloadProgress } from './components/DownloadProgress'
import { SettingsPanel } from './components/SettingsPanel'
import { AboutPage } from './components/AboutPage'
import type { VideoInfo } from './types/electron'
import { nanoid } from './utils/nanoid'

type Page = 'home' | 'settings' | 'about'

export default function App() {
  const { isLoaded, hasAgreedToDisclaimer, loadFromMain, t } = useSettingsStore()
  const { jobs, startDownload, cancelJob, clearCompleted } = useDownloadJob()

  const [page, setPage] = useState<Page>('home')
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load settings from main process on mount
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getSettings().then(settings => {
      loadFromMain(settings)
      if (!settings.hasAgreedToDisclaimer) {
        setShowDisclaimer(true)
      }
    }).catch(console.error)
  }, [])

  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: 'var(--bg-base)',
      }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    )
  }

  const handleInfoFetched = (info: VideoInfo) => {
    setVideoInfo(info)
    setFetchError('')
  }

  const handleFetchError = (msg: string) => {
    setFetchError(msg)
    setVideoInfo(null)
  }

  const handleStartDownload = async (opts: {
    formatId: string
    audioFormatId?: string
    isAudioOnly: boolean
    audioBitrate?: '128' | '192' | '320'
    contentType?: 'video' | 'audio' | 'photo'
    outputDir?: string
    downloadAudio?: boolean
  }) => {
    if (!videoInfo) return
    setIsSubmitting(true)
    setFetchError('')

    try {
      if (opts.contentType === 'photo') {
        // Photo job: outputDir already chosen in FormatSelector, or use default
        const job = {
          id: nanoid(),
          url: videoInfo.webpage_url,
          title: videoInfo.title,
          formatId: '',
          outputPath: opts.outputDir ?? '',
          isAudioOnly: false,
          contentType: 'photo' as const,
          outputDir: opts.outputDir,
          downloadAudio: opts.downloadAudio ?? false,
        }
        await startDownload(job)
      } else {
        // Video / audio job: show file save dialog
        const dialogResult = await window.electronAPI.showSaveDialog({
          defaultName: videoInfo.title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 80),
          isAudio: opts.isAudioOnly,
        })

        if (dialogResult.canceled || !dialogResult.filePath) {
          setIsSubmitting(false)
          return
        }

        const job = {
          id: nanoid(),
          url: videoInfo.webpage_url,
          title: videoInfo.title,
          formatId: opts.formatId,
          audioFormatId: opts.audioFormatId,
          outputPath: dialogResult.filePath,
          isAudioOnly: opts.isAudioOnly,
          audioBitrate: opts.audioBitrate,
          contentType: opts.contentType,
        }
        await startDownload(job)
      }

      // Reset form for next download
      setVideoInfo(null)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : t.errorUnknown)
    } finally {
      setIsSubmitting(false)
    }
  }

  const navItems: { id: Page; icon: string; label: string }[] = [
    { id: 'home', icon: '⬇', label: t.navHome },
    { id: 'settings', icon: '⚙', label: t.navSettings },
    { id: 'about', icon: 'ℹ', label: t.navAbout },
  ]

  return (
    <>
      {showDisclaimer && (
        <DisclaimerModal onAgree={() => setShowDisclaimer(false)} />
      )}

      <div className="app-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">🎬</div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                className={`nav-btn${page === item.id ? ' active' : ''}`}
                onClick={() => setPage(item.id)}
                title={item.label}
              >
                {item.icon}
                <span className="nav-btn-tooltip">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="main-content">
          {page === 'home' && (
            <div className="page">
              {/* URL input */}
              <UrlInputForm
                onInfoFetched={handleInfoFetched}
                onError={handleFetchError}
              />

              {/* Fetch error */}
              {fetchError && (
                <div className="alert alert-error">
                  ⚠ {fetchError}
                </div>
              )}

              {/* Format selector */}
              {videoInfo && (
                <FormatSelector
                  info={videoInfo}
                  onStartDownload={handleStartDownload}
                  isDownloading={isSubmitting}
                />
              )}

              {/* Download queue */}
              <DownloadProgress
                jobs={jobs}
                onCancel={cancelJob}
                onOpenFolder={(path) => window.electronAPI.showItemInFolder(path)}
                onClearCompleted={clearCompleted}
              />
            </div>
          )}

          {page === 'settings' && <SettingsPanel />}
          {page === 'about' && <AboutPage />}
        </main>
      </div>
    </>
  )
}
