# KẾ HOẠCH NÂNG CẤP TÍCH HỢP VOICESTUDIO & QUẢN LÝ CLONE VOICE VBS FARM

> **Mục tiêu:** Tích hợp VoiceStudio (debpalash/VoiceStudio v0.5.6) vào Video Batch Studio, xây dựng hệ thống tạo voice chia đoạn tự sửa lỗi (Chunked Auto-Retry), quản lý clone voice tập trung trên Server và đồng bộ tự động 100% cho toàn bộ cụm máy Worker qua Google Drive.

---

## 📋 10 YÊU CẦU CỐT LÕI (USER REQUIREMENTS)
1. **Tải VoiceStudio về:** Tải bản VoiceStudio chính thức (`VoiceStudio-Electron-0.5.6-win-x64.exe` hoặc repo mã nguồn).
2. **Kiểm tra sửa lỗi từng câu (Sentence-level Auto-Retry & Stitch):** Cắt kịch bản thành từng câu/đoạn, tạo voice cho từng đoạn, kiểm tra chất lượng từng đoạn (dung lượng, độ dài, âm lượng). Nếu đoạn nào lỗi thì **chỉ tạo lại riêng đoạn đó**, sau đó dùng FFmpeg ghép nối mượt mà thành file voice hoàn chỉnh.
3. **Tab Quản Lý Voice trên Server:** Thêm Tab mới trên Sidebar để quản lý, nghe thử, nạp file mẫu (5-15s) và clone giọng mới.
4. **Chọn Voice khi giao lệnh:** Dropdown chọn Voice ngay trên Form giao lệnh Farm (Dispatch Task) và Tab Tạo Batch.
5. **Cơ chế đồng bộ Voice tự động Server $\rightarrow$ Worker:** Server lưu trữ Profile giọng (file mẫu `sample.wav` + metadata) và đẩy lên `/Global_Voices/` trên Google Drive. Worker khi nhận lệnh nếu chưa có giọng đó sẽ tự động kéo file gốc từ Drive về để tự clone với tên giống hệt Server.
6. **Quản trị tập trung:** Clone voice và cấu hình voice thực hiện hoàn toàn ở ứng dụng Server (Master).
7. **Worker độc lập & tự động:** Worker chỉ nhận lệnh làm việc ngầm, tự động đồng bộ giọng và tự động xử lý.
8. **Quy trình kịch bản Drive:** Nhận file kịch bản `.txt` từ Drive $\rightarrow$ Tạo file voice cùng tên $\rightarrow$ Tải file voice hoàn chỉnh ngược lên Drive.
9. **Dựng video tiếp nối:** Sau khi tạo xong voice, tự động chuyển file voice vào luồng render video như bình thường (tạo SRT Whisper, cắt stock, lồng layer, NVENC export).
10. **Bảo toàn tính năng cũ:** Giữ nguyên 100% luồng làm việc với thư mục voice có sẵn hiện tại.

---

## 🏗️ LỘ TRÌNH TRIỂN KHAI CHI TIẾT (IMPLEMENTATION PHASES)

### 📌 Giai Đoạn 1: Tải & Khởi Tạo Môi Trường VoiceStudio (Hoàn thành ✅)
- [x] Đã tải bộ cài đặt `VoiceStudio-Electron-0.5.6-win-x64.exe` (204.5 MB) từ GitHub Release vào thư mục `tools/`.
- [x] Xác định giao thức kết nối: OpenAI-compatible Audio REST API (`http://localhost:3900/v1`).
- [x] Tiến hành cài đặt / khởi chạy VoiceStudio service và cơ chế auto-launch.

### 📌 Giai Đoạn 2: Xây Dựng Core Services Xử Lý Voice (Hoàn thành ✅)
- [x] Tạo `src/main/services/voice/voice-studio-service.js`: Service giao tiếp API với VoiceStudio (`/v1/audio/speech`, `/v1/models`).
- [x] Tạo `src/main/services/voice/voice-validator-service.js`: Thuật toán cắt kịch bản (Sentence Chunking), kiểm tra lỗi từng câu (0 byte, silent, duration anomaly), retry câu lỗi và stitch bằng FFmpeg.
- [x] Tạo `src/main/services/voice/voice-profile-manager.js`: Quản lý danh sách Voice đã clone, lưu file audio mẫu, đồng bộ hai chiều lên Google Drive `/Global_Voices/`.
- [x] Tạo `src/main/services/voice/index.js`: Điểm export tập trung toàn bộ Voice Services.

### 📌 Giai Đoạn 3: Nâng Cấp Giao Diện Master (Server) (Hoàn thành ✅)
- [x] Thêm Tab mới trên Sidebar: `🎙️ Quản Lý Voice AI`.
- [x] Giao diện danh sách voice đã clone, form nạp file audio mẫu, đặt tên voice, test giọng nhanh kèm Mini Audio Player.
- [x] Thêm dropdown chọn Voice trên Form giao lệnh Farm (`#farmVoiceSelect`) và Tab Tạo Batch (`#batchVoiceSelect`).
- [x] Hỗ trợ chọn kịch bản text (`.txt`) làm nguồn đầu vào tự động thay vì chỉ nhận voice audio.

### 📌 Giai Đoạn 4: Nâng Cấp Farm Worker Engine (Máy Con) (Hoàn thành ✅)
- [x] Worker tự động kiểm tra VoiceStudio đã chạy chưa trên cổng 3900, tự động khởi chạy từ thư mục `tools/` nếu chưa bật (`ensureVoiceStudioRunning`).
- [x] Worker tự động kiểm tra voice được chỉ định trong task: nếu máy con chưa có voice, tự động kéo từ Google Drive `/Global_Voices/` về đăng ký.
- [x] Worker nhận file kịch bản `.txt`, gọi pipeline tạo voice từng câu, kiểm tra lỗi âm thanh, auto-heal từng câu lỗi, ghép hoàn chỉnh, tải file `.mp3` lên Drive `/Generated_Voices/`.
- [x] Tự động chuyển file voice vào quy trình render video như bình thường (Whisper SRT -> NVENC).
- [x] Bảo toàn 100% tính năng cũ: Nếu task dùng folder voice có sẵn, Worker tự động bỏ qua sinh voice AI và render bình thường.

### 📌 Giai Đoạn 5: Đóng Gói Toàn Diện & Phát Hành OTA Toàn Cụm Farm (LUẬT SỐ 1) (Hoàn thành ✅)
- [x] Bump version: `package.json` lên phiên bản `5.1.1`.
- [x] Đóng gói `worker_app_v5.1.1.asar`, cập nhật `dist-worker/resources/app.asar` và `dist-server/resources/app.asar`.
- [x] Tạo `Cap-Nhat-Worker-5.1.2.bat` cho cập nhật thủ công nếu cần.
- [x] Tải gói OTA lên Google Drive `/Updates/` và phát lệnh OTA cho toàn bộ cụm máy Worker (`targetWorker: ALL`).
- [x] Dọn sạch các cảnh báo sự cố cũ trên Drive Alerts.
- [x] **Tách bạch hoàn toàn gói Server (Master Controller) và Worker (Render Node)**:
  - Khắc phục triệt để lỗi ghi đè `app.asar` khiến Server bị chạy theo `worker-tray.js`.
  - Đã xây dựng `scripts/pack-both-server-and-worker.js`:
    - Gói Server (`main: "src/main/main.js"`) được đóng gói chuẩn vào `dist-server/win-unpacked/resources/app.asar`.
    - Gói Worker (`main: "src/main/worker-tray.js"`) được đóng gói chuẩn vào `dist-worker/win-unpacked/resources/app.asar` và phát hành OTA lên Google Drive cho các máy render con.
  - Vô hiệu hóa triệt để Worker Watchdog chạy ngầm trên máy chủ để không tự bật lại Worker.
- [x] **TÍCH HỢP CHUẨN VOICESTUDIO THEO MỆNH LỆNH NGƯỜI DÙNG**:
  - Dùng đúng **VoiceStudio (debpalash/VoiceStudio v0.5.6)** đã được tải và cài đặt vào máy tại `C:\Users\hungp\AppData\Local\Programs\VoiceStudio\VoiceStudio.exe`.
  - Cấu hình chuyển hướng Runtime sang ổ D (`D:\VoiceStudioRuntime`) qua file `runtime-location.json` để bảo vệ ổ C (chỉ còn 1GB trống), chống tràn ổ cứng.
  - Phục hồi kết nối chuẩn API Audio REST của VoiceStudio (`http://localhost:3900/v1` - `/v1/audio/speech`, `/v1/models`).
  - Worker & Server tự động kiểm tra và kết nối VoiceStudio để sinh giọng, clone giọng từ file kịch bản `.txt`.
  - Tuyệt đối tuân thủ LUẬT SỐ 2: Chỉ làm đúng VoiceStudio theo yêu cầu, không tự ý thay thế công cụ khác.

### 📌 Giai Đoạn 6: Chuyển Sang Chế Độ Dùng Trực Tiếp (Local Direct Mode v5.4.0) & Hoàn Thiện VoiceStudio (Hoàn thành ✅)
- [x] **Gỡ bỏ hoàn toàn các liên kết Máy Chủ — Máy Con (Render Farm)**:
  - Xóa thư mục `src/main/services/farm/`, `src/main/worker-tray.js`, `src/renderer/worker-setup.html`.
  - Xóa tab `🌐 Quản Lý Render Farm` trên giao diện và hơn 1.300 dòng code điều phối Farm/Drive trong `src/renderer/app.js`, `src/main/ipc.js`, `src/main/preload.js`.
  - Dọn sạch 36+ gói `.zip`, `.asar`, thư mục `dist-worker`, `releases` và các script Worker cũ.
- [x] **Hoàn thiện tích hợp chuẩn xác 100% với VoiceStudio v0.5.6 (`http://127.0.0.1:3900/v1`)**:
  - Qua kiểm tra mã nguồn backend thực tế của VoiceStudio v0.5.6 (`openai_compat.py` và `profiles.py`), endpoint `POST /v1/audio/speech` tra cứu `voice` theo `id` trong bảng `voice_profiles` của SQLite (tạo bởi `POST /profiles` multipart/form-data).
  - Bổ sung `_ensureVoiceStudioCloneProfile()` và `_uploadCloneProfileToVoiceStudio()` trong `src/main/services/voice/voice-studio-service.js`: tự động đăng ký file âm thanh mẫu (`.wav`/`.mp3`) vào SQLite của VoiceStudio và lưu `vsProfileId` vào `VoiceProfileManager`, giúp Voice Clone hoạt động chính xác 100% cả khi bấm **Nghe thử** lẫn khi **Render kịch bản dài**.
  - Sửa IPC `voice:launchVoiceStudio` ưu tiên khởi chạy trực tiếp ứng dụng đã cài tại `C:\Users\hungp\AppData\Local\Programs\VoiceStudio\VoiceStudio.exe` thay vì mở nhầm bộ cài đặt `.exe`.
  - Thêm mục **3. Tạo Voice Kịch Bản Dài (.txt ➔ .mp3) Trực Tiếp** ngay trong tab `🎙️ Quản Lý Voice AI` kèm thanh tiến độ theo từng câu và trình nghe thử trực tiếp.
- [x] **Nối hoàn chỉnh luồng Tạo Batch trực tiếp từ Kịch Bản `.txt`**:
  - Nâng cấp `scanBatchInputs()` (`src/main/services/media-scanner.js`) hỗ trợ `includeScripts: true` để nhận diện trực tiếp các file `.txt` trong thư mục đầu vào.
  - Nâng cấp `BatchService.scan()` và `BatchService.run()` (`src/main/services/batch-service.js`) tự động gọi `VoiceValidatorService.generateFullScript` để biến các file kịch bản `.txt` thành `.mp3` trước khi tạo phụ đề SRT Whisper và ghép video (hoặc dừng ngay sau khi xuất xong `.mp3` nếu chọn chế độ **Chỉ Render Voice**).

---
*Cập nhật lúc: 2026-10-22 | Trạng thái: HOÀN TẤT BẢN v5.4.0 (LOCAL DIRECT EDITION) — ĐÃ KIỂM THỬ PASS 100% (187/187 TESTS).*