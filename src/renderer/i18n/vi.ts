export const vi = {
  // App
  appName: 'VidSaver',
  tagline: 'Tải video từ mạng xã hội',

  // Navigation
  navHome: 'Tải video',
  navSettings: 'Cài đặt',
  navAbout: 'Về ứng dụng',

  // URL Form
  urlPlaceholder: 'Dán link YouTube, TikTok, Facebook, Instagram, Twitter/X...',
  btnFetchInfo: 'Lấy thông tin',
  btnFetching: 'Đang lấy thông tin...',
  urlRequired: 'Vui lòng nhập URL video',
  urlInvalid: 'URL không hợp lệ. Hỗ trợ: YouTube, TikTok, Facebook, Instagram, Twitter/X',

  // Format selector
  selectFormat: 'Chọn chất lượng & định dạng',
  videoFormats: 'Video (MP4)',
  audioFormats: 'Âm thanh (MP3)',
  qualityLabel: 'Chất lượng',
  bitrateLabel: 'Bitrate',
  filesizeLabel: 'Kích thước ước tính',
  noFormats: 'Không tìm thấy định dạng nào',
  dashNote: 'Cần ghép video + âm thanh (DASH)',
  btnDownload: 'Tải xuống',
  btnSelectSavePath: 'Chọn nơi lưu...',
  savingTo: 'Lưu vào',

  // Photo download
  photoTab: '🖼 Tải ảnh',
  photoCount: (n: number) => `${n} ảnh trong bài đăng`,
  btnDownloadPhotos: 'Tải tất cả ảnh (.jpg)',
  downloadAudioLabel: 'Tải kèm nhạc nền (.mp3)',
  downloadingPhotos: 'Đang tải ảnh...',
  photoSavedTo: 'Lưu vào thư mục',
  chooseFolder: 'Chọn thư mục lưu...',

  // Progress
  statusPending: 'Đang chờ...',
  statusDownloading: 'Đang tải...',
  statusMerging: 'Đang ghép video + âm thanh...',
  statusDone: 'Hoàn thành!',
  statusError: 'Lỗi',
  statusCancelled: 'Đã hủy',
  btnCancel: 'Hủy',
  btnCancelJob: 'Hủy tải',
  btnOpenFolder: 'Mở thư mục',
  speed: 'Tốc độ',
  eta: 'Còn lại',
  jobQueueTitle: 'Hàng đợi tải xuống',
  noJobs: 'Chưa có tác vụ nào',
  statusDownloadingPhotos: 'Đang tải ảnh...',

  // Settings
  settingsTitle: 'Cài đặt',
  settingsLanguage: 'Ngôn ngữ',
  settingsTheme: 'Giao diện',
  settingsThemeDark: 'Tối',
  settingsThemeLight: 'Sáng',
  settingsConcurrency: 'Số tải đồng thời',
  settingsConcurrencyHint: 'job cùng lúc',
  settingsYtdlpSection: 'Cập nhật yt-dlp',
  settingsCurrentVersion: 'Phiên bản hiện tại',
  settingsCheckUpdate: 'Kiểm tra cập nhật',
  settingsChecking: 'Đang kiểm tra...',
  settingsUpToDate: 'Đang dùng phiên bản mới nhất',
  settingsUpdateAvailable: 'Có phiên bản mới',
  settingsDownloadUpdate: 'Tải bản mới',
  settingsDownloading: 'Đang tải...',
  settingsUpdateDone: 'Cập nhật thành công! Khởi động lại app để áp dụng.',
  settingsOpenLog: 'Mở file log',
  settingsBinaryStatus: 'Trạng thái binary',
  settingsBinaryOk: 'Hoạt động bình thường',
  settingsBinaryMissing: 'Không tìm thấy binary',
  settingsDefaultSavePath: 'Thư mục lưu mặc định',

  // Disclaimer
  disclaimerTitle: 'Thông báo pháp lý',
  disclaimerBody: `VidSaver là công cụ hỗ trợ tải video cho mục đích cá nhân.

Bằng cách sử dụng ứng dụng này, bạn xác nhận rằng:
• Bạn chỉ tải video mà bạn có quyền lưu trữ hoặc sử dụng (ví dụ: video của chính bạn, video miễn phí bản quyền, hoặc video bạn được cấp phép rõ ràng).
• Bạn không sử dụng ứng dụng này để vi phạm bản quyền, phân phối nội dung trái phép, hoặc vi phạm điều khoản dịch vụ của các nền tảng mạng xã hội.
• Tác giả ứng dụng không chịu trách nhiệm về bất kỳ hành vi lạm dụng nào.

Hãy sử dụng có trách nhiệm.`,
  disclaimerAgree: 'Tôi hiểu và đồng ý',
  disclaimerDecline: 'Không đồng ý (Thoát)',

  // Errors
  errorBinaryMissing: (name: string) => `Không tìm thấy ${name}.exe. Vui lòng đọc README để tải và cài đặt.`,
  errorNetwork: 'Lỗi kết nối mạng. Kiểm tra internet và thử lại.',
  errorUnknown: 'Đã xảy ra lỗi không xác định.',

  // About
  aboutTitle: 'Về VidSaver',
  aboutVersion: 'Phiên bản',
  aboutDescription: 'Ứng dụng tải video từ mạng xã hội chạy hoàn toàn local.',
  aboutPoweredBy: 'Được hỗ trợ bởi',
  aboutLegal: 'Xem điều khoản pháp lý',
}

export type Translations = typeof vi
