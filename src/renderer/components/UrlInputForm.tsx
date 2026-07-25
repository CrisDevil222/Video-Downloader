import React, { useState, useRef } from 'react'
import type { VideoInfo } from '../types/electron'
import { useSettingsStore } from '../store/settingsStore'

interface UrlInputFormProps {
  onInfoFetched: (info: VideoInfo) => void
  onError: (msg: string) => void
}

const SUPPORTED_DOMAINS = [
  'youtube.com', 'youtu.be',
  'tiktok.com',
  'facebook.com', 'fb.watch',
  'instagram.com',
  'twitter.com', 'x.com',
  'twitch.tv',
  'vimeo.com',
]

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return SUPPORTED_DOMAINS.some(d => u.hostname.includes(d))
  } catch {
    return false
  }
}

function getPlatformEmoji(url: string): string {
  if (/youtube|youtu\.be/.test(url)) return '▶️'
  if (/tiktok/.test(url)) return '🎵'
  if (/facebook|fb\.watch/.test(url)) return '👤'
  if (/instagram/.test(url)) return '📷'
  if (/twitter|x\.com/.test(url)) return '🐦'
  if (/twitch/.test(url)) return '🎮'
  if (/vimeo/.test(url)) return '🎬'
  return '🌐'
}

export const UrlInputForm: React.FC<UrlInputFormProps> = ({ onInfoFetched, onError }) => {
  const t = useSettingsStore(s => s.t)
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [validationError, setValidationError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setUrl(text)
      setValidationError('')
    } catch {
      inputRef.current?.focus()
    }
  }

  const handleFetch = async () => {
    const trimmed = url.trim()
    if (!trimmed) {
      setValidationError(t.urlRequired)
      return
    }
    if (!isValidUrl(trimmed)) {
      setValidationError(t.urlInvalid)
      return
    }
    setValidationError('')
    setIsLoading(true)

    try {
      const result = await window.electronAPI.getVideoInfo(trimmed)
      if (result.success && result.data) {
        onInfoFetched(result.data)
      } else {
        onError(result.error ?? t.errorUnknown)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : t.errorUnknown)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFetch()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    if (validationError) setValidationError('')
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">🔗</div>
        <h2 style={{ fontSize: '1rem' }}>
          {url ? getPlatformEmoji(url) + ' ' : ''}
          {t.navHome}
        </h2>
      </div>

      <div className="input-group">
        <div className="input-row">
          <input
            ref={inputRef}
            id="url-input"
            type="url"
            className={`input input-url${validationError ? ' error' : ''}`}
            placeholder={t.urlPlaceholder}
            value={url}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            spellCheck={false}
            autoComplete="off"
          />
          <div className="input-action flex-row" style={{ gap: '6px' }}>
            {!url && (
              <button
                id="btn-paste-url"
                className="btn btn-ghost btn-sm"
                onClick={handlePaste}
                title="Paste from clipboard"
              >
                📋
              </button>
            )}
            {url && (
              <button
                id="btn-clear-url"
                className="btn btn-ghost btn-sm"
                onClick={() => { setUrl(''); setValidationError('') }}
                title="Clear"
              >
                ✕
              </button>
            )}
            <button
              id="btn-fetch-info"
              className="btn btn-primary btn-sm"
              onClick={handleFetch}
              disabled={isLoading || !url.trim()}
              style={{ minWidth: 90 }}
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{ width: 12, height: 12 }} />
                  {t.btnFetching.split('...')[0]}
                </>
              ) : t.btnFetchInfo}
            </button>
          </div>
        </div>

        {validationError && (
          <div className="alert alert-error" style={{ padding: '8px 12px', fontSize: 12 }}>
            ⚠ {validationError}
          </div>
        )}
      </div>

      {/* Platform badges */}
      <div className="flex-row" style={{ marginTop: 12, flexWrap: 'wrap', gap: 6 }}>
        {['▶️ YouTube', '🎵 TikTok', '👤 Facebook', '📷 Instagram', '🐦 Twitter/X'].map(p => (
          <button 
            key={p} 
            className="badge badge-sd" 
            style={{ cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', transition: 'all 0.2s ease-in-out' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            onClick={() => {
              if (!url) {
                const domain = p.includes('YouTube') ? 'https://youtube.com/' : p.includes('TikTok') ? 'https://tiktok.com/' : p.includes('Facebook') ? 'https://facebook.com/' : p.includes('Instagram') ? 'https://instagram.com/' : 'https://x.com/';
                setUrl(domain);
              }
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
