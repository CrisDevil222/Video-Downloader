import { contextBridge, ipcRenderer } from 'electron'

// Types exported for renderer use
export interface DownloadJobPayload {
  id: string
  url: string
  title: string
  formatId: string
  audioFormatId?: string
  outputPath: string
  isAudioOnly: boolean
  audioBitrate?: '128' | '192' | '320'
}

export interface SaveDialogOptions {
  defaultName: string
  isAudio: boolean
}

type ProgressHandler = (data: { jobId: string; [key: string]: unknown }) => void
type YtdlpUpdateHandler = (percent: number) => void

/**
 * Secure API exposed to the renderer via contextBridge.
 * Only specific, safe functions are exposed — NOT the full ipcRenderer or Node APIs.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Video info
  getVideoInfo: (url: string) =>
    ipcRenderer.invoke('get-video-info', url),

  // Save dialog
  showSaveDialog: (options: SaveDialogOptions) =>
    ipcRenderer.invoke('show-save-dialog', options),

  // Download control
  startDownload: (job: DownloadJobPayload) =>
    ipcRenderer.invoke('start-download', job),

  cancelJob: (jobId: string) =>
    ipcRenderer.invoke('cancel-job', jobId),

  getAllJobs: () =>
    ipcRenderer.invoke('get-all-jobs'),

  // Settings
  getSettings: () =>
    ipcRenderer.invoke('get-settings'),

  setSettings: (partial: Record<string, unknown>) =>
    ipcRenderer.invoke('set-settings', partial),

  // Binary status
  getBinaryStatus: () =>
    ipcRenderer.invoke('get-binary-status'),

  // yt-dlp updater
  checkYtdlpUpdate: () =>
    ipcRenderer.invoke('check-ytdlp-update'),

  downloadYtdlpUpdate: (downloadUrl: string) =>
    ipcRenderer.invoke('download-ytdlp-update', downloadUrl),

  // File actions
  openLogFile: () =>
    ipcRenderer.invoke('open-log-file'),

  showItemInFolder: (filePath: string) =>
    ipcRenderer.invoke('show-item-in-folder', filePath),

  // Event listeners (renderer subscribes to main-process events)
  onDownloadProgress: (handler: ProgressHandler) => {
    ipcRenderer.on('download-progress', (_event, data) => handler(data))
  },
  offDownloadProgress: (handler: ProgressHandler) => {
    ipcRenderer.removeListener('download-progress', (_event, data) => handler(data))
  },

  onYtdlpUpdateProgress: (handler: YtdlpUpdateHandler) => {
    ipcRenderer.on('ytdlp-update-progress', (_event, percent) => handler(percent))
  },
  offYtdlpUpdateProgress: (handler: YtdlpUpdateHandler) => {
    ipcRenderer.removeListener('ytdlp-update-progress', (_event, percent) => handler(percent))
  },
})
