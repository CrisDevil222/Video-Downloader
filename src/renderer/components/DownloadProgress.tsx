import React, { useCallback, useMemo, useState } from 'react'
import type { DownloadJob } from '../types/electron'
import { useSettingsStore } from '../store/settingsStore'

interface DownloadProgressProps {
  jobs: DownloadJob[]
  onCancel: (id: string) => void
  onOpenFolder: (path: string) => void
  onClearCompleted: () => void
}

function getPlatformEmoji(url: string): string {
  if (/youtube|youtu\.be/.test(url)) return '▶️'
  if (/tiktok/.test(url)) return '🎵'
  if (/facebook|fb\.watch/.test(url)) return '👤'
  if (/instagram/.test(url)) return '📷'
  if (/twitter|x\.com/.test(url)) return '🐦'
  if (/twitch/.test(url)) return '🎮'
  return '🎬'
}

function fileName(job: DownloadJob): string {
  if (job.contentType === 'photo') return job.title
  const p = job.outputPath
  const base = p ? p.split(/[\\/]/).pop() : ''
  return base || job.title
}

const ACTIVE = new Set<DownloadJob['status']>(['pending', 'downloading', 'merging'])
const FINISHED = new Set<DownloadJob['status']>(['done', 'error', 'cancelled'])

interface JobCardProps {
  job: DownloadJob
  statusLabel: string
  cancelTitle: string
  onCancel: (id: string) => void
  onOpenFolder: (path: string) => void
}

/**
 * Memoized: re-renders only when THIS job object changes (progress updates replace only the
 * affected job object, other jobs keep their reference).
 */
const JobCard = React.memo<JobCardProps>(({ job, statusLabel, cancelTitle, onCancel, onOpenFolder }) => {
  const [thumbFailed, setThumbFailed] = useState(false)
  const isActive = ACTIVE.has(job.status)
  const pct = job.status === 'merging' || job.status === 'done' ? 100 : Math.max(0, Math.min(100, job.progress))

  return (
    <div id={`job-${job.id}`} className={`job-card ${job.status}`}>
      <div className="job-card-header">
        <div className="job-thumb">
          {job.thumbnail && !thumbFailed ? (
            <img
              src={job.thumbnail}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => setThumbFailed(true)}
            />
          ) : (
            <span>{getPlatformEmoji(job.url)}</span>
          )}
        </div>

        <div className="job-info">
          <div className="job-title" title={fileName(job)}>{fileName(job)}</div>

          {(isActive && job.status !== 'pending') || job.status === 'done' ? (
            <div className="progress-bar-track">
              <div
                className={`progress-bar-fill${job.status === 'merging' ? ' merging' : ''}${job.status === 'done' ? ' done' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          ) : null}

          <div className="job-status-row">
            <span className={`job-status-text status-${job.status}`}>
              <span className={`status-dot dot-${job.status}`} />
              {statusLabel}
              {job.status === 'downloading' && job.progress > 0 && ` ${job.progress.toFixed(1)}%`}
            </span>
            <div className="job-meta">
              {job.status === 'downloading' && (
                <>
                  {job.speed && <span>⚡ {job.speed}</span>}
                  {job.eta && <span>⏱ {job.eta}</span>}
                </>
              )}
              {job.status === 'error' && job.error && (
                <span className="job-error" title={job.error}>{job.error.slice(0, 80)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="job-actions">
          {isActive && (
            <button
              id={`btn-cancel-${job.id}`}
              className="btn btn-danger btn-sm"
              onClick={() => onCancel(job.id)}
              title={cancelTitle}
            >
              ✕
            </button>
          )}
          {job.status === 'done' && (
            <button
              id={`btn-open-folder-${job.id}`}
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenFolder(job.outputPath)}
            >
              📁
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export const DownloadProgress: React.FC<DownloadProgressProps> = React.memo(({
  jobs, onCancel, onOpenFolder, onClearCompleted
}) => {
  const t = useSettingsStore(s => s.t)

  const statusText = useMemo<Record<DownloadJob['status'], string>>(() => ({
    pending: t.statusPending,
    downloading: t.statusDownloading,
    merging: t.statusMerging,
    done: t.statusDone,
    error: t.statusError,
    cancelled: t.statusCancelled,
  }), [t])

  const hasCompleted = useMemo(() => jobs.some(j => FINISHED.has(j.status)), [jobs])
  const ordered = useMemo(() => [...jobs].reverse(), [jobs])
  const handleCancel = useCallback((id: string) => onCancel(id), [onCancel])

  if (jobs.length === 0) {
    return (
      <div className="card" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
        <div className="card-header">
          <div className="card-icon">📥</div>
          <h2 style={{ fontSize: '1rem' }}>{t.jobQueueTitle}</h2>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">{t.noJobs}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">📥</div>
        <h2 style={{ fontSize: '1rem' }}>{t.jobQueueTitle}</h2>
        <span className="badge badge-sd" style={{ marginLeft: 4 }}>{jobs.length}</span>
        {hasCompleted && (
          <button id="btn-clear-completed" className="btn btn-ghost btn-sm ml-auto" onClick={onClearCompleted}>
            🗑 Clear done
          </button>
        )}
      </div>

      <div className="job-list">
        {ordered.map(job => (
          <JobCard
            key={job.id}
            job={job}
            statusLabel={statusText[job.status]}
            cancelTitle={t.btnCancelJob}
            onCancel={handleCancel}
            onOpenFolder={onOpenFolder}
          />
        ))}
      </div>
    </div>
  )
})
