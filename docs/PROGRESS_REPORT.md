# TIẾN ĐỘ & BÁO CÁO RÀ SOÁT HỆ THỐNG: VideoBatchStudio-Desktop-Offline

> **Phiên bản:** 1.7.0 Offline Standalone  
> **Thời gian quét:** 2026-09-25  
> **Trạng thái tổng quát:** ĐÃ QUÉT TOÀN BỘ CODEBASE — 100% SẴN SÀNG LÀM VIỆC

---

## 1. Kết Quả Quét Kỹ Thuật (System Scan Summary)

| Hạng mục | Kết quả kiểm tra | Trạng thái |
| :--- | :--- | :---: |
| **Source Code Check** | `node scripts/check-source.js` -> 79 files JavaScript hợp lệ | ✅ PASS |
| **Unit Test Suite** | `node --test tests/*.test.js` -> 169/169 tests thành công (0 fail) | ✅ PASS |
| **NVIDIA GPU Detection** | NVIDIA GeForce GTX 1060 6GB (Driver 581.57, VRAM 6GB, Trống 4.1GB) | ✅ PASS |
| **NVENC Hardware Acceleration** | `h264_nvenc` + `hevc_nvenc` sẵn sàng, profile P2 tương thích Pascal | ✅ PASS |
| **FFmpeg Binary** | Tích hợp sẵn `resources/bin/ffmpeg.exe` (FFmpeg 8.1 gyan.dev) | ✅ PASS |
| **Cơ sở dữ liệu** | `node:sqlite` (WAL Mode, DatabaseSync) xử lý offline | ✅ PASS |
| **License Module** | Offline Ed25519 gắn MachineGuid, lưu trữ an toàn safeStorage | ✅ PASS |

---

## 2. Kiến Trúc & Các Phân Hệ Đã Được Xác Nhận

### 2.1. Backend Process & Services (`src/main/`)
1. **`main.js` & `ipc.js`**: Điểm khởi động Electron, quản lý vòng đời, cầu nối IPC đa kênh giữa Renderer và Main process.
2. **`database.js`**: Quản lý cơ sở dữ liệu SQLite cục bộ (`projects`, `templates`, `media_assets`, `batches`, `batch_jobs`, `stock_reservations`...).
3. **`services/ffmpeg.js`**: Điều khiển tiến trình FFmpeg, theo dõi tiến độ, tự động dò tìm GPU và khôi phục khi lỗi.
4. **`services/render-planner.js`**: Bộ lập kế hoạch FFmpeg complex filter, xử lý nối stock, chuyển cảnh mềm, disclaimer, intro, layer phông xanh, overlay subtitle.
5. **`services/stock-planner.js`**: Thuật toán phân bổ video stock thông minh, tránh trùng lặp, hỗ trợ vòng lặp 2 (lật + zoom + slow 0.75x).
6. **`services/story-video-service.js`**: Pipeline tạo video từ ảnh độc lập với 3 chế độ (Fixed time, Distribute theo voice, hoặc cắt ảnh theo SRT).
7. **`services/whisper-srt-service.js`**: Tự động nhận diện âm thanh và sinh file SRT phụ đề offline.
8. **`services/subtitle-canvas-overlay-service.js`**: Render phụ đề canvas sắc nét, không bị phụ thuộc vào lỗi font hệ thống.
9. **`services/license-client.js`**: Bản quyền ngoại tuyến không cần internet hay máy chủ.

### 2.2. Giao Diện Người Dùng (`src/renderer/`)
- **Tổng quan (Dashboard)**: Theo dõi metric, sức khỏe hệ thống và trạng thái GPU.
- **Projects**: Quản lý dự án, kích thước khung hình, FPS, đường dẫn output.
- **Kho tài nguyên (Resources)**: Quản lý asset dùng chung (Disclaimer, Greenscreen video/ảnh).
- **Template Editor**: Visual editor tương tác kéo thả canvas 1920x1080, chỉnh sửa layer, phụ đề, font chữ, màu viền.
- **Media Library**: Quản lý thư viện stock video, thống kê file đã dùng/chưa dùng, lọc lỗi.
- **Tạo Batch (Batch)**: Render hàng loạt từ thư mục voice + srt + stock, tự nhận diện intro 1-1 theo tên voice.
- **Tạo Video Ảnh (Story Video)**: Tạo video từ ảnh kết hợp voice/srt đa luồng song song.
- **Queue & Reports**: Theo dõi tiến trình render, resume, retry các job lỗi, xuất báo cáo.
- **Cài đặt & License**: Quản lý kích hoạt bản quyền máy.

---

## 3. Lộ Trình & Kế Hoạch Kiểm Chuẩn Hệ Thống Remote Render Farm (DOCSMOI)

Theo định hướng nâng cấp hệ thống thành **Remote Render Farm (1 Master Controller — Đa Worker Render Ẩn — Google Drive làm trạm trung chuyển)**, hai tài liệu chi tiết đã được khởi tạo trong thư mục `DOCSMOI/`:

1. [DOCSMOI/PHASE_ROADMAP_REMOTE_RENDER_FARM.md](file:///e:/a/VideoBatchStudio-Desktop-Offline/DOCSMOI/PHASE_ROADMAP_REMOTE_RENDER_FARM.md):
   - **Phase 1**: Giao thức & Cấu trúc Dữ liệu Google Drive (`/VBS_FARM/`, Schema `task.json`, `DriveTransferService`, `Global Overlays Sync Engine`).
   - **Phase 2**: Ứng dụng chạy ẩn (Silent Worker Headless) & Tự khởi động cùng Windows (Run as Admin).
   - **Phase 3**: Cơ chế điều tiết tài nguyên (Ngày êm ái 30% — Đêm tối đa 100% Turbo).
   - **Phase 4**: Quản lý Stock thông minh, Báo hết stock (`Out-of-Stock Alert`) & Tự động dọn rác ổ đĩa (`Clean-Up Pipeline`).
   - **Phase 5**: Tự phục hồi sau sự cố sập nguồn / khởi động lại máy (`Crash/Reboot Recovery`).
   - **Phase 6**: Ứng dụng Quản lý Trung tâm (`Master Controller App`).
   - **Phase 7**: Cơ chế Tự động Nâng cấp phiên bản ngầm từ xa (`Remote Silent Auto-Update`).

2. [DOCSMOI/TEST_SYSTEM_VERIFICATION_PLAN.md](file:///e:/a/VideoBatchStudio-Desktop-Offline/DOCSMOI/TEST_SYSTEM_VERIFICATION_PLAN.md):
   - Bảng ma trận nghiệm thu Acceptance Matrix gồm 16 tiêu chí cốt lõi (Mã từ `TEST-DRIVE-01` đến `TEST-MASTER-01`).
   - 6 bộ kịch bản kiểm thử chi tiết từng chức năng với tiêu chuẩn ĐẠT / KHÔNG ĐẠT rõ ràng.

---

## 4. Kết Quả Triển Khai Thực Tế: Hệ Thống Remote Render Farm (VBS Farm)

Đã hoàn thành lập trình và kiểm chuẩn tự động cho các phân hệ cốt lõi:

1. **Giao thức & Dữ liệu Google Drive (Phase 1)**:
   - [`src/main/services/farm/farm-constants.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/main/services/farm/farm-constants.js): Hằng số thư mục Drive, trạng thái task, profile tài nguyên.
   - [`src/main/services/farm/farm-task-schema.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/main/services/farm/farm-task-schema.js): Bộ validator task.json, tạo báo cáo tiến độ, hoàn tất và cảnh báo.
   - [`src/main/services/farm/farm-drive-service.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/main/services/farm/farm-drive-service.js): Quản lý tạo cây thư mục Drive, download an toàn có retry, upload video thành phẩm.
   - [`src/main/services/farm/farm-overlay-sync-service.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/main/services/farm/farm-overlay-sync-service.js): Đồng bộ kho Overlay dùng chung, tự phát hiện file mới/sửa đổi, bảo tồn file vĩnh cửu.

2. **Điều Tiết Tài Nguyên & Chạy Ngầm (Phase 2 & 3)**:
   - [`src/main/services/farm/farm-resource-throttle.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/main/services/farm/farm-resource-throttle.js): Khống chế tiến độ: Ban ngày 30% CPU, Process Priority `Idle`, GPU P2; Ban đêm 100% Turbo.
   - [`src/main/services/farm/farm-worker-engine.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/main/services/farm/farm-worker-engine.js): Vòng lặp điều phối worker ngầm: quét việc, tải tài nguyên, gọi render, upload, dọn rác và phục hồi sau reboot.
   - [`scripts/worker-daemon.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/scripts/worker-daemon.js): Tiến trình Worker Daemon Node.js độc lập không bật giao diện Chromium.
   - [`scripts/run-worker-hidden.vbs`](file:///e:/a/VideoBatchStudio-Desktop-Offline/scripts/run-worker-hidden.vbs): Script VBS kích hoạt tiến trình ẩn 100% (cờ `0, False`).
   - [`scripts/install-silent-service.ps1`](file:///e:/a/VideoBatchStudio-Desktop-Offline/scripts/install-silent-service.ps1): Kịch bản PowerShell tự nâng quyền Administrator và đăng ký Windows Task Scheduler tự khởi động cùng Windows.
   - [`scripts/uninstall-silent-service.ps1`](file:///e:/a/VideoBatchStudio-Desktop-Offline/scripts/uninstall-silent-service.ps1): Kịch bản gỡ bỏ dịch vụ và dọn dẹp tiến trình.

3. **An Toàn Stock & Dọn Rác Tự Động (Phase 4)**:
   - [`src/main/services/farm/farm-stock-cleaner.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/main/services/farm/farm-stock-cleaner.js): Preflight phát hiện thiếu stock để báo động, tự động xóa sạch file tạm và xóa file stock vật lý đã dùng hết thời lượng (`USED`).

4. **Giao Diện Điều Khiển Master Controller (Phase 6)**:
   - [`src/main/services/farm/farm-master-service.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/main/services/farm/farm-master-service.js): Backend Master điều phối cụm máy (tổng hợp metrics, dispatch task, nạp stock, xóa alert).
   - [`src/main/ipc.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/main/ipc.js) & [`src/main/preload.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/main/preload.js): Cung cấp bộ API `window.vbs.farm` kết nối Electron và giao diện.
   - [`src/renderer/index.html`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/renderer/index.html): Tab Quản Lý Render Farm với Form Dispatch Task, Thẻ Metrics tổng quan, Trung tâm xử lý cảnh báo & nạp stock từ xa, Bảng Real-time Workers và Bảng Video Completed.
   - [`src/renderer/app.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/renderer/app.js): Xử lý toàn bộ logic Master UI (`loadFarmOverview`, `dispatchFarmTask`, `sendStockRemote`, `renderFarmAlerts`, `renderFarmWorkers`, `renderFarmCompleted`, tự động polling 8s khi mở tab).

5. **Cơ Chế Tự Động Nâng Cấp Ngầm Từ Xa (Phase 7)**:
   - [`src/main/services/farm/farm-auto-updater.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/main/services/farm/farm-auto-updater.js): So sánh phiên bản semver, phát hiện gói update trên Drive, tải về an toàn và ghi nhận `UPDATE_SUCCESS_<WorkerId>.json`.
   - [`scripts/package-update.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/scripts/package-update.js): Đóng gói tự động bản cập nhật nhẹ (loại trừ ffmpeg và node_modules) vào `update.zip` kèm file chỉ thị `UPDATE_ALL.json`.
   - [`scripts/apply-silent-update.ps1`](file:///e:/a/VideoBatchStudio-Desktop-Offline/scripts/apply-silent-update.ps1): Kịch bản PowerShell chạy ngầm giải nén đè mã nguồn mới và tự khởi động lại worker.
   - Tích hợp vào [`src/main/services/farm/farm-worker-engine.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/src/main/services/farm/farm-worker-engine.js): Tự động kiểm tra cập nhật trước chu kỳ nhận việc, hoãn cập nhật khi đang render dở dang.

6. **Kết Quả Kiểm Chuẩn & Nghiệm Thu**:
   - `node scripts/check-source.js` -> **95 file JS** hợp lệ 100%.
   - `node --test tests/*.test.js` -> **186 / 186 tests PASS 100%** (0 lỗi).
   - Thêm các bộ test suite mới:
     - [`tests/farm-master-ui.test.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/tests/farm-master-ui.test.js) (4/4 tests PASS).
     - [`tests/farm-auto-updater.test.js`](file:///e:/a/VideoBatchStudio-Desktop-Offline/tests/farm-auto-updater.test.js) (4/4 tests PASS).
   - Toàn bộ 7/7 Phase trong kế hoạch đã hoàn thành trọn vẹn và đạt tiêu chuẩn nghiệm thu: `TEST-DRIVE-01..04`, `TEST-SILENT-01..03`, `TEST-THROTTLE-01..02`, `TEST-STOCK-01`, `TEST-CLEAN-01..03`, `TEST-RECOVER-01`, `TEST-MASTER-01`, `TEST-UPDATE-01`.

