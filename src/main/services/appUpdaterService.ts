import { app, BrowserWindow } from 'electron'
import { autoUpdater, UpdateInfo } from 'electron-updater'
import log from 'electron-log'

let mainWindowGetter: () => BrowserWindow | null = () => null
let isChecking = false
let isDownloading = false
let latestAvailableVersion: string | null = null
let downloadedVersion: string | null = null

export function initAppUpdater(getWindow: () => BrowserWindow | null): void {
  mainWindowGetter = getWindow

  autoUpdater.logger = log
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info('[AppUpdater] Update available:', info.version)
    latestAvailableVersion = info.version
    isDownloading = true

    const win = mainWindowGetter()
    if (win && !win.isDestroyed()) {
      win.webContents.send('app-update-available', {
        version: String(info.version ?? ''),
        releaseDate: String(info.releaseDate ?? ''),
        releaseName: String(info.releaseName ?? ''),
      })
    }
  })

  autoUpdater.on('download-progress', (progressObj) => {
    const win = mainWindowGetter()
    if (win && !win.isDestroyed()) {
      win.webContents.send('app-update-progress', {
        percent: Math.round(progressObj.percent),
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
      })
    }
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info('[AppUpdater] Update downloaded successfully:', info.version)
    isDownloading = false
    downloadedVersion = info.version

    const win = mainWindowGetter()
    if (win && !win.isDestroyed()) {
      win.webContents.send('app-update-downloaded', {
        version: String(info.version ?? ''),
      })
    }

    // Auto-restart and install after 2.5 seconds to give user time to see the completion state
    log.info('[AppUpdater] Automatically restarting application in 2.5s to apply update...')
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true)
    }, 2500)
  })

  autoUpdater.on('error', (err) => {
    log.error('[AppUpdater] Error during update process:', err)
    isDownloading = false
    const win = mainWindowGetter()
    if (win && !win.isDestroyed()) {
      win.webContents.send('app-update-error', {
        error: String(err instanceof Error ? err.message : err),
      })
    }
  })
}

/**
 * Checks for updates safely without triggering overlapping concurrent checks or destroying active downloads.
 */
export async function checkForAppUpdatesSafely(): Promise<{ success: boolean; data?: unknown; error?: string }> {
  if (!app.isPackaged) {
    return { success: false, error: 'Cannot check for updates in dev mode.' }
  }

  if (isDownloading) {
    return {
      success: true,
      data: {
        version: latestAvailableVersion ?? '',
        isDownloading: true,
      },
    }
  }

  if (downloadedVersion) {
    return {
      success: true,
      data: {
        version: downloadedVersion,
        isDownloaded: true,
      },
    }
  }

  if (isChecking) {
    return { success: true, data: { isChecking: true } }
  }

  isChecking = true
  try {
    const result = await autoUpdater.checkForUpdates()
    const updateInfo = result?.updateInfo
    const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v))

    return {
      success: true,
      data: updateInfo ? {
        version: str(updateInfo.version),
        releaseDate: str(updateInfo.releaseDate),
        releaseName: str(updateInfo.releaseName),
      } : null,
    }
  } catch (err) {
    return { success: false, error: String(err instanceof Error ? err.message : err) }
  } finally {
    isChecking = false
  }
}

export function restartAndInstallAppUpdate(): void {
  log.info('[AppUpdater] User triggered manual restart for update installation')
  autoUpdater.quitAndInstall(false, true)
}

export function startStartupUpdateCheck(): void {
  if (app.isPackaged) {
    checkForAppUpdatesSafely().catch(err => {
      log.error('[AppUpdater] Startup check failed:', err)
    })
  }
}
