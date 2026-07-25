import { spawn } from 'child_process'
import log from 'electron-log'
import { getBinaryPath } from './binaryPath'

export interface FfmpegMuxOptions {
  videoPath: string
  audioPath: string
  outputPath: string
}

/**
 * Fallback muxer in case yt-dlp can't handle the merge itself.
 * Uses ffmpeg directly to combine a video-only and audio-only file.
 */
export function muxVideoAudio(options: FfmpegMuxOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getBinaryPath('ffmpeg')
    const { videoPath, audioPath, outputPath } = options

    const args = [
      '-y',
      '-i', videoPath,
      '-i', audioPath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-strict', 'experimental',
      outputPath
    ]

    log.info('[ffmpeg] muxVideoAudio', args.join(' '))

    const proc = spawn(ffmpegPath, args, { windowsHide: true })

    proc.stderr.on('data', (chunk: Buffer) => {
      log.debug('[ffmpeg] stderr:', chunk.toString().trim())
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to launch ffmpeg: ${err.message}`))
    })
  })
}

/**
 * Gets ffmpeg version string. Used to verify binary is working.
 */
export async function getFfmpegVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getBinaryPath('ffmpeg')
    const proc = spawn(ffmpegPath, ['-version'], { windowsHide: true })

    let out = ''
    proc.stdout.on('data', (d: Buffer) => { out += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { out += d.toString() })

    proc.on('close', (code) => {
      if (code === 0) {
        const match = /ffmpeg version ([\w.-]+)/.exec(out)
        resolve(match ? match[1] : 'unknown')
      } else {
        reject(new Error(`ffmpeg -version failed with code ${code}`))
      }
    })

    proc.on('error', reject)
  })
}
