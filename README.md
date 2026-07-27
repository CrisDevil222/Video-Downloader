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

## Dành cho Builder (người build app từ source code)

Phần này dành cho ai muốn tự build lại app từ source code (không cần nếu bạn chỉ tải file `.exe` có sẵn ở mục "Dành cho User" bên dưới).

### 1. Yêu cầu môi trường
- [Node.js](https://nodejs.org) bản LTS (khuyến nghị v20 trở lên)
- Windows 10/11 64-bit

### 2. Tải binary bắt buộc

**yt-dlp.exe:**
https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe
Lưu vào: `resources/bin/yt-dlp.exe`

**ffmpeg.exe (static build Windows 64-bit):**
https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
Giải nén, lấy file `ffmpeg.exe` trong thư mục `bin/`.
Lưu vào: `resources/bin/ffmpeg.exe`

> **Lưu ý:** ffmpeg.exe ~120MB. Cả hai file này bị `.gitignore` — không commit lên repo.

### 3. Cài đặt dependencies
```bash
npm install
```

### 4. Chạy dev mode
```bash
npm run dev
```
App sẽ mở cửa sổ Electron với hot-reload. DevTools tự mở trong dev mode.

> **Nếu chưa có `resources/bin/yt-dlp.exe` hoặc `ffmpeg.exe`:** App vẫn mở được nhưng sẽ hiển thị cảnh báo trong Settings → Binary Status. Các chức năng tải video sẽ báo lỗi.

### 5. Build ra file .exe (Windows Installer)
```bash
npm run build:win
```
File `.exe` sẽ xuất hiện tại: `dist/VidSaver Setup <version>.exe`, kèm theo `latest.yml` và `.blockmap` (dùng cho tính năng auto-update).

Installer dạng NSIS — cho phép user chọn thư mục cài đặt, tạo shortcut Desktop.

## Cách phát hành bản cập nhật mới (Auto-Update)

Để tính năng tự động cập nhật (electron-updater) hoạt động, bạn (chủ dự án) cần làm theo đúng quy trình sau mỗi khi ra mắt phiên bản mới:

1. **Tăng version**: Mở file `package.json` và tăng phiên bản (ví dụ từ `"version": "1.0.0"` lên `"1.0.1"`).
2. **Build ứng dụng**: Chạy lệnh `npm run build:win`.
3. **Lấy file build**: Sau khi build xong, vào thư mục `dist/`. Bạn sẽ thấy các file quan trọng vừa được tạo ra:
   - `VidSaver Setup 1.0.1.exe` (File cài đặt chính)
   - `latest.yml` (File chứa metadata để app cũ biết có bản mới)
   - `*.blockmap` (File hỗ trợ update nhanh gọn nhẹ, nếu có)
4. **Tạo GitHub Release**:
   - Lên kho lưu trữ GitHub: `CrisDevil222/Video-Downloader`
   - Tạo một Release mới (Release title và Tag name nên đặt theo chuẩn, ví dụ `v1.0.1`).
   - **BẮT BUỘC**: Kéo thả (upload) **CẢ** file `.exe`, file `latest.yml`, và file `.blockmap` vào phần đính kèm (Assets) của Release. *Nếu thiếu `latest.yml`, app người dùng sẽ không bao giờ phát hiện được bản cập nhật này.*
5. **Hoàn tất**: Bấm Publish release. Người dùng hiện tại mở app lên (hoặc bấm Kiểm tra cập nhật) sẽ tự động nhận được thông báo!

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

### Bảo mật
- `contextIsolation: true` — renderer không có quyền truy cập Node.js
- `nodeIntegration: false` — chỉ API được expose qua `contextBridge` mới dùng được
- `webSecurity: true` — giữ CSP của Electron

---

## Dành cho User (chỉ muốn dùng app, không cần build)

### Cài đặt
1. Vào [Releases](https://github.com/CrisDevil222/Video-Downloader/releases), tải file `VidSaver Setup x.x.x.exe` (bản mới nhất).
2. Chạy file vừa tải, làm theo hướng dẫn cài đặt.
3. Nếu Windows hiện cảnh báo **"Windows protected your PC"**, bấm **More info** → **Run anyway** để tiếp tục (do app chưa có chữ ký số thương mại, không phải app có vấn đề).

### Cập nhật
App tự động kiểm tra bản mới mỗi khi mở lên. Khi có bản mới, app sẽ hỏi bạn có muốn tải và cài ngay không — không cần tự vào GitHub tải lại thủ công. Cũng có thể chủ động kiểm tra qua trang **About** trong app.

### Sử dụng
1. Dán link video (YouTube, TikTok, Facebook, Instagram, Twitter/X) vào ô nhập.
2. Bấm **Lấy thông tin** để xem danh sách chất lượng khả dụng.
3. Chọn định dạng (MP4/MP3) và chất lượng mong muốn.
4. Bấm tải — theo dõi tiến độ trong "Hàng đợi tải xuống".

## Legal
Xem [LEGAL.md](./LEGAL.md)
