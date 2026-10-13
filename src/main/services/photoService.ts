import { spawn } from 'child_process'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import log from 'electron-log'
import { getBinaryPath } from './binaryPath'

export interface PhotoDownloadOptions {
  url: string
  outputDir: string
  title: string
  onProgress: (current: number, total: number) => void
  signal: AbortSignal
}

export interface TikTokPhotoPost {
  id: string
  title: string
  uploader: string
  thumbnail: string
  images: { url: string; width: number | null; height: number | null }[]
}

export function isTikTokPhotoUrl(url: string): boolean {
  return /tiktok\.com\/@[^/]+\/photo\/\d+/i.test(url)
}

/**
 * yt-dlp's TikTok extractor does not recognise /photo/ URLs and (for the /video/ form) only
 * returns an audio format + cover thumbnails — never the slideshow images.
 * We therefore let yt-dlp fetch the page (it solves TikTok's JS challenge) via --dump-pages
 * and read `imagePost.images` from the embedded rehydration JSON ourselves.
 * The /video/ rewrite is used ONLY for this page fetch; the job keeps the original /photo/ URL.
 */
export function fetchTikTokPhotoPost(url: string, signal?: AbortSignal): Promise<TikTokPhotoPost> {
  const pageUrl = url.replace(/(tiktok\.com\/@[^/]+)\/photo\//i, '$1/video/')
  const ytdlpPath = getBinaryPath('yt-dlp')

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let stderr = ''
    const proc = spawn(ytdlpPath, ['--dump-pages', '--skip-download', '--no-playlist', '--no-warnings', pageUrl], { windowsHide: true })
    signal?.addEventListener('abort', () => proc.kill('SIGKILL'))
    proc.stdout.on('data', (c: Buffer) => chunks.push(c))
    proc.stderr.on('data', (c: Buffer) => { stderr += c.toString() })
    proc.on('error', (err) => reject(new Error(`Failed to launch yt-dlp: ${err.message}`)))
    proc.on('close', () => {
      const out = Buffer.concat(chunks).toString('utf8')
      for (const line of out.split('\n')) {
        const t = line.trim()
        if (t.length < 2000 || !/^[A-Za-z0-9+/=]+$/.test(t)) continue
        try {
          const html = Buffer.from(t, 'base64').toString('utf8')
          const m = html.match(/__UNIVERSAL_DATA_FOR_REHYDRATION__[^>]*>(.*?)<\/script>/s)
          if (!m) continue
          const scope = JSON.parse(m[1]).__DEFAULT_SCOPE__
          const item = scope?.['webapp.video-detail']?.itemInfo?.itemStruct
          const rawImages = item?.imagePost?.images
          if (!Array.isArray(rawImages) || rawImages.length === 0) continue
          const images = rawImages
            .map((i: any) => ({
              url: String(i?.imageURL?.urlList?.[0] ?? ''),
              width: typeof i?.imageWidth === 'number' ? i.imageWidth : null,
              height: typeof i?.imageHeight === 'number' ? i.imageHeight : null,
            }))
            .filter((i: { url: string }) => i.url)
          if (images.length === 0) continue
          const desc = String(item?.desc ?? '').trim()
          resolve({
            id: String(item?.id ?? ''),
            title: desc ? desc.slice(0, 100) : `TikTok photo ${item?.id ?? ''}`,
            uploader: String(item?.author?.nickname ?? item?.author?.uniqueId ?? 'Unknown'),
            thumbnail: images[0].url,
            images,
          })
          return
        } catch (e) {
          log.warn('[Photo] page parse failed', e instanceof Error ? e.message : String(e))
        }
      }
      log.error('[Photo] no imagePost found', stderr.slice(0, 300))
      reject(new Error('Could not read photos from this TikTok post. It may be private, deleted, or TikTok changed its page format.'))
    })
  })
}

/**
 * Downloads every image of a TikTok slideshow post (original /photo/ URL) as .jpeg files.
 * Throws on failure; honours options.signal for cancellation.
 */
export async function downloadPhotos(options: PhotoDownloadOptions): Promise<string[]> {
  const { url, outputDir, title, signal, onProgress } = options
  await mkdir(outputDir, { recursive: true })

  const post = await fetchTikTokPhotoPost(url, signal)
  const total = post.images.length
  const safeName = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 60).trim() || post.id || 'photo'
  const saved: string[] = []
  log.info('[Photo] downloading', { id: post.id, count: total })

  for (let i = 0; i < total; i++) {
    if (signal.aborted) throw new Error('cancelled')
    const res = await fetch(post.images[i].url, {
      signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', Referer: 'https://www.tiktok.com/' },
    })
    if (!res.ok) throw new Error(`Image ${i + 1}/${total} failed: HTTP ${res.status}`)
    const type = res.headers.get('content-type') ?? ''
    const ext = type.includes('webp') ? 'webp' : type.includes('png') ? 'png' : 'jpeg'
    const file = join(outputDir, `${safeName}_${String(i + 1).padStart(2, '0')}.${ext}`)
    await writeFile(file, Buffer.from(await res.arrayBuffer()))
    saved.push(file)
    onProgress(i + 1, total)
  }
  return saved
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
