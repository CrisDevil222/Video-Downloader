import { app } from 'electron'
import { join, resolve } from 'path'
import { existsSync } from 'fs'
import log from 'electron-log'

export type BinaryName = 'yt-dlp' | 'ffmpeg'

/**
 * Returns the correct path to a bundled binary (yt-dlp.exe / ffmpeg.exe)
 * handling three cases:
 *  1. Auto-updated binary in userData/bin (takes priority if it exists)
 *  2. Packaged app: process.resourcesPath/bin/<name>.exe
 *  3. Dev mode: <projectRoot>/resources/bin/<name>.exe
 */
export function getBinaryPath(name: BinaryName): string {
  const exeName = `${name}.exe`

  // Priority 1: auto-updated binary stored in userData
  const userDataBin = join(app.getPath('userData'), 'bin', exeName)
  if (existsSync(userDataBin)) {
    log.info(`[BinaryPath] Using updated binary from userData: ${userDataBin}`)
    return userDataBin
  }

  // Priority 2: packaged app — binaries are in extraResources → resources/bin
  if (app.isPackaged) {
    const packaged = join(process.resourcesPath, 'bin', exeName)
    log.info(`[BinaryPath] Packaged mode, using: ${packaged}`)
    return packaged
  }

  // Priority 3: development mode
  // In electron-vite: dev mode runs from project src, build goes to out/main/
  // Use process.env.APP_ROOT if set by electron-vite, otherwise compute from __dirname

  const appRoot = process.env.APP_ROOT 
    ?? (app.isPackaged ? '' : resolve(__dirname, '../..'))
  const devPath = join(appRoot, 'resources', 'bin', exeName)
  log.info(`[BinaryPath] Dev mode, using: ${devPath}`)
  return devPath
}

/**
 * Validates that a binary exists and is a file.
 * Returns an error message if missing, null if OK.
 */
export function validateBinary(name: BinaryName): string | null {
  const path = getBinaryPath(name)
  if (!existsSync(path)) {
    return `Binary not found: ${path}. Please place ${name}.exe in resources/bin/ before running.`
  }
  return null
}
