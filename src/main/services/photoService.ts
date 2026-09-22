import { spawn } from 'child_process'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import log from 'electron-log'
import { getBinaryPath } from './binaryPath'

export interface PhotoDownloadOptions {
  url: string
  outputDir: string
  downloadAudio: boolean
  onProgress: (current: number, total: number) => void
  signal: AbortSignal
}

/**
 * Downloads all photos from a TikTok slideshow post.
 * Uses yt-dlp with --write-thumbnail and --convert-thumbnails jpg.
 * If downloadAudio is true, also downloads the background audio as mp3.
 */
export function downloadPhotos(options: PhotoDownloadOptions): import('child_process').ChildProcess {
  const { url, outputDir, downloadAudio } = options
  const ytdlpPath = getBinaryPath('yt-dlp')
  const ffmpegPath = getBinaryPath('ffmpeg')

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdir(outputDir, { recursive: true }).catch(err =>
      log.warn('[Photo] Failed to create output dir', err)
    )
  }

  const args: string[] = [
    '--no-playlist',
    '--ffmpeg-location', ffmpegPath,
    // Write each image as thumbnail and convert to jpg
    '--write-thumbnail',
    '--convert-thumbnails', 'jpg',
    '--skip-download',   // Don't download the video itself
    '-o', `${outputDir}/%(title)s_%(n)s.%(ext)s`,
    '--progress', '--newline',
  ]

  if (downloadAudio) {
    // Also extract audio: we do a second pass handled in downloadQueue,
    // but here we output audio in same dir
    args.push('--no-playlist')
  }

  // Normalize TikTok photo URLs so yt-dlp can recognize them
  const normalizedUrl = url.replace(/tiktok\.com\/(@[^\/]+)\/photo\//i, 'tiktok.com/$1/video/')
  args.push(normalizedUrl)

  log.info('[Photo] downloadPhotos', { args: args.join(' ') })

  const proc = spawn(ytdlpPath, args, { windowsHide: true })

  const progressRegex = /\[download\]\s+([\d.]+)%\s+of\s+[\d.~]+\w+\s+at\s+([\d.]+\w+\/s)\s+ETA\s+(\S+)/
  let stdoutBuf = ''

  proc.stdout.on('data', (chunk: Buffer) => {
    stdoutBuf += chunk.toString()
    const lines = stdoutBuf.split('\n')
    stdoutBuf = lines.pop() ?? ''

    for (const line of lines) {
      const m = progressRegex.exec(line)
      if (m) {
        // Photo progress: use percent as current/100
        const pct = parseFloat(m[1])
        options.onProgress(pct, 100)
      }
      log.debug('[Photo] stdout:', line.trim())
    }
  })

  proc.stderr.on('data', (chunk: Buffer) => {
    log.debug('[Photo] stderr:', chunk.toString().trim())
  })

  return proc
}

/**
 * Downloads background audio of a TikTok photo post as MP3.
 */
export function downloadPhotoAudio(options: {
  url: string
  outputDir: string
  title: string
}): import('child_process').ChildProcess {
  const { url, outputDir, title } = options
  const ytdlpPath = getBinaryPath('yt-dlp')
  const ffmpegPath = getBinaryPath('ffmpeg')

  const safeName = title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 80)

  const args: string[] = [
    '--no-playlist',
    '--ffmpeg-location', ffmpegPath,
    '-x', '--audio-format', 'mp3', '--audio-quality', '192K',
    '-o', `${outputDir}/${safeName}_audio.%(ext)s`,
    '--progress', '--newline',
  ]

  // Normalize TikTok photo URLs so yt-dlp can recognize them
  const normalizedUrl = url.replace(/tiktok\.com\/(@[^\/]+)\/photo\//i, 'tiktok.com/$1/video/')
  args.push(normalizedUrl)

  log.info('[Photo] downloadPhotoAudio', { args: args.join(' ') })
  return spawn(ytdlpPath, args, { windowsHide: true })
}
