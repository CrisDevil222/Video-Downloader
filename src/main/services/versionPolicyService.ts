import { app } from 'electron'
import log from 'electron-log'
import * as semver from 'semver'

const REPO = 'CrisDevil222/Video-Downloader'
export const VERSION_INFO_URL = `https://raw.githubusercontent.com/${REPO}/main/version-info.json`
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`
const FETCH_TIMEOUT_MS = 8000

/** Plain, IPC-safe result (only string/boolean fields). */
export interface VersionPolicyResult {
  /** false when the check could not be performed (offline, rate limit...) — app must keep working */
  checked: boolean
  currentVersion: string
  minVersion: string
  latestVersion: string
  /** current < minVersion → app must be blocked */
  forceUpdate: boolean
  /** current < latestVersion (soft update) */
  hasUpdate: boolean
  releaseUrl: string
  message: string
}

function emptyResult(currentVersion: string, message = ''): VersionPolicyResult {
  return {
    checked: false,
    currentVersion,
    minVersion: '',
    latestVersion: '',
    forceUpdate: false,
    hasUpdate: false,
    releaseUrl: RELEASES_URL,
    message,
  }
}

function cleanVersion(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : ''
  return semver.valid(semver.coerce(s)) ?? ''
}

/**
 * Fetches version-info.json from GitHub and compares with the running version using semver.
 * NEVER throws: on any failure returns { checked: false } so the user is never blocked.
 */
export async function checkVersionPolicy(): Promise<VersionPolicyResult> {
  const currentVersion = app.getVersion()
  try {
    // Dev-only test hook: VIDSAVER_TEST_MIN_VERSION=99.0.0 npm run dev
    const testMin = !app.isPackaged ? process.env['VIDSAVER_TEST_MIN_VERSION'] : undefined
    if (testMin) {
      const min = cleanVersion(testMin)
      const cur = semver.valid(semver.coerce(currentVersion)) ?? '0.0.0'
      return {
        ...emptyResult(currentVersion), checked: true, minVersion: min, latestVersion: min,
        forceUpdate: !!min && semver.lt(cur, min), hasUpdate: !!min && semver.lt(cur, min),
      }
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(`${VERSION_INFO_URL}?t=${Date.now()}`, {
        headers: { 'User-Agent': 'VidSaver', 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) {
      log.warn('[VersionPolicy] HTTP', res.status)
      return emptyResult(currentVersion)
    }
    const raw = (await res.json()) as Record<string, unknown>
    const minVersion = cleanVersion(raw?.minVersion)
    const latestVersion = cleanVersion(raw?.latestVersion)
    const current = semver.valid(semver.coerce(currentVersion))
    if (!current) return emptyResult(currentVersion)

    const forceUpdate = !!minVersion && semver.lt(current, minVersion)
    const hasUpdate = !!latestVersion && semver.lt(current, latestVersion)
    return {
      checked: true,
      currentVersion,
      minVersion,
      latestVersion,
      forceUpdate,
      hasUpdate,
      releaseUrl: typeof raw?.releaseUrl === 'string' && raw.releaseUrl.startsWith('https://')
        ? raw.releaseUrl
        : RELEASES_URL,
      message: typeof raw?.message === 'string' ? raw.message : '',
    }
  } catch (err) {
    log.warn('[VersionPolicy] check skipped:', err instanceof Error ? err.message : String(err))
    return emptyResult(currentVersion)
  }
}
