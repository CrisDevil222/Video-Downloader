import { vi } from './vi'
import { en } from './en'

export type Language = 'vi' | 'en'
export type { Translations } from './vi'
export { vi, en }

export const translations = { vi, en }

export function getTranslations(lang: Language) {
  return translations[lang]
}
