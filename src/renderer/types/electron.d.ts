// Type definitions for window.electronAPI (exposed via contextBridge)

export interface VideoFormat {
  formatId: string
  ext: string
  resolution: string
  width: number | null
  height: number | null
  fps: number | null
  vcodec: string | null
  acodec: string | null
  hasVideo: boolean
  hasAudio: boolean
  filesize: number | null
  filesizeApprox: number | null
  tbr: number | null
  abr: number | null
  vbr: number | null
  formatNote: string
}

export interface VideoInfo {
  id: string
  title: string
  thumbnail: string
  duration: number
  uploader: string
  platform: string
  formats: VideoFormat[]
  webpage_url: string
}

export interface DownloadJob {
  id: string
  url: string
  title: string
  formatId: string
  audioFormatId?: string
  outputPath: string
  isAudioOnly: boolean
  audioBitrate?: '128' | '192' | '320'
  status: 'pending' | 'downloading' | 'merging' | 'done' | 'error' | 'cancelled'
  progress: number
  speed: string
  eta: string
  error?: string
  createdAt: number
}

export interface AppSettings {
  hasAgreedToDisclaimer: boolean
  language: 'vi' | 'en'
  theme: 'dark' | 'light'
  concurrency: number
  defaultSavePath: string
}

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  downloadUrl: string
}

export interface BinaryStatus {
  ytdlp: { ok: boolean; error: string | null }
  ffmpeg: { ok: boolean; error: string | null; version: string }
}

export interface SaveDialogResult {
  canceled: boolean
  filePath?: string
}

declare global {
  interface Window {
    electronAPI: {
      getVideoInfo: (url: string) => Promise<{ success: boolean; data?: VideoInfo; error?: string }>
      showSaveDialog: (options: { defaultName: string; isAudio: boolean }) => Promise<SaveDialogResult>
      startDownload: (job: Omit<DownloadJob, 'status' | 'progress' | 'speed' | 'eta' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>
      cancelJob: (jobId: string) => Promise<{ success: boolean }>
      getAllJobs: () => Promise<DownloadJob[]>
      getSettings: () => Promise<AppSettings>
      setSettings: (partial: Record<string, unknown>) => Promise<AppSettings>
      getBinaryStatus: () => Promise<BinaryStatus>
      checkYtdlpUpdate: () => Promise<{ success: boolean; data?: UpdateInfo; error?: string }>
      downloadYtdlpUpdate: (downloadUrl: string) => Promise<{ success: boolean; error?: string }>
      openLogFile: () => Promise<string>
      showItemInFolder: (filePath: string) => Promise<void>
      onDownloadProgress: (handler: (data: Partial<DownloadJob> & { jobId: string }) => void) => void
      offDownloadProgress: (handler: (data: Partial<DownloadJob> & { jobId: string }) => void) => void
      onYtdlpUpdateProgress: (handler: (percent: number) => void) => void
      offYtdlpUpdateProgress: (handler: (percent: number) => void) => void
    }
  }
}
