import { create } from 'zustand'
import type { Language } from '../i18n'
import { getTranslations } from '../i18n'

export interface AppSettings {
  hasAgreedToDisclaimer: boolean
  language: Language
  theme: 'dark' | 'light'
  concurrency: number
  defaultSavePath: string
}

interface SettingsStore extends AppSettings {
  t: ReturnType<typeof getTranslations>
  isLoaded: boolean
  setLanguage: (lang: Language) => void
  setTheme: (theme: 'dark' | 'light') => void
  setConcurrency: (n: number) => void
  agreeDisclaimer: () => void
  loadFromMain: (settings: AppSettings) => void
  saveToMain: (partial: Partial<AppSettings>) => void
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  hasAgreedToDisclaimer: false,
  language: 'vi',
  theme: 'dark',
  concurrency: 2,
  defaultSavePath: '',
  t: getTranslations('vi'),
  isLoaded: false,

  loadFromMain: (settings: AppSettings) => {
    set({
      ...settings,
      t: getTranslations(settings.language),
      isLoaded: true,
    })
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', settings.theme)
  },

  saveToMain: async (partial: Partial<AppSettings>) => {
    await window.electronAPI.setSettings(partial as Record<string, unknown>)
    set(partial)
    if (partial.language) {
      set({ t: getTranslations(partial.language) })
    }
    if (partial.theme) {
      document.documentElement.setAttribute('data-theme', partial.theme)
    }
  },

  setLanguage: (lang: Language) => {
    get().saveToMain({ language: lang })
  },

  setTheme: (theme: 'dark' | 'light') => {
    get().saveToMain({ theme })
  },

  setConcurrency: (n: number) => {
    get().saveToMain({ concurrency: n })
  },

  agreeDisclaimer: () => {
    get().saveToMain({ hasAgreedToDisclaimer: true })
  },
}))
