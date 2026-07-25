import React from 'react'
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

const StatusDot: React.FC<{ status: DownloadJob['status'] }> = ({ status }) => {
  const colors: Record<DownloadJob['status'], string> = {
    pending: 'var(--text-muted)',
    downloading: 'var(--accent)',
    merging: 'var(--info)',
    done: 'var(--success)',
    error: 'var(--error)',
    cancelled: 'var(--text-muted)',
  }
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: colors[status],
      boxShadow: status === 'downloading' ? `0 0 6px ${colors.downloading}` : 'none',
      animation: status === 'downloading' ? 'pulse 1.5s infinite' : 'none',
    }} />
  )
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({
  jobs, onCancel, onOpenFolder, onClearCompleted
}) => {
  const t = useSettingsStore(s => s.t)

  const statusText: Record<DownloadJob['status'], string> = {
    pending: t.statusPending,
    downloading: t.statusDownloading,
    merging: t.statusMerging,
    done: t.statusDone,
    error: t.statusError,
    cancelled: t.statusCancelled,
  }

  const hasCompleted = jobs.some(j =>
    j.status === 'done' || j.status === 'error' || j.status === 'cancelled'
  )

  if (jobs.length === 0) {
    return (
      <div className="card" style={{ animation: 'fadeIn 0.3s ease-out' }}>
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
          <button
            id="btn-clear-completed"
            className="btn btn-ghost btn-sm ml-auto"
            onClick={onClearCompleted}
          >
            🗑 Clear done
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...jobs].reverse().map(job => (
          <div
            key={job.id}
            id={`job-${job.id}`}
            className={`job-card ${job.status}`}
          >
            <div className="job-card-header">
              <div className="job-platform-icon">{getPlatformEmoji(job.url)}</div>
              <div className="job-title">{job.title}</div>
              {(job.status === 'pending' || job.status === 'downloading' || job.status === 'merging') && (
                <button
                  id={`btn-cancel-${job.id}`}
                  className="btn btn-danger btn-sm"
                  onClick={() => onCancel(job.id)}
                  title={t.btnCancelJob}
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

            {/* Progress bar */}
            {(job.status === 'downloading' || job.status === 'merging') && (
              <div>
                <div className="progress-bar-track">
                  <div
                    className={`progress-bar-fill${job.status === 'merging' ? ' merging' : ''}`}
                    style={{ width: `${job.status === 'merging' ? 100 : job.progress}%` }}
                  />
                </div>
              </div>
            )}

            {job.status === 'done' && (
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: '100%', background: 'var(--success)' }} />
              </div>
            )}

            {/* Status row */}
            <div className="job-status-row">
              <div className="flex-row" style={{ gap: 6 }}>
                <StatusDot status={job.status} />
                <span className={`job-status-text status-${job.status}`}>
                  {statusText[job.status]}
                  {job.status === 'downloading' && job.progress > 0 && ` ${job.progress.toFixed(1)}%`}
                </span>
              </div>
              <div className="job-meta">
                {job.status === 'downloading' && (
                  <>
                    {job.speed && <span>⚡ {job.speed}</span>}
                    {job.eta && <span>⏱ {job.eta}</span>}
                  </>
                )}
                {job.status === 'error' && (
                  <span style={{ color: 'var(--error)', fontSize: 11 }}>
                    {job.error?.slice(0, 80)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
