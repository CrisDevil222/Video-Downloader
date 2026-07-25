import type { Translations } from './vi'

export const en: Translations = {
  // App
  appName: 'VidSaver',
  tagline: 'Download videos from social media',

  // Navigation
  navHome: 'Download',
  navSettings: 'Settings',
  navAbout: 'About',

  // URL Form
  urlPlaceholder: 'Paste YouTube, TikTok, Facebook, Instagram, or Twitter/X link...',
  btnFetchInfo: 'Get Info',
  btnFetching: 'Fetching info...',
  urlRequired: 'Please enter a video URL',
  urlInvalid: 'Invalid URL. Supported: YouTube, TikTok, Facebook, Instagram, Twitter/X',

  // Format selector
  selectFormat: 'Select quality & format',
  videoFormats: 'Video (MP4)',
  audioFormats: 'Audio (MP3)',
  qualityLabel: 'Quality',
  bitrateLabel: 'Bitrate',
  filesizeLabel: 'Estimated size',
  noFormats: 'No formats found',
  dashNote: 'Requires video + audio merge (DASH)',
  btnDownload: 'Download',
  btnSelectSavePath: 'Choose save location...',
  savingTo: 'Save to',

  // Progress
  statusPending: 'Waiting...',
  statusDownloading: 'Downloading...',
  statusMerging: 'Merging video + audio...',
  statusDone: 'Complete!',
  statusError: 'Error',
  statusCancelled: 'Cancelled',
  btnCancel: 'Cancel',
  btnCancelJob: 'Cancel download',
  btnOpenFolder: 'Open folder',
  speed: 'Speed',
  eta: 'ETA',
  jobQueueTitle: 'Download queue',
  noJobs: 'No downloads yet',

  // Settings
  settingsTitle: 'Settings',
  settingsLanguage: 'Language',
  settingsTheme: 'Theme',
  settingsThemeDark: 'Dark',
  settingsThemeLight: 'Light',
  settingsConcurrency: 'Concurrent downloads',
  settingsConcurrencyHint: 'jobs at once',
  settingsYtdlpSection: 'yt-dlp Update',
  settingsCurrentVersion: 'Current version',
  settingsCheckUpdate: 'Check for update',
  settingsChecking: 'Checking...',
  settingsUpToDate: 'Already on latest version',
  settingsUpdateAvailable: 'Update available',
  settingsDownloadUpdate: 'Download update',
  settingsDownloading: 'Downloading...',
  settingsUpdateDone: 'Update successful! Restart the app to apply.',
  settingsOpenLog: 'Open log file',
  settingsBinaryStatus: 'Binary status',
  settingsBinaryOk: 'Working',
  settingsBinaryMissing: 'Binary not found',
  settingsDefaultSavePath: 'Default save folder',

  // Disclaimer
  disclaimerTitle: 'Legal Notice',
  disclaimerBody: `VidSaver is a tool to assist in downloading videos for personal use.

By using this application, you confirm that:
• You only download videos you have the right to save or use (e.g. your own videos, copyright-free content, or content you are explicitly licensed to use).
• You will not use this application to infringe copyright, distribute unauthorized content, or violate the Terms of Service of social media platforms.
• The application author is not responsible for any misuse.

Please use responsibly.`,
  disclaimerAgree: 'I understand and agree',
  disclaimerDecline: 'Decline (Exit)',

  // Errors
  errorBinaryMissing: (name: string) => `${name}.exe not found. Please read the README for installation instructions.`,
  errorNetwork: 'Network error. Please check your internet connection and try again.',
  errorUnknown: 'An unknown error occurred.',

  // About
  aboutTitle: 'About VidSaver',
  aboutVersion: 'Version',
  aboutDescription: 'A local desktop app to download videos from social media platforms.',
  aboutPoweredBy: 'Powered by',
  aboutLegal: 'View legal notice',
}
