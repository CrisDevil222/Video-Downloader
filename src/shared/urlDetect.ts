/**
 * Shared URL detection (used by renderer for validation + badge, and by main process).
 * Pure functions, no platform APIs.
 */

export type Platform =
  | 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'twitter' | 'twitch' | 'vimeo' | 'unknown'

export type ContentKind =
  | 'video' | 'short' | 'live' | 'reel' | 'story' | 'igtv' | 'post' | 'tweet' | 'photo' | 'unknown'

export interface UrlDetection {
  supported: boolean
  platform: Platform
  kind: ContentKind
  /** True when the link is known to point at an image/slideshow post */
  isPhoto: boolean
}

const HOSTS: { platform: Platform; match: RegExp }[] = [
  { platform: 'youtube', match: /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/ },
  { platform: 'tiktok', match: /(^|\.)tiktok\.com$/ },
  { platform: 'instagram', match: /(^|\.)(instagram\.com|instagr\.am)$/ },
  { platform: 'facebook', match: /(^|\.)(facebook\.com|fb\.watch|fb\.com)$/ },
  { platform: 'twitter', match: /(^|\.)(twitter\.com|x\.com|t\.co)$/ },
  { platform: 'twitch', match: /(^|\.)twitch\.tv$/ },
  { platform: 'vimeo', match: /(^|\.)vimeo\.com$/ },
]

export function detectUrl(raw: string): UrlDetection {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    return { supported: false, platform: 'unknown', kind: 'unknown', isPhoto: false }
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { supported: false, platform: 'unknown', kind: 'unknown', isPhoto: false }
  }
  const host = u.hostname.toLowerCase()
  const path = u.pathname.toLowerCase()
  const found = HOSTS.find(h => h.match.test(host))
  if (!found) return { supported: false, platform: 'unknown', kind: 'unknown', isPhoto: false }

  const platform = found.platform
  let kind: ContentKind = 'video'

  switch (platform) {
    case 'youtube':
      if (/^\/shorts\//.test(path)) kind = 'short'
      else if (/^\/live\//.test(path) || /^\/(@[^/]+|c\/[^/]+|channel\/[^/]+)\/live/.test(path)) kind = 'live'
      break
    case 'tiktok':
      if (/\/photo\//.test(path)) kind = 'photo'
      break
    case 'instagram':
      if (/^\/(reel|reels)\//.test(path)) kind = 'reel'
      else if (/^\/stories\//.test(path)) kind = 'story'
      else if (/^\/tv\//.test(path)) kind = 'igtv'
      else if (/^\/p\//.test(path)) kind = 'post'
      break
    case 'facebook':
      if (/^\/reel\//.test(path) || /^\/share\/r\//.test(path)) kind = 'reel'
      else if (/^\/share\/p\//.test(path) || /^\/photo/.test(path)) kind = 'post'
      break
    case 'twitter':
      kind = 'tweet'
      break
    default:
      break
  }

  return { supported: true, platform, kind, isPhoto: kind === 'photo' }
}

/** Human readable label for the "content type" badge (Vietnamese). */
export function kindLabel(kind: ContentKind, isPhoto = false): string {
  if (isPhoto) return 'Ảnh'
  switch (kind) {
    case 'photo': return 'Ảnh'
    case 'short': return 'Shorts'
    case 'live': return 'Live'
    case 'reel': return 'Reel'
    case 'story': return 'Story'
    case 'igtv': return 'IGTV'
    case 'post': return 'Bài đăng'
    case 'tweet': return 'Tweet'
    case 'video': return 'Video'
    default: return 'Nội dung'
  }
}
