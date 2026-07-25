# VidSaver

Ứng dụng desktop Windows tải video từ YouTube, TikTok, Facebook, Instagram, Twitter/X — chạy hoàn toàn local, không cần server, không cần cài thêm phần mềm.

## Tính năng

- ✅ Tải video MP4 (tới 4K/2K khi nguồn có sẵn)
- ✅ Convert sang MP3 (128/192/320 kbps)
- ✅ Xem danh sách format thực tế của từng video
- ✅ Tải nhiều video cùng lúc (1–5 job song song)
- ✅ Realtime progress bar + tốc độ + ETA
- ✅ Hủy job bất kỳ lúc nào
- ✅ Giao diện song ngữ Việt/Anh
- ✅ Dark / Light mode
- ✅ Tự động cập nhật yt-dlp

## Yêu cầu trước khi build

### 1. Tải yt-dlp.exe
```
https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe
```
Lưu vào: `resources/bin/yt-dlp.exe`

### 2. Tải ffmpeg.exe (static build Windows 64-bit)
```
https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
```
Giải nén, lấy file `ffmpeg.exe` trong thư mục `bin/`.  
Lưu vào: `resources/bin/ffmpeg.exe`

> **Lưu ý:** ffmpeg.exe ~120MB. Cả hai file này bị `.gitignore` — không commit lên repo.

## Cài đặt dependencies

```bash
npm install
```

## Chạy dev

```bash
npm run dev
```

App sẽ mở cửa sổ Electron với hot-reload. DevTools tự mở trong dev mode.

> **Nếu chưa có `resources/bin/yt-dlp.exe` hoặc `ffmpeg.exe`:** App vẫn mở được nhưng sẽ hiển thị cảnh báo trong Settings → Binary Status. Các chức năng tải video sẽ báo lỗi.

## Build .exe (Windows Installer)

```bash
npm run build:win
```

File `.exe` sẽ xuất hiện tại: `dist/VidSaver Setup 1.0.0.exe`

Installer dạng NSIS — cho phép user chọn thư mục cài đặt, tạo shortcut Desktop.

## Cấu trúc thư mục

```
src/
├── main/                   Electron main process (Node.js)
│   ├── index.ts            Entry, tạo BrowserWindow
│   ├── ipcHandlers.ts      Đăng ký IPC handlers
│   └── services/
│       ├── binaryPath.ts   Resolve đường dẫn yt-dlp/ffmpeg (dev vs packaged)
│       ├── ytdlpService.ts Gọi yt-dlp, parse format, parse progress
│       ├── ffmpegService.ts Mux thủ công (fallback)
│       ├── downloadQueue.ts Queue job, concurrency, cancel, timeout
│       ├── settingsService.ts Lưu settings vào userData/settings.json
│       └── updaterService.ts Kiểm tra & tải bản mới yt-dlp từ GitHub
├── preload/
│   └── preload.ts          contextBridge — expose API an toàn cho renderer
└── renderer/               React app (Vite)
    ├── components/
    ├── hooks/
    ├── store/
    ├── i18n/
    └── types/

resources/
└── bin/
    ├── yt-dlp.exe          (tải thủ công, xem hướng dẫn trên)
    └── ffmpeg.exe          (tải thủ công, xem hướng dẫn trên)
```

## Bảo mật

- `contextIsolation: true` — renderer không có quyền truy cập Node.js
- `nodeIntegration: false` — chỉ API được expose qua `contextBridge` mới dùng được
- `webSecurity: true` — giữ CSP của Electron

## Legal

Xem [LEGAL.md](./LEGAL.md)
