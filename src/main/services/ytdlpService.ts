import { spawn } from 'child_process'
import log from 'electron-log'
import { getBinaryPath, validateBinary } from './binaryPath'

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

export interface PhotoEntry {
  url: string
  width: number | null
  height: number | null
  index: number
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
  /** 'photo' when the TikTok post is a slideshow/photo album, otherwise 'video' */
  contentType: 'video' | 'photo'
  /** Only populated when contentType === 'photo' */
  photos: PhotoEntry[]
  photoCount: number
}

export interface DownloadOptions {
  url: string
  formatId: string
  audioFormatId?: string // for DASH mux
  outputPath: string
  isAudioOnly: boolean
  audioBitrate?: '128' | '192' | '320'
  onProgress: (percent: number, speed: string, eta: string) => void
  onMerging: () => void
  signal: AbortSignal
}

/**
 * Fetches video info including all available formats via yt-dlp --dump-json
 */
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const binError = validateBinary('yt-dlp')
  if (binError) throw new Error(binError)

  const ytdlpPath = getBinaryPath('yt-dlp')

  return new Promise(async (resolve, reject) => {
    let stdout = ''
    let stderr = ''

    // Resolve shortlinks (vm.tiktok.com, tiktok.com/t/) to get the final URL
    // so we can normalize /photo/ to /video/
    let finalUrl = url
    if (url.includes('vm.tiktok.com') || url.match(/tiktok\.com\/t\//i) || url.includes('vt.tiktok.com')) {
      try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
        finalUrl = res.url
      } catch (e) {
        log.warn('[ytdlp] Failed to resolve shortlink', e)
      }
    }

    // Normalize TikTok URLs: yt-dlp doesn't recognize /photo/ URLs, but can extract
    // info if we rewrite it to /video/
    const normalizedUrl = finalUrl.replace(/tiktok\.com\/(?:@[^\/]+)\/photo\//i, (match) => match.replace('/photo/', '/video/'))

    const args = [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      normalizedUrl
    ]

    log.info('[ytdlp] getVideoInfo', { url, args })

    const proc = spawn(ytdlpPath, args, { windowsHide: true })

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        log.error('[ytdlp] getVideoInfo failed', { code, stderr })
        const errMsg = parseYtdlpError(stderr)
        reject(new Error(errMsg))
        return
      }

      try {
        const raw = JSON.parse(stdout)
        const info = parseVideoInfo(raw, url)
        resolve(info)
      } catch (e) {
        log.error('[ytdlp] JSON parse error', e)
        reject(new Error('Failed to parse video information. The URL may be invalid or unsupported.'))
      }
    })

    proc.on('error', (err) => {
      log.error('[ytdlp] Process error', err)
      reject(new Error(`Failed to launch yt-dlp: ${err.message}`))
    })
  })
}

/**
 * Downloads a video/audio. Returns a ChildProcess so caller can kill it.
 */
export function downloadVideo(options: DownloadOptions): import('child_process').ChildProcess {
  const ytdlpPath = getBinaryPath('yt-dlp')
  const ffmpegPath = getBinaryPath('ffmpeg')

  const args = buildDownloadArgs(options, ffmpegPath)

  log.info('[ytdlp] downloadVideo', { args: args.join(' ') })

  const proc = spawn(ytdlpPath, args, { windowsHide: true })

  const progressRegex = /\[download\]\s+([\d.]+)%\s+of\s+[\d.~]+\w+\s+at\s+([\d.]+\w+\/s)\s+ETA\s+(\S+)/
  const mergeRegex = /\[Merger\]|merging|Merging/i

  let stdoutBuf = ''
  proc.stdout.on('data', (chunk: Buffer) => {
    stdoutBuf += chunk.toString()
    const lines = stdoutBuf.split('\n')
    stdoutBuf = lines.pop() ?? ''

    for (const line of lines) {
      const m = progressRegex.exec(line)
      if (m) {
        options.onProgress(parseFloat(m[1]), m[2], m[3])
      } else if (mergeRegex.test(line)) {
        options.onMerging()
      }
    }
  })

  proc.stderr.on('data', (chunk: Buffer) => {
    const line = chunk.toString()
    log.debug('[ytdlp] stderr:', line.trim())
    if (mergeRegex.test(line)) {
      options.onMerging()
    }
  })

  return proc
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDownloadArgs(options: DownloadOptions, ffmpegPath: string): string[] {
  const { url, formatId, audioFormatId, outputPath, isAudioOnly, audioBitrate } = options

  const args: string[] = ['--no-playlist', '--ffmpeg-location', ffmpegPath]

  if (isAudioOnly) {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', `${audioBitrate ?? '192'}K`)
  } else if (audioFormatId) {
    // DASH: separate video + audio tracks need merging
    args.push('-f', `${formatId}+${audioFormatId}`, '--merge-output-format', 'mp4')
  } else {
    args.push('-f', formatId)
  }

  args.push('-o', outputPath, '--progress', '--newline', url)

  return args
}

function parseVideoInfo(raw: Record<string, unknown>, originalUrl: string): VideoInfo {
  const rawFormats = (raw['formats'] as Record<string, unknown>[]) ?? []
  const platform = String(raw['extractor_key'] ?? 'Unknown')

  // Detect TikTok photo/slideshow posts
  // 1. Explicitly check if the original URL contains /photo/
  const isTikTokPhotoUrl = originalUrl.includes('/photo/')

  // 2. Or fallback to checking yt-dlp formats
  const isTikTok = platform.toLowerCase().includes('tiktok')
  const imageFormats = rawFormats.filter(f => {
    const ext = String(f['ext'] ?? '')
    const vcodec = String(f['vcodec'] ?? 'none')
    return (ext === 'jpg' || ext === 'webp' || ext === 'jpeg') && vcodec === 'none'
  })

  // A TikTok post is a photo post if the URL says so, OR it has image formats
  const isPhotoPost = isTikTokPhotoUrl || (isTikTok && imageFormats.length > 0 && (
    rawFormats.filter(f => {
      const vcodec = String(f['vcodec'] ?? 'none')
      const ext = String(f['ext'] ?? '')
      return vcodec !== 'none' && !['jpg', 'webp', 'jpeg'].includes(ext)
    }).length === 0
  ))

  const photos: PhotoEntry[] = imageFormats.map((f, idx) => ({
    url: String(f['url'] ?? ''),
    width: (f['width'] as number | null) ?? null,
    height: (f['height'] as number | null) ?? null,
    index: idx + 1,
  }))

  const formats: VideoFormat[] = rawFormats
    .filter((f) => {
      const vcodec = f['vcodec'] as string | undefined
      const acodec = f['acodec'] as string | undefined
      // Skip storyboard/thumbnails and image-only entries for non-photo posts
      if (!isPhotoPost && vcodec === 'none' && acodec === 'none') return false
      return true
    })
    .map((f) => {
      const vcodec = (f['vcodec'] as string | null) ?? null
      const acodec = (f['acodec'] as string | null) ?? null
      const height = (f['height'] as number | null) ?? null
      const width = (f['width'] as number | null) ?? null

      return {
        formatId: String(f['format_id'] ?? ''),
        ext: String(f['ext'] ?? 'mp4'),
        resolution: buildResolutionLabel(width, height),
        width,
        height,
        fps: (f['fps'] as number | null) ?? null,
        vcodec: vcodec !== 'none' ? vcodec : null,
        acodec: acodec !== 'none' ? acodec : null,
        hasVideo: !!vcodec && vcodec !== 'none',
        hasAudio: !!acodec && acodec !== 'none',
        filesize: (f['filesize'] as number | null) ?? null,
        filesizeApprox: (f['filesize_approx'] as number | null) ?? null,
        tbr: (f['tbr'] as number | null) ?? null,
        abr: (f['abr'] as number | null) ?? null,
        vbr: (f['vbr'] as number | null) ?? null,
        formatNote: String(f['format_note'] ?? ''),
      }
    })

  // If it's a photo post but yt-dlp didn't return image formats, we fake one so UI works
  if (isPhotoPost && photos.length === 0) {
    // Just a placeholder, photoService.ts uses yt-dlp to download thumbnails directly anyway
    photos.push({ url: '', width: null, height: null, index: 1 })
  }

  return {
    id: String(raw['id'] ?? ''),
    title: String(raw['title'] ?? 'Unknown'),
    thumbnail: String(raw['thumbnail'] ?? ''),
    duration: Number(raw['duration'] ?? 0),
    uploader: String(raw['uploader'] ?? raw['channel'] ?? 'Unknown'),
    platform,
    formats,
    webpage_url: String(raw['webpage_url'] ?? ''),
    contentType: isPhotoPost ? 'photo' : 'video',
    photos,
    photoCount: isPhotoPost ? Math.max(photos.length, 1) : 0,
  }
}

function buildResolutionLabel(width: number | null, height: number | null): string {
  if (!height) return 'audio only'
  if (height >= 2160) return `4K (${width}×${height})`
  if (height >= 1440) return `2K (${width}×${height})`
  if (height >= 1080) return `1080p (${width}×${height})`
  if (height >= 720) return `720p (${width}×${height})`
  if (height >= 480) return `480p (${width}×${height})`
  if (height >= 360) return `360p (${width}×${height})`
  return `${height}p (${width}×${height})`
}

function parseYtdlpError(stderr: string): string {
  if (stderr.includes('Private video')) return 'This video is private and cannot be downloaded.'
  if (stderr.includes('This video is not available')) return 'This video is not available in your region or has been removed.'
  if (stderr.includes('Unsupported URL')) return 'Unsupported URL. Please enter a link from YouTube, TikTok, Facebook, Instagram, or Twitter/X.'
  if (stderr.includes('Sign in to confirm')) return 'This video requires sign-in to access.'
  if (stderr.includes('Unable to download')) return 'Unable to download this video. It may have been deleted or restricted.'
  if (stderr.includes('HTTP Error 403')) return 'Access denied (HTTP 403). The video may be geo-restricted.'
  if (stderr.includes('HTTP Error 404')) return 'Video not found (HTTP 404). The URL may be incorrect.'
  return `yt-dlp error: ${stderr.slice(0, 300)}`
}
