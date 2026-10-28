import { ipcMain, dialog, BrowserWindow, nativeTheme, shell, app, clipboard } from 'electron'
import { join } from 'path'
import { existsSync, promises as fsPromises } from 'fs'
import log from 'electron-log'
import { getVideoInfo } from './services/ytdlpService'
import { getTranscript } from './services/transcriptService'
import { getFfmpegVersion } from './services/ffmpegService'
import { downloadQueue, DownloadJob } from './services/downloadQueue'
import { getSettings, setSettings } from './services/settingsService'
import { validateBinary } from './services/binaryPath'
import { checkForUpdate, downloadLatestYtdlp } from './services/updaterService'
import { checkVersionPolicy, RELEASES_URL } from './services/versionPolicyService'
import { checkForAppUpdatesSafely, restartAndInstallAppUpdate } from './services/appUpdaterService'

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  // ── Progress relay from queue → renderer ─────────────────────────────────
  downloadQueue.setProgressCallback((jobId, update) => {
    const win = getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('download-progress', { jobId, ...update })
    }
  })

  // ── Get video info ────────────────────────────────────────────────────────
  ipcMain.handle('get-video-info', async (_event, url: string) => {
    try {
      const info = await getVideoInfo(url)
      return { success: true, data: info }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error('[IPC] get-video-info error', msg)
      return { success: false, error: msg }
    }
  })

  // ── Show save dialog ──────────────────────────────────────────────────────
  ipcMain.handle('show-save-dialog', async (_event, options: { defaultName: string; isAudio: boolean }) => {
    const win = getWindow()
    const settings = getSettings()
    const ext = options.isAudio ? 'mp3' : 'mp4'

    const result = await dialog.showSaveDialog(win!, {
      title: 'Save video to...',
      defaultPath: join(settings.defaultSavePath, `${options.defaultName}.${ext}`),
      filters: options.isAudio
        ? [{ name: 'MP3 Audio', extensions: ['mp3'] }]
        : [{ name: 'MP4 Video', extensions: ['mp4'] }],
    })

    if (!result.canceled && result.filePath) {
      // Remember the directory
      const dir = join(result.filePath, '..')
      setSettings({ defaultSavePath: dir })
    }

    return result
  })

  // ── Show save folder dialog (for photo downloads) ──────────────────────────
  ipcMain.handle('show-save-folder-dialog', async () => {
    const win = getWindow()
    const settings = getSettings()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Chọn thư mục lưu ảnh...',
      defaultPath: settings.defaultSavePath,
      properties: ['openDirectory', 'createDirectory'],
    })
    return {
      canceled: result.canceled,
      folderPath: result.filePaths[0],
    }
  })

  // ── Start download ────────────────────────────────────────────────────────
  ipcMain.handle('start-download', async (_event, job: Omit<DownloadJob, 'status' | 'progress' | 'speed' | 'eta' | 'createdAt'>) => {
    try {
      const fullJob: DownloadJob = {
        ...job,
        status: 'pending',
        progress: 0,
        speed: '',
        eta: '',
        createdAt: Date.now(),
      }
      downloadQueue.addJob(fullJob)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error('[IPC] start-download error', msg)
      return { success: false, error: msg }
    }
  })

  // ── Cancel job ────────────────────────────────────────────────────────────
  ipcMain.handle('cancel-job', async (_event, jobId: string) => {
    const result = downloadQueue.cancelJob(jobId)
    return { success: result }
  })

  // ── Get all jobs ──────────────────────────────────────────────────────────
  ipcMain.handle('get-all-jobs', async () => {
    return downloadQueue.getAllJobs()
  })

  // ── Settings ──────────────────────────────────────────────────────────────
  ipcMain.handle('get-settings', async () => {
    return getSettings()
  })

  ipcMain.handle('set-settings', async (_event, partial: Record<string, unknown>) => {
    const updated = setSettings(partial)
    // Apply theme to nativeTheme
    if (partial['theme']) {
      nativeTheme.themeSource = partial['theme'] as 'dark' | 'light'
    }
    return updated
  })

  // ── Binary status ─────────────────────────────────────────────────────────
  ipcMain.handle('get-binary-status', async () => {
    const ytdlpError = validateBinary('yt-dlp')
    const ffmpegError = validateBinary('ffmpeg')
    let ffmpegVersion = 'N/A'
    if (!ffmpegError) {
      ffmpegVersion = await getFfmpegVersion().catch(() => 'error')
    }
    return {
      ytdlp: { ok: !ytdlpError, error: ytdlpError },
      ffmpeg: { ok: !ffmpegError, error: ffmpegError, version: ffmpegVersion },
    }
  })

  // ── Check yt-dlp update ───────────────────────────────────────────────────
  ipcMain.handle('check-ytdlp-update', async () => {
    try {
      const info = await checkForUpdate()
      return { success: true, data: info }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('download-ytdlp-update', async (_event, downloadUrl: string) => {
    const win = getWindow()
    try {
      await downloadLatestYtdlp(downloadUrl, (percent) => {
        win?.webContents.send('ytdlp-update-progress', percent)
      })
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // ── App Update (Electron Updater) ─────────────────────────────────────────
  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('check-app-update', async () => {
    return await checkForAppUpdatesSafely()
  })

  ipcMain.handle('restart-and-install-app-update', () => {
    restartAndInstallAppUpdate()
  })

  // ── Minimum required version / force update ───────────────────────────────
  ipcMain.handle('check-version-policy', async () => {
    // checkVersionPolicy never throws and returns a plain object
    return await checkVersionPolicy()
  })

  ipcMain.handle('open-releases-page', async () => {
    await shell.openExternal(RELEASES_URL)
  })

  ipcMain.handle('quit-app', () => {
    app.quit()
  })

  // ── Open log file ─────────────────────────────────────────────────────────
  ipcMain.handle('open-log-file', async () => {
    const logPath = join(app.getPath('logs'), 'vidsaver.log')
    if (existsSync(logPath)) {
      await shell.openPath(logPath)
    }
    return logPath
  })

  // ── Open external URL ─────────────────────────────────────────────────────
  ipcMain.handle('open-external-url', async (_, url: string) => {
    await shell.openExternal(url)
  })

  // ── Open file in explorer ─────────────────────────────────────────────────
  ipcMain.handle('show-item-in-folder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  // ── Get transcript / subtitles ──────────────────────────────────────────
  ipcMain.handle('get-transcript', async (_event, { url, lang, trackHint }: { url: string; lang: string; trackHint?: any }) => {
    try {
      const data = await getTranscript(url, lang, trackHint)
      return { success: true, data }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error('[IPC] get-transcript error', msg)
      return { success: false, error: msg }
    }
  })

  // ── Save text / subtitle file ───────────────────────────────────────────
  ipcMain.handle('save-text-file', async (_event, options: { defaultName: string; content: string; ext: 'txt' | 'srt' }) => {
    const win = getWindow()
    const settings = getSettings()
    const filterName = options.ext === 'srt' ? 'SubRip Subtitle (*.srt)' : 'Text Document (*.txt)'

    const result = await dialog.showSaveDialog(win!, {
      title: 'Lưu văn bản...',
      defaultPath: join(settings.defaultSavePath, `${options.defaultName}.${options.ext}`),
      filters: [{ name: filterName, extensions: [options.ext] }],
    })

    if (!result.canceled && result.filePath) {
      try {
        await fsPromises.writeFile(result.filePath, options.content, 'utf8')
        // Remember directory
        setSettings({ defaultSavePath: join(result.filePath, '..') })
        return { success: true, filePath: result.filePath }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: msg }
      }
    }

    return { success: false, canceled: true }
  })

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  ipcMain.handle('copy-to-clipboard', async (_event, text: string) => {
    clipboard.writeText(text)
    return { success: true }
  })

  log.info('[IPC] All handlers registered')
}
