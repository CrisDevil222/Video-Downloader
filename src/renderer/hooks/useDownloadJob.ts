import { useState, useEffect, useCallback } from 'react'
import type { DownloadJob } from '../types/electron'

export function useDownloadJob() {
  const [jobs, setJobs] = useState<DownloadJob[]>([])

  // Load existing jobs on mount (in case window was reloaded)
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getAllJobs().then(setJobs).catch(() => { /* keep empty list */ })
  }, [])

  // Subscribe to progress events from main process
  useEffect(() => {
    const handler = (data: Partial<DownloadJob> & { jobId: string }) => {
      let unknown = false
      setJobs(prev => {
        const idx = prev.findIndex(j => j.id === data.jobId)
        if (idx === -1) {
          unknown = true
          return prev
        }
        // Only the updated job gets a new object; other jobs keep their reference
        const updated = prev.slice()
        updated[idx] = { ...prev[idx], ...data }
        return updated
      })
      if (unknown) {
        // Unknown job — reload all from main (outside the state updater)
        window.electronAPI.getAllJobs().then(setJobs).catch(() => { /* ignore */ })
      }
    }

    const unsubscribe = window.electronAPI.onDownloadProgress(handler)
    return () => {
      unsubscribe()
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
