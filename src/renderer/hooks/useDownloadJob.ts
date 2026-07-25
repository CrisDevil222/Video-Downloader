import { useState, useEffect, useCallback } from 'react'
import type { DownloadJob } from '../types/electron'

export function useDownloadJob() {
  const [jobs, setJobs] = useState<DownloadJob[]>([])

  // Load existing jobs on mount (in case window was reloaded)
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getAllJobs().then(setJobs).catch(console.error)
  }, [])

  // Subscribe to progress events from main process
  useEffect(() => {
    const handler = (data: Partial<DownloadJob> & { jobId: string }) => {
      setJobs(prev => {
        const idx = prev.findIndex(j => j.id === data.jobId)
        if (idx === -1) {
          // Unknown job — reload all from main
          window.electronAPI.getAllJobs().then(setJobs).catch(console.error)
          return prev
        }
        const updated = [...prev]
        updated[idx] = { ...updated[idx], ...data }
        return updated
      })
    }

    window.electronAPI.onDownloadProgress(handler)
    return () => {
      window.electronAPI.offDownloadProgress(handler)
    }
  }, [])

  const startDownload = useCallback(async (job: Omit<DownloadJob, 'status' | 'progress' | 'speed' | 'eta' | 'createdAt'>) => {
    // Optimistically add to local state
    const optimistic: DownloadJob = {
      ...job,
      status: 'pending',
      progress: 0,
      speed: '',
      eta: '',
      createdAt: Date.now(),
    }
    setJobs(prev => [...prev, optimistic])

    const result = await window.electronAPI.startDownload(job)
    if (!result.success) {
      setJobs(prev => prev.filter(j => j.id !== job.id))
      throw new Error(result.error ?? 'Failed to start download')
    }
  }, [])

  const cancelJob = useCallback(async (jobId: string) => {
    await window.electronAPI.cancelJob(jobId)
  }, [])

  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(j => j.status !== 'done' && j.status !== 'error' && j.status !== 'cancelled'))
  }, [])

  return { jobs, startDownload, cancelJob, clearCompleted }
}
