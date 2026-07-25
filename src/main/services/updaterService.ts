import { app } from 'electron'
import { join } from 'path'
import { mkdir, existsSync, createWriteStream } from 'fs'
import { promisify } from 'util'
import log from 'electron-log'
import { getBinaryPath } from './binaryPath'

const mkdirAsync = promisify(mkdir)

const YTDLP_RELEASES_API = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest'

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  downloadUrl: string
}

/**
 * Gets the current yt-dlp version by running it with --version flag
 */
export async function getCurrentYtdlpVersion(): Promise<string> {
  const { spawn } = await import('child_process')
  const ytdlpPath = getBinaryPath('yt-dlp')

  return new Promise((resolve) => {
    let out = ''
    const proc = spawn(ytdlpPath, ['--version'], { windowsHide: true })
    proc.stdout.on('data', (d: Buffer) => { out += d.toString() })
    proc.on('close', () => resolve(out.trim() || 'unknown'))
    proc.on('error', () => resolve('unknown'))
  })
}

/**
 * Checks GitHub releases API for the latest yt-dlp version
 */
export async function checkForUpdate(): Promise<UpdateInfo> {
  const currentVersion = await getCurrentYtdlpVersion()

  const response = await fetch(YTDLP_RELEASES_API, {
    headers: { 'User-Agent': 'VidSaver/1.0' }
  })

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`)
  }

  const data = await response.json() as { tag_name: string; assets: { name: string; browser_download_url: string }[] }

  const latestVersion = data.tag_name.replace(/^v/, '')
  const asset = data.assets.find(a => a.name === 'yt-dlp.exe')

  if (!asset) {
    throw new Error('Could not find yt-dlp.exe in the latest release assets')
  }

  return {
    currentVersion,
    latestVersion,
    hasUpdate: currentVersion !== latestVersion,
    downloadUrl: asset.browser_download_url,
  }
}

/**
 * Downloads the latest yt-dlp.exe to userData/bin/ (does not overwrite the bundled binary)
 */
export async function downloadLatestYtdlp(
  downloadUrl: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const userDataBin = join(app.getPath('userData'), 'bin')

  if (!existsSync(userDataBin)) {
    await mkdirAsync(userDataBin, { recursive: true })
  }

  const destPath = join(userDataBin, 'yt-dlp.exe')
  const tmpPath = destPath + '.tmp'

  log.info('[Updater] Downloading yt-dlp from', downloadUrl)

  const response = await fetch(downloadUrl, {
    headers: { 'User-Agent': 'VidSaver/1.0' }
  })

  if (!response.ok || !response.body) {
    throw new Error(`Download failed: HTTP ${response.status}`)
  }

  const contentLength = Number(response.headers.get('content-length') ?? 0)
  const writer = createWriteStream(tmpPath)
  let downloaded = 0

  const reader = response.body.getReader()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      writer.write(value)
      downloaded += value.length
      if (contentLength > 0 && onProgress) {
        onProgress(Math.round((downloaded / contentLength) * 100))
      }
    }
  } finally {
    writer.end()
    reader.releaseLock()
  }

  await new Promise<void>((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })

  // Rename tmp to final
  const { rename } = await import('fs/promises')
  await rename(tmpPath, destPath)

  log.info('[Updater] yt-dlp updated to', destPath)
  return destPath
}
