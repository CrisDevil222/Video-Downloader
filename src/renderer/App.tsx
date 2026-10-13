import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSettingsStore } from './store/settingsStore'
import { useToastStore } from './store/toastStore'
import { useDownloadJob } from './hooks/useDownloadJob'
import { DisclaimerModal } from './components/DisclaimerModal'
import { UrlInputForm } from './components/UrlInputForm'
import { FormatSelector } from './components/FormatSelector'
import { DownloadProgress } from './components/DownloadProgress'
import { SettingsPanel } from './components/SettingsPanel'
import { AboutPage } from './components/AboutPage'
import { ForceUpdateModal } from './components/ForceUpdateModal'
import { InfoSkeleton } from './components/InfoSkeleton'
import { ToastHost } from './components/ToastHost'
import { AppUpdateProgressBanner } from './components/AppUpdateProgressBanner'
import type { VideoInfo, DownloadJob } from './types/electron'
import { nanoid } from './utils/nanoid'

type Page = 'home' | 'settings' | 'about'

export default function App() {
  const { isLoaded, loadFromMain, t } = useSettingsStore()
  const { jobs, startDownload, cancelJob, clearCompleted } = useDownloadJob()
  const pushToast = useToastStore(s => s.push)

  const [page, setPage] = useState<Page>('home')
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  // Load settings from main process on mount
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getSettings().then(settings => {
      loadFromMain(settings)
      if (!settings.hasAgreedToDisclaimer) {
        setShowDisclaimer(true)
      }
    }).catch(() => { /* settings failure is surfaced by defaults */ })
  }, [])

  // Version policy check — runs once after the UI has loaded. Failures are silent (never blocks).
  const [policy, setPolicy] = useState<Awaited<ReturnType<typeof window.electronAPI.checkVersionPolicy>> | null>(null)
  const [softUpdateDismissed, setSoftUpdateDismissed] = useState(false)
  useEffect(() => {
    if (!isLoaded || !window.electronAPI?.checkVersionPolicy) return
    window.electronAPI.checkVersionPolicy()
      .then(p => { if (p && p.checked) setPolicy(p) })
      .catch(() => { /* ignore: never block the user when the check fails */ })
  }, [isLoaded])

  // Toast when a job transitions to done / error (compare against previous statuses)
  const prevStatus = useRef<Map<string, DownloadJob['status']>>(new Map())
  useEffect(() => {
    for (const job of jobs) {
      const prev = prevStatus.current.get(job.id)
      if (prev !== job.status) {
        if (prev && prev !== 'done' && prev !== 'error') {
          if (job.status === 'done') pushToast('success', `Đã tải xong: ${job.title.slice(0, 60)}`)
          else if (job.status === 'error') pushToast('error', `Tải thất bại: ${(job.error ?? job.title).slice(0, 80)}`)
        }
        prevStatus.current.set(job.id, job.status)
      }
    }
  }, [jobs, pushToast])

  const handleInfoFetched = useCallback((info: VideoInfo) => {
    setVideoInfo(info)
    setFetchError('')
  }, [])

  const handleFetchError = useCallback((msg: string) => {
    setFetchError(msg)
    setVideoInfo(null)
  }, [])

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsFetching(loading)
    if (loading) {
      setVideoInfo(null)
      setFetchError('')
    }
  }, [])

  const handleOpenFolder = useCallback((path: string) => {
    window.electronAPI.showItemInFolder(path)
  }, [])

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
          thumbnail: videoInfo.thumbnail,
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
          thumbnail: videoInfo.thumbnail,
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

  const navItems: { id: Page; icon: string; label: string }[] = [
    { id: 'home', icon: '⬇', label: t.navHome },
    { id: 'settings', icon: '⚙', label: t.navSettings },
    { id: 'about', icon: 'ℹ', label: t.navAbout },
  ]

  return (
    <>
      {policy?.forceUpdate && (
        <ForceUpdateModal
          currentVersion={policy.currentVersion}
          minVersion={policy.minVersion}
          message={policy.message}
        />
      )}

      <AppUpdateProgressBanner />

      {!policy?.forceUpdate && policy?.hasUpdate && !softUpdateDismissed && (
        <div className="alert alert-info update-banner">
          <span style={{ flex: 1 }}>🎉 Có phiên bản mới v{policy.latestVersion}.</span>
          <button className="btn btn-secondary btn-sm" onClick={() => window.electronAPI.openReleasesPage()}>Tải về</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSoftUpdateDismissed(true)}>Để sau</button>
        </div>
      )}

      {showDisclaimer && !policy?.forceUpdate && (
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
                onLoadingChange={handleLoadingChange}
              />

              {/* Fetch error */}
              {fetchError && (
                <div className="alert alert-error fade-in">
                  ⚠ {fetchError}
                </div>
              )}

              {/* Skeleton while fetching */}
              {isFetching && <InfoSkeleton />}

              {/* Format selector */}
              {videoInfo && !isFetching && (
                <div className="fade-in">
                  <FormatSelector
                    key={videoInfo.webpage_url}
                    info={videoInfo}
                    onStartDownload={handleStartDownload}
                    isDownloading={isSubmitting}
                  />
                </div>
              )}

              {/* Download queue */}
              <DownloadProgress
                jobs={jobs}
                onCancel={cancelJob}
                onOpenFolder={handleOpenFolder}
                onClearCompleted={clearCompleted}
              />
            </div>
          )}

          {page === 'settings' && <SettingsPanel />}
          {page === 'about' && <AboutPage />}
        </main>
      </div>

      <ToastHost />
    </>
  )
}
