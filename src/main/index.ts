import { app, BrowserWindow, nativeTheme, Menu, dialog } from 'electron'
import { join } from 'path'
import log from 'electron-log'
import { autoUpdater } from 'electron-updater'
import { registerIpcHandlers } from './ipcHandlers'
import { cleanupTempFiles } from './cleanup'

// Configure logging
log.transports.file.resolvePathFn = () => join(app.getPath('logs'), 'vidsaver.log')
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

log.info('VidSaver starting...', { version: app.getVersion() })

// Configure autoUpdater
autoUpdater.logger = log
autoUpdater.autoDownload = true

autoUpdater.on('update-available', (info) => {
  log.info('[Updater] Update available:', info.version)
})

autoUpdater.on('update-downloaded', (info) => {
  log.info('[Updater] Update downloaded')
  dialog.showMessageBox({
    type: 'info',
    title: 'Cập nhật hoàn tất',
    message: `Phiên bản mới ${info.version} đã được tải về. Bạn có muốn khởi động lại ứng dụng để cài đặt ngay bây giờ không?`,
    buttons: ['Khởi động lại', 'Để sau']
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall()
    }
  })
})

autoUpdater.on('error', (err) => {
  log.error('[Updater] Error checking for updates', err)
})

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0f0f13',
    icon: join(__dirname, '../../resources/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // sandbox=true breaks contextBridge with preload in electron-vite
      webSecurity: true,
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    log.info('Main window shown')
  })

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  // Dev: load Vite dev server | Prod: load built HTML
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools()
    }
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // Set theme based on system preference initially
  nativeTheme.themeSource = 'dark'

  Menu.setApplicationMenu(null)

  createWindow()
  registerIpcHandlers(() => mainWindow)

  // Run cleanup on startup
  cleanupTempFiles().catch(err => log.warn('Cleanup error on startup', err))

  // Check for app updates
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      log.error('[Updater] Failed to check for updates on startup', err)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  log.info('VidSaver shutting down')
})
