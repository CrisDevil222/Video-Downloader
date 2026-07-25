import { ChildProcess } from 'child_process'
import { app } from 'electron'
import { join } from 'path'
import { copyFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import log from 'electron-log'
import { downloadVideo } from './ytdlpService'
import { getSettings } from './settingsService'

export type JobStatus = 'pending' | 'downloading' | 'merging' | 'done' | 'error' | 'cancelled'

export interface DownloadJob {
  id: string
  url: string
  title: string
  formatId: string
  audioFormatId?: string
  outputPath: string
  isAudioOnly: boolean
  audioBitrate?: '128' | '192' | '320'
  status: JobStatus
  progress: number
  speed: string
  eta: string
  error?: string
  createdAt: number
}

type ProgressCallback = (jobId: string, update: Partial<DownloadJob>) => void

const JOB_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

class DownloadQueue {
  private jobs: Map<string, DownloadJob> = new Map()
  private processes: Map<string, ChildProcess> = new Map()
  private running = 0
  private onProgress: ProgressCallback | null = null
  private pendingQueue: string[] = []

  setProgressCallback(cb: ProgressCallback) {
    this.onProgress = cb
  }

  addJob(job: DownloadJob): void {
    this.jobs.set(job.id, job)
    this.pendingQueue.push(job.id)
    this.emit(job.id, { status: 'pending' })
    this.drain()
  }

  cancelJob(jobId: string): boolean {
    const proc = this.processes.get(jobId)
    if (proc) {
      proc.kill('SIGKILL')
      this.processes.delete(jobId)
      this.updateJob(jobId, { status: 'cancelled' })
      this.running = Math.max(0, this.running - 1)
      this.drain()
      log.info(`[Queue] Job ${jobId} cancelled`)
      return true
    }

    // Remove from pending queue
    const idx = this.pendingQueue.indexOf(jobId)
    if (idx !== -1) {
      this.pendingQueue.splice(idx, 1)
      this.updateJob(jobId, { status: 'cancelled' })
      return true
    }

    return false
  }

  getAllJobs(): DownloadJob[] {
    return Array.from(this.jobs.values())
  }

  private async drain(): Promise<void> {
    const concurrency = getSettings().concurrency ?? 2

    while (this.running < concurrency && this.pendingQueue.length > 0) {
      const jobId = this.pendingQueue.shift()
      if (!jobId) break
      const job = this.jobs.get(jobId)
      if (!job || job.status === 'cancelled') continue

      this.running++
      this.runJob(job).finally(() => {
        this.running = Math.max(0, this.running - 1)
        this.drain()
      })
    }
  }

  private async runJob(job: DownloadJob): Promise<void> {
    const tempDir = app.getPath('temp')
    const ext = job.isAudioOnly ? 'mp3' : 'mp4'
    const tempOutput = join(tempDir, `vidsaver_${job.id}.%(ext)s`)
    const tempFinal = join(tempDir, `vidsaver_${job.id}.${ext}`)

    this.updateJob(job.id, { status: 'downloading', progress: 0 })
    log.info(`[Queue] Starting job ${job.id}`, { url: job.url })

    let settled = false
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null

    try {
      await new Promise<void>((resolve, reject) => {
        const proc = downloadVideo({
          url: job.url,
          formatId: job.formatId,
          audioFormatId: job.audioFormatId,
          outputPath: tempOutput,
          isAudioOnly: job.isAudioOnly,
          audioBitrate: job.audioBitrate,
          onProgress: (percent, speed, eta) => {
            this.updateJob(job.id, { progress: percent, speed, eta })
          },
          onMerging: () => {
            this.updateJob(job.id, { status: 'merging' })
          },
          signal: new AbortController().signal,
        })

        this.processes.set(job.id, proc)

        // 10-minute job timeout
        timeoutHandle = setTimeout(() => {
          if (!settled) {
            log.warn(`[Queue] Job ${job.id} timed out after 10 minutes`)
            proc.kill('SIGKILL')
            reject(new Error('Download timed out (10 minutes limit)'))
          }
        }, JOB_TIMEOUT_MS)

        proc.on('close', (code) => {
          settled = true
          if (timeoutHandle) clearTimeout(timeoutHandle)
          this.processes.delete(job.id)

          if (code === 0) {
            resolve()
          } else {
            const currentJob = this.jobs.get(job.id)
            if (currentJob?.status === 'cancelled') {
              reject(new Error('cancelled'))
            } else {
              reject(new Error(`yt-dlp exited with code ${code}`))
            }
          }
        })

        proc.on('error', (err) => {
          settled = true
          if (timeoutHandle) clearTimeout(timeoutHandle)
          this.processes.delete(job.id)
          reject(err)
        })
      })

      // Copy temp file to user-chosen output path
      if (existsSync(tempFinal)) {
        await copyFile(tempFinal, job.outputPath)
        await unlink(tempFinal).catch(() => {})
      }

      this.updateJob(job.id, { status: 'done', progress: 100 })
      log.info(`[Queue] Job ${job.id} completed`)
    } catch (err) {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      const errorMsg = err instanceof Error ? err.message : String(err)

      if (errorMsg === 'cancelled' || this.jobs.get(job.id)?.status === 'cancelled') {
        // Already marked cancelled
      } else {
        log.error(`[Queue] Job ${job.id} failed`, err)
        this.updateJob(job.id, { status: 'error', error: errorMsg })
      }

      // Cleanup temp file on failure
      try {
        if (existsSync(tempFinal)) await unlink(tempFinal)
      } catch { /* ignore */ }
    }
  }

  private updateJob(jobId: string, update: Partial<DownloadJob>): void {
    const job = this.jobs.get(jobId)
    if (!job) return
    Object.assign(job, update)
    this.emit(jobId, update)
  }

  private emit(jobId: string, update: Partial<DownloadJob>): void {
    this.onProgress?.(jobId, update)
  }
}

// Singleton queue instance
export const downloadQueue = new DownloadQueue()
