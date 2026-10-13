import { app } from 'electron'
import { readdir, unlink, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import log from 'electron-log'

const MAX_TEMP_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

/** Dedicated subfolder for video download temporary files, preventing any conflict with system or updater temp directories */
export function getMediaTempDir(): string {
  return join(app.getPath('temp'), 'vidsaver_media')
}

/**
 * Strict regex for media temp files only.
 * Format: vidsaver_<id>.<ext>
 * Never matches updater files like temp-VidSaver-Setup-*.exe or pending folder.
 */
const VALID_MEDIA_TEMP_REGEX = /^vidsaver_[A-Za-z0-9_-]+\.(mp4|mp3|m4a|webm|part|ytdl|tmp)$/i

/**
 * Cleans up stale temporary video files created by VidSaver.
 * Runs strictly once on app startup (never on an interval/cron).
 * 
 * Safety constraints:
 * - Scans ONLY vidsaver_media subfolder and stale vidsaver_* files in tempDir.
 * - STRICT WHITELIST: only files matching VALID_MEDIA_TEMP_REGEX.
 * - ABSOLUTE BLACKLIST: never touches any path containing 'updater', 'pending', 'setup', or '.exe'.
 * - Must be a regular file (never directories).
 * - Must be older than 24 hours.
 * - Logs the full path of every deleted file.
 */
export async function cleanupTempFiles(): Promise<void> {
  const now = Date.now()
  let cleaned = 0

  const mediaTempDir = getMediaTempDir()
  if (!existsSync(mediaTempDir)) {
    try {
      await mkdir(mediaTempDir, { recursive: true })
    } catch {
      // ignore
    }
  }

  // Target directories to safely scan
  const targetDirs = [mediaTempDir, app.getPath('temp')]

  for (const dir of targetDirs) {
    if (!existsSync(dir)) continue

    try {
      const entries = await readdir(dir)

      for (const entry of entries) {
        // Absolute exclusion for any updater, pending, installer or executable file
        const lower = entry.toLowerCase()
        if (
          lower.includes('updater') ||
          lower.includes('pending') ||
          lower.includes('setup') ||
          lower.endsWith('.exe') ||
          lower.endsWith('.blockmap') ||
          lower.endsWith('.yml')
        ) {
          continue
        }

        // Whitelist pattern check
        if (!VALID_MEDIA_TEMP_REGEX.test(entry)) {
          continue
        }

        const filePath = join(dir, entry)

        try {
          const stats = await stat(filePath)
          // Strictly files only, never directories
          if (!stats.isFile()) {
            continue
          }

          const ageMs = now - stats.mtimeMs
          if (ageMs > MAX_TEMP_AGE_MS) {
            await unlink(filePath)
            cleaned++
            log.info(`[Cleanup] Deleted stale file: ${filePath} (age: ${Math.round(ageMs / 3600000)}h)`)
          }
        } catch {
          // File may have been removed or busy, skip safely
        }
      }
    } catch (err) {
      log.warn(`[Cleanup] Failed to read directory ${dir}:`, err)
    }
  }

  if (cleaned > 0) {
    log.info(`[Cleanup] Total cleaned: ${cleaned} stale temporary file(s)`)
  } else {
    log.info('[Cleanup] No stale temporary files to clean')
  }
}
