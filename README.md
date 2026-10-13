# VidSaver

Ứng dụng desktop Windows tải video & hình ảnh từ YouTube, TikTok, Facebook, Instagram, Twitter/X — chạy hoàn toàn local, không cần server trung gian, không cần cài đặt thêm phần mềm bổ trợ.

---

## Tính năng nổi bật

### 🌟 Hỗ trợ đa nền tảng & đa định dạng nội dung
- **TikTok**: 
  - Tải video không logo/watermark.
  - Tải trọn bộ ảnh từ bài đăng **Photo / Slideshow** (định dạng JPEG chất lượng gốc).
  - Tuỳ chọn tải kèm file âm thanh nền gốc (MP3).
  - Hỗ trợ đầy đủ link rút gọn (`vm.tiktok.com`, `vt.tiktok.com`, `tiktok.com/t/`).
- **YouTube**:
  - Video thông thường lên tới độ phân giải cao nhất (4K, 2K, 1080p 60fps...).
  - **YouTube Shorts**.
  - **YouTube Live** streams.
- **Instagram**:
  - **Reels**, **Stories**, **IGTV** và bài đăng video thông thường (`/p/`, `/reel/`, `/tv/`).
- **Facebook**:
  - Video công khai, **Facebook Reels**, link rút gọn và chia sẻ (`fb.watch`, `/share/r/`).
- **Twitter / X**:
  - Video trong tweet, GIF và các bài đăng đa phương tiện.

### 🎨 Trải nghiệm người dùng (UI/UX) hiện đại & mượt mà
- **Nhận diện link thông minh**: Tự động phát hiện nền tảng và gắn **Badge loại nội dung** (Ảnh, Video, Reel, Shorts, Live, Story, Tweet...) ngay khi nhập link và sau khi lấy thông tin.
- **Skeleton Loading**: Hiệu ứng skeleton loading mượt mà khi đang nạp thông tin media, thay thế cho spinner thông thường.
- **Hàng đợi tải xuống dạng Card**:
  - Xem trước Thumbnail, tên file gốc/tiêu đề bài viết.
  - Thanh tiến độ động theo thời gian thực (%), hiển thị tốc độ tải (Speed) và thời gian còn lại (ETA).
  - Nút huỷ riêng cho từng job đang chạy và nút mở nhanh thư mục lưu khi hoàn tất.
- **Hệ thống Toast Notification**: Thông báo pop-up nhẹ nhàng góc màn hình khi một tác vụ tải hoàn tất hoặc gặp sự cố.
- **Responsive Layout**: Giao diện tự động co giãn, hỗ trợ tối ưu ngay cả khi thu nhỏ cửa sổ.
- **Giao diện & Tiện ích**:
  - Hỗ trợ song ngữ **Tiếng Việt / English**.
  - Chế độ **Dark / Light mode** sang trọng.
  - Chuyển đổi âm thanh sang MP3 với tuỳ chọn chất lượng (128 / 192 / 320 kbps).
  - Tuỳ chỉnh số lượng tải đồng thời (1–5 jobs cùng lúc, mặc định 2–3 an toàn cho máy).

---

## Cơ chế Cập nhật Ứng dụng

VidSaver được trang bị hệ thống kiểm tra và cập nhật phiên bản 2 lớp:

1. **Cập nhật tự động (Auto-Update via GitHub Releases)**:
   - Khi khởi động, ứng dụng tự động kiểm tra các bản phát hành mới từ GitHub Releases.
   - Nếu có bản cập nhật mới thông thường (không bắt buộc), một banner thông báo nhẹ nhàng sẽ xuất hiện cho phép người dùng chọn "Tải về" hoặc "Để sau".
2. **Cơ chế Bắt buộc Cập nhật (Force Update / Minimum Version)**:
   - Ứng dụng kiểm tra file `version-info.json` trên nhánh `main` của repository và so sánh phiên bản hiện tại với `minVersion` theo chuẩn SemVer.
   - **Nếu phiên bản đang chạy < `minVersion`**: Ứng dụng sẽ hiển thị một Modal cảnh báo khóa hoàn toàn thao tác (không có nút đóng, không thể bấm ra ngoài hay dùng phím Escape để tắt). Người dùng chỉ có thể chọn **"Tải bản mới"** (mở trang GitHub Releases) hoặc **"Thoát ứng dụng"**.
3. **Cơ chế Fallback an toàn**:
   - Nếu thiết bị mất mạng, bị giới hạn truy cập (rate limit) hoặc không kết nối được GitHub API, bước kiểm tra sẽ tự động bỏ qua trong im lặng. Ứng dụng vẫn mở và hoạt động bình thường, tuyệt đối **không chặn người dùng khi mất mạng**.

---

## Dành cho User (Người dùng thông thường)

### Cài đặt
1. Vào [Releases](https://github.com/CrisDevil222/Video-Downloader/releases), tải file cài đặt mới nhất `VidSaver Setup 1.2.0.exe` (hoặc phiên bản mới hơn).
2. Chạy file vừa tải và hoàn tất các bước cài đặt.
3. Nếu Windows hiển thị màn hình cảnh báo **"Windows protected your PC"**, bấm **More info** → **Run anyway** để tiếp tục (do ứng dụng chưa gắn chứng chỉ số thương mại đắt tiền, hoàn toàn an toàn và sạch 100%).

### Hướng dẫn sử dụng
1. Copy đường dẫn video / bài đăng ảnh từ trình duyệt hoặc app.
2. Dán vào ô nhập liệu trong VidSaver. App sẽ nhận diện loại nội dung và nền tảng.
3. Bấm **Lấy thông tin**.
4. Chọn định dạng:
   - Với video: Chọn độ phân giải (1080p, 720p...) hoặc tab Âm thanh (MP3).
   - Với bài đăng ảnh TikTok: Chọn thư mục lưu trọn bộ ảnh, có thể tích chọn tải thêm file âm thanh nền.
5. Bấm **Tải xuống** và theo dõi tiến độ trong danh sách hàng đợi.

---

## Dành cho Builder (Lập trình viên & Maintainer)

### 1. Yêu cầu môi trường
- [Node.js](https://nodejs.org) LTS (khuyến nghị v20 trở lên)
- Windows 10/11 64-bit

### 2. Chuẩn bị Binaries
Tải 2 file binary bắt buộc đặt vào thư mục `resources/bin/`:
- **yt-dlp.exe**: [GitHub Releases](https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe) → `resources/bin/yt-dlp.exe`
- **ffmpeg.exe**: [Gyan.dev FFmpeg](https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip) (giải nén lấy file `ffmpeg.exe` trong `bin/`) → `resources/bin/ffmpeg.exe`

> *Lưu ý: Các binary này đã được khai báo trong `.gitignore`, không commit trực tiếp vào repo.*

### 3. Cài đặt dependencies
```bash
npm install
```

### 4. Chạy môi trường phát triển (Dev)
```bash
npm run dev
```

> **Mẹo test Force Update trong môi trường Dev:**  
> Trong terminal PowerShell, chạy:  
> ```powershell
> $env:VIDSAVER_TEST_MIN_VERSION='99.0.0'; npm run dev
> ```  
> Ứng dụng sẽ giả lập phiên bản hiện tại cũ hơn `minVersion` để hiển thị Modal chặn cập nhật.

### 5. Build đóng gói ứng dụng (Windows Installer)
```bash
npm run build:win
```
File đóng gói sẽ nằm trong thư mục `dist/`:
- `VidSaver Setup 1.2.0.exe` (Bộ cài đặt)
- `latest.yml` (Metadata phục vụ auto-updater)
- `VidSaver Setup 1.2.0.exe.blockmap`

---

## Quy trình Phát hành & Quản lý Cập nhật

Mỗi khi phát hành bản cập nhật mới:

1. **Cập nhật version**: Tăng phiên bản trong `package.json` (ví dụ `"version": "1.2.0"` lên `"1.2.1"`).
2. **Build ứng dụng**: Chạy lệnh `npm run build:win`.
3. **Tạo GitHub Release**:
   - Truy cập: `https://github.com/CrisDevil222/Video-Downloader/releases`
   - Tạo Release mới với Tag tương ứng (ví dụ `v1.2.0`).
   - **BẮT BUỘC tải lên 3 files** từ thư mục `dist/` vào Assets:
     1. `VidSaver Setup 1.2.0.exe`
     2. `latest.yml`
     3. `VidSaver Setup 1.2.0.exe.blockmap`
   - Publish Release.

### 🔒 Cách ép buộc toàn bộ người dùng phải cập nhật (Force Update)
Khi phát hành bản vá lỗi nghiêm trọng hoặc bản vá bảo mật và **bắt buộc người dùng không được dùng bản cũ nữa**:
1. Mở file [version-info.json](./version-info.json) ở thư mục gốc của repo:
   ```json
   {
     "minVersion": "1.2.0",
     "latestVersion": "1.2.0",
     "releaseUrl": "https://github.com/CrisDevil222/Video-Downloader/releases/latest",
     "message": "Vui lòng nâng cấp lên bản mới để khắc phục lỗi tương thích và tiếp tục sử dụng."
   }
   ```
2. Thay đổi giá trị `minVersion` thành phiên bản tối thiểu bạn yêu cầu (ví dụ `"1.2.0"`).
3. Commit và push file này lên nhánh `main` của repository GitHub:
   ```bash
   git add version-info.json
   git commit -m "chore: bump minVersion to 1.2.0"
   git push
   ```
4. **Không cần build lại app!** Mọi máy người dùng đang chạy phiên bản nhỏ hơn `minVersion` khi mở app lên sẽ ngay lập tức bị chặn lại và hướng dẫn tải bản mới.

---

## Cấu trúc thư mục

```
src/
├── main/                   Electron main process (Node.js)
│   ├── index.ts            Entry chính, cấu hình cửa sổ & autoUpdater
│   ├── ipcHandlers.ts      Đăng ký các kênh giao tiếp IPC an toàn
│   ├── cleanup.ts          Tự động dọn dẹp file tạm khi khởi động
│   └── services/
│       ├── binaryPath.ts   Định vị đường dẫn yt-dlp & ffmpeg
│       ├── ytdlpService.ts Quản lý gọi lệnh yt-dlp, phân tích định dạng
│       ├── photoService.ts Xử lý tải ảnh slideshow TikTok & audio nền
│       ├── ffmpegService.ts Xử lý kiểm tra và ghép audio/video
│       ├── downloadQueue.ts Quản lý hàng đợi tải xuống, concurrency, tiến độ
│       ├── settingsService.ts Lưu trữ cài đặt người dùng vào userData
│       ├── updaterService.ts Tự động cập nhật binary yt-dlp
│       └── versionPolicyService.ts Kiểm tra chính sách phiên bản (Force Update)
├── preload/
│   └── preload.ts          contextBridge exposing API an toàn qua IPC
├── renderer/               Giao diện người dùng React + Vite
│   ├── components/         UrlInputForm, FormatSelector, DownloadProgress, InfoSkeleton, ToastHost...
│   ├── hooks/              useDownloadJob quản lý tiến độ realtime
│   ├── store/              Zustand settingsStore & toastStore
│   ├── i18n/               Đa ngôn ngữ Tiếng Việt & English
│   └── styles/             Hệ thống CSS giao diện với animations & responsive
└── shared/
    └── urlDetect.ts        Module nhận diện URL & phân loại media dùng chung
resources/
└── bin/
    ├── yt-dlp.exe          (Tải thủ công)
    └── ffmpeg.exe          (Tải thủ công)
```

---

## Giấy phép & Pháp lý
Xem chi tiết tại [LEGAL.md](./LEGAL.md). Ứng dụng được tạo ra cho mục đích sử dụng cá nhân hợp pháp. Người dùng tự chịu trách nhiệm tuân thủ bản quyền và điều khoản dịch vụ của từng nền tảng.
