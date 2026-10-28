import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync, promises as fs } from 'fs'
import { app } from 'electron'
import log from 'electron-log'
import { getBinaryPath, validateBinary } from './binaryPath'
import type { SubtitleTrack } from './ytdlpService'

export interface TranscriptCue {
  startSec: number
  startFormatted: string // e.g. "01:23" or "01:12:34"
  durationSec: number
  text: string
}

export interface TranscriptData {
  lang: string
  langName: string
  plainText: string
  timestampedText: string
  srtText: string
  cues: TranscriptCue[]
  wordCount: number
  lineCount: number
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatSrtTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function cleanCueText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '') // strip HTML/WebVTT cue tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parses YouTube's json3 format (from timedtext?fmt=json3)
 */
function parseJson3Subtitles(jsonStr: string): TranscriptCue[] {
  try {
    const data = JSON.parse(jsonStr)
    const events: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }> = data.events || []
    const cues: TranscriptCue[] = []

    for (const evt of events) {
      if (!evt.segs || evt.segs.length === 0) continue
      const rawText = evt.segs.map(s => s.utf8 || '').join('')
      const text = cleanCueText(rawText)
      if (!text || text === '\n') continue

      const startSec = Math.max(0, (evt.tStartMs || 0) / 1000)
      const durationSec = Math.max(0.5, (evt.dDurationMs || 0) / 1000)

      // Avoid duplicating identical back-to-back cues (common in YouTube auto captions)
      const lastCue = cues[cues.length - 1]
      if (lastCue && lastCue.text === text) continue

      cues.push({
        startSec,
        startFormatted: formatSeconds(startSec),
        durationSec,
        text,
      })
    }

    return cues
  } catch (err) {
    log.warn('[transcript] Failed to parse json3 subtitles', err)
    return []
  }
}

/**
 * Parses WebVTT (.vtt) format
 */
function parseVttSubtitles(vttText: string): TranscriptCue[] {
  const cues: TranscriptCue[] = []
  // Standard VTT cue format:
  // 00:00:01.000 --> 00:00:04.000 [optional styling]
  // Text line 1
  // Text line 2
  const cueBlockRegex = /(\d{1,2}:(?:\d{2}:)?\d{2}\.\d{3})\s*-->\s*(\d{1,2}:(?:\d{2}:)?\d{2}\.\d{3})[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n\r?\n|\r?\n?$)/g

  function parseVttTime(timeStr: string): number {
    const parts = timeStr.trim().split(':')
    if (parts.length === 3) {
      const h = parseFloat(parts[0])
      const m = parseFloat(parts[1])
      const s = parseFloat(parts[2])
      return h * 3600 + m * 60 + s
    } else if (parts.length === 2) {
      const m = parseFloat(parts[0])
      const s = parseFloat(parts[1])
      return m * 60 + s
    }
    return 0
  }

  let match: RegExpExecArray | null
  while ((match = cueBlockRegex.exec(vttText)) !== null) {
    const startSec = parseVttTime(match[1])
    const endSec = parseVttTime(match[2])
    const durationSec = Math.max(0.5, endSec - startSec)
    const rawLines = match[3].split(/\r?\n/)
    const text = cleanCueText(rawLines.join(' '))

    if (!text) continue

    // Deduplicate identical consecutive cues
    const lastCue = cues[cues.length - 1]
    if (lastCue && lastCue.text === text) continue

    cues.push({
      startSec,
      startFormatted: formatSeconds(startSec),
      durationSec,
      text,
    })
  }

  return cues
}

/**
 * Builds formatted plain text, timestamped text, and SRT text from cues
 */
function formatTranscriptOutputs(cues: TranscriptCue[], lang: string, langName: string): TranscriptData {
  if (cues.length === 0) {
    return {
      lang,
      langName,
      plainText: '',
      timestampedText: '',
      srtText: '',
      cues: [],
      wordCount: 0,
      lineCount: 0,
    }
  }

  // 1. Timestamped text: [01:23] Text content
  const timestampLines = cues.map(c => `[${c.startFormatted}] ${c.text}`)
  const timestampedText = timestampLines.join('\n')

  // 2. Plain text: group sentences into natural paragraphs (~3-4 lines or whenever there is a sentence break)
  const paragraphBlocks: string[] = []
  let currentBlock: string[] = []

  cues.forEach((c, idx) => {
    currentBlock.push(c.text)
    const endsWithTerminal = /[.!?。！？]$/.test(c.text)
    if (endsWithTerminal || currentBlock.length >= 4 || idx === cues.length - 1) {
      paragraphBlocks.push(currentBlock.join(' '))
      currentBlock = []
    }
  })
  const plainText = paragraphBlocks.join('\n\n')

  // 3. SubRip (.srt) format
  const srtBlocks = cues.map((c, i) => {
    const start = formatSrtTimestamp(c.startSec)
    const end = formatSrtTimestamp(c.startSec + c.durationSec)
    return `${i + 1}\n${start} --> ${end}\n${c.text}\n`
  })
  const srtText = srtBlocks.join('\n')

  const words = plainText.split(/\s+/).filter(Boolean).length

  return {
    lang,
    langName,
    plainText,
    timestampedText,
    srtText,
    cues,
    wordCount: words,
    lineCount: cues.length,
  }
}

/**
 * Fetches and parses transcript for a video URL and language
 */
export async function getTranscript(
  videoUrl: string,
  lang: string,
  trackHint?: SubtitleTrack
): Promise<TranscriptData> {
  const langName = trackHint?.name || lang

  // 1. If direct subtitle URL is provided (common for YouTube timedtext), fetch it directly
  if (trackHint?.url) {
    try {
      log.info(`[transcript] Fetching subtitle directly via URL for lang: ${lang}`)
      const res = await fetch(trackHint.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })

      if (res.ok) {
        const text = await res.text()
        let cues: TranscriptCue[] = []
        if (trackHint.ext === 'json3' || text.trim().startsWith('{')) {
          cues = parseJson3Subtitles(text)
        } else {
          cues = parseVttSubtitles(text)
        }

        if (cues.length > 0) {
          log.info(`[transcript] Direct fetch parsed successfully: ${cues.length} cues`)
          return formatTranscriptOutputs(cues, lang, langName)
        }
      }
    } catch (err) {
      log.warn('[transcript] Direct subtitle URL fetch failed, falling back to yt-dlp', err)
    }
  }

  // 2. Fallback: use yt-dlp to download subtitles to a temporary file
  const binError = validateBinary('yt-dlp')
  if (binError) throw new Error(binError)

  const ytdlpPath = getBinaryPath('yt-dlp')
  const tempDir = join(app.getPath('temp'), 'vidsaver_transcripts')
  await fs.mkdir(tempDir, { recursive: true })

  const tempBase = join(tempDir, `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)

  const args = [
    '--skip-download',
    '--write-sub',
    '--write-auto-sub',
    '--sub-lang', lang,
    '--sub-format', 'vtt/srt',
    '-o', `${tempBase}.%(ext)s`,
    '--no-playlist',
    '--no-warnings',
    videoUrl,
  ]

  log.info('[transcript] Fetching via yt-dlp args', { args })

  return new Promise((resolve, reject) => {
    let stderr = ''
    const proc = spawn(ytdlpPath, args, { windowsHide: true })

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on('close', async (code) => {
      try {
        // Look for the generated subtitle file: tempBase.<lang>.vtt or tempBase.vtt
        const candidateFiles = [
          `${tempBase}.${lang}.vtt`,
          `${tempBase}.${lang}.srt`,
          `${tempBase}.vtt`,
          `${tempBase}.srt`,
        ]

        let foundPath = ''
        for (const p of candidateFiles) {
          if (existsSync(p)) {
            foundPath = p
            break
          }
        }

        // Check if any matching file was created in tempDir with tempBase prefix
        if (!foundPath) {
          const files = await fs.readdir(tempDir)
          const baseName = tempBase.split(/[\\/]/).pop()!
          const match = files.find(f => f.startsWith(baseName))
          if (match) {
            foundPath = join(tempDir, match)
          }
        }

        if (!foundPath) {
          throw new Error(`Không tìm thấy phụ đề hoặc bản ghi âm (${lang}) cho video này.`)
        }

        const content = await fs.readFile(foundPath, 'utf8')
        // Clean up temp file
        await fs.unlink(foundPath).catch(() => {})

        const cues = parseVttSubtitles(content)
        if (cues.length === 0) {
          throw new Error(`Bản ghi âm (${lang}) rỗng hoặc không có nội dung chữ.`)
        }

        resolve(formatTranscriptOutputs(cues, lang, langName))
      } catch (e) {
        log.error('[transcript] yt-dlp subtitle extraction error', e, stderr)
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`Không thể khởi chạy yt-dlp để lấy phụ đề: ${err.message}`))
    })
  })
}

