#!/usr/bin/env node
/**
 * scripts/download-binaries.js
 * Downloads yt-dlp.exe and ffmpeg.exe into resources/bin/
 * Run with: node scripts/download-binaries.js
 *
 * ffmpeg: downloads gyan.dev essentials build (smaller than full build)
 * yt-dlp: downloads from GitHub releases
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const BIN_DIR = path.join(__dirname, '..', 'resources', 'bin')

if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true })
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`)
    console.log(`         → ${dest}`)

    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest + '.tmp')

    function follow(url) {
      protocol.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close()
          fs.unlinkSync(dest + '.tmp')
          // Restart with redirect
          const redirectUrl = res.headers.location
          console.log(`  → Redirecting to ${redirectUrl}`)
          const newProtocol = redirectUrl.startsWith('https') ? https : http
          download(redirectUrl, dest).then(resolve).catch(reject)
          return
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          return
        }

        const total = parseInt(res.headers['content-length'] || '0')
        let downloaded = 0
        let lastPct = -1

        res.on('data', chunk => {
          downloaded += chunk.length
          if (total > 0) {
            const pct = Math.floor((downloaded / total) * 100)
            if (pct !== lastPct && pct % 10 === 0) {
              process.stdout.write(`  ${pct}% `)
              lastPct = pct
            }
          }
        })

        res.pipe(file)
        file.on('finish', () => {
          file.close()
          process.stdout.write('\n')
          fs.renameSync(dest + '.tmp', dest)
          console.log(`  ✓ Saved: ${path.basename(dest)}`)
          resolve()
        })
      }).on('error', reject)
    }

    follow(url)
  })
}

async function main() {
  // ── yt-dlp ──────────────────────────────────────────────────────────────
  const ytdlpDest = path.join(BIN_DIR, 'yt-dlp.exe')
  if (fs.existsSync(ytdlpDest)) {
    console.log('yt-dlp.exe already exists, skipping.')
  } else {
    await download(
      'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
      ytdlpDest
    )
  }

  // ── ffmpeg ───────────────────────────────────────────────────────────────
  const ffmpegDest = path.join(BIN_DIR, 'ffmpeg.exe')
  if (fs.existsSync(ffmpegDest)) {
    console.log('ffmpeg.exe already exists, skipping.')
  } else {
    console.log('\nffmpeg.exe is not bundled automatically because it is ~120MB.')
    console.log('Please download it manually:')
    console.log()
    console.log('  1. Go to: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip')
    console.log('  2. Extract the zip')
    console.log('  3. Copy bin/ffmpeg.exe into: resources/bin/ffmpeg.exe')
    console.log()
    console.log('Or use winget / scoop:')
    console.log('  winget install Gyan.FFmpeg')
    console.log('  Then copy C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe to resources/bin/')
  }

  console.log('\nDone! Check resources/bin/ for your binaries.')
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
