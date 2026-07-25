import { app } from 'electron'
import { readdir, unlink, stat } from 'fs/promises'
import { join } from 'path'
import log from 'electron-log'

const MAX_TEMP_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Cleans up stale temporary files left by VidSaver in the system temp directory.
 * Called on app startup and can be called periodically.
 */
export async function cleanupTempFiles(): Promise<void> {
  const tempDir = app.getPath('temp')
  const now = Date.now()
  let cleaned = 0

  try {
    const entries = await readdir(tempDir)
    const vidSaverFiles = entries.filter(f => f.startsWith('vidsaver_'))

    for (const file of vidSaverFiles) {
      const filePath = join(tempDir, file)
      try {
        const stats = await stat(filePath)
        const ageMs = now - stats.mtimeMs
        if (ageMs > MAX_TEMP_AGE_MS) {
          await unlink(filePath)
          cleaned++
          log.debug('[Cleanup] Removed stale temp file:', filePath)
        }
      } catch {
        // File may have been removed already, skip
      }
    }

    if (cleaned > 0) {
      log.info(`[Cleanup] Removed ${cleaned} stale temp file(s)`)
    }
  } catch (err) {
    log.warn('[Cleanup] Failed to clean temp directory', err)
  }
}
