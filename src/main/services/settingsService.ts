import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import log from 'electron-log'

export interface AppSettings {
  hasAgreedToDisclaimer: boolean
  language: 'vi' | 'en'
  theme: 'dark' | 'light'
  concurrency: number
  defaultSavePath: string
}

function getDefaultSettings(): AppSettings {
  return {
    hasAgreedToDisclaimer: false,
    language: 'vi',
    theme: 'dark',
    concurrency: 2,
    defaultSavePath: app.getPath('downloads'),
  }
}

let settingsCache: AppSettings | null = null

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function getSettings(): AppSettings {
  if (settingsCache) return settingsCache

  const path = getSettingsPath()
  try {
    if (existsSync(path)) {
      const raw = readFileSync(path, 'utf-8')
      settingsCache = { ...getDefaultSettings(), ...JSON.parse(raw) }
    } else {
      settingsCache = { ...getDefaultSettings() }
    }
  } catch (err) {
    log.warn('[Settings] Failed to read settings, using defaults', err)
    settingsCache = { ...getDefaultSettings() }
  }

  return settingsCache!
}

export function setSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  settingsCache = { ...current, ...partial }

  try {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(getSettingsPath(), JSON.stringify(settingsCache, null, 2), 'utf-8')
  } catch (err) {
    log.error('[Settings] Failed to save settings', err)
  }

  return settingsCache
}
