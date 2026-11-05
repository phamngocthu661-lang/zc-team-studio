# HỆ THỐNG KIỂM THỬ & TIÊU CHUẨN NGHIỆM THU (TEST & QUALITY GATE)

> **Dự án:** Video Batch Studio — Remote Render Farm Edition  
> **Tài liệu kiểm chuẩn:** Dùng để đối soát, chạy test tự động và nghiệm thu từng tính năng trước khi đưa vào vận hành.  
> **Nguyên tắc:** 100% chức năng phải vượt qua kịch bản kiểm thử (PASS) mới được coi là hoàn thành.

---

## 1. Ma Trận Nghiệm Thu Tổng Thể (Acceptance Matrix)

| Mã kiểm thử | Tên hạng mục kiểm thử | Tiêu chuẩn ĐẠT (PASS Criteria) | Trạng thái |
| :--- | :--- | :--- | :---: |
| **TEST-DRIVE-01** | Kiểm tra cú pháp & tính hợp lệ của `task.json` | Chặn đứng task lỗi schema, cảnh báo thiếu trường bắt buộc | `[x] PASS (100%)` |
| **TEST-DRIVE-02** | Download ngầm tài nguyên từ Google Drive | Tải đúng, đủ file, tự retry khi ngắt mạng, check hash MD5 | `[x] PASS (100%)` |
| **TEST-DRIVE-03** | Upload ngầm video thành phẩm lên Google Drive | Đẩy video lên đúng thư mục chỉ định, tạo file `.done.json` | `[x] PASS (100%)` |
| **TEST-DRIVE-04** | Đồng bộ Kho Overlay dùng chung (`Global Overlays`)| Tự kéo overlay mới/sửa đổi, bỏ qua file cũ, map đúng source | `[x] PASS (100%)` |
| **TEST-SILENT-01**| Chạy ngầm 100% không hiện bất kỳ cửa sổ nào | Không có CMD, không cửa sổ Electron, `windowsHide: true` | `[x] PASS (100%)` |
| **TEST-SILENT-02**| Mức chiếm dụng tài nguyên ở trạng thái chờ (Idle)| RAM < 50 MB, CPU < 1%, GPU = 0% | `[ ] CHƯA TEST` |
| **TEST-SILENT-03**| Tự khởi động cùng Windows với quyền Administrator| Tự kích hoạt khi login Windows, có quyền Admin thực thi | `[x] PASS (100%)` |
| **TEST-THROTTLE-01**| Khống chế tài nguyên chế độ Ban ngày (30%) | CPU Priority = IDLE, Core giới hạn 30%, máy làm việc mượt | `[x] PASS (100%)` |
| **TEST-THROTTLE-02**| Vắt kiệt tài nguyên chế độ Ban đêm (100%) | Chạy 100% Core CPU, NVENC P1 đa worker tối đa tốc độ | `[x] PASS (100%)` |
| **TEST-STOCK-01** | Bắt lỗi thiếu Stock trước khi render | Phát hiện thiếu thời lượng, dừng job, tạo file ALERT Drive | `[x] PASS (100%)` |
| **TEST-STOCK-02** | Tự động nạp Stock mới từ link Drive từ xa | Nhận link stock, tải về, quét vào DB, tiếp tục job đang chờ | `[ ] CHƯA TEST` |
| **TEST-CLEAN-01** | Dọn rác file tạm sau khi upload thành công | Xóa sạch thư mục temp download và video temp cục bộ | `[x] PASS (100%)` |
| **TEST-CLEAN-02** | Xóa vật lý các file stock đã dùng HẾT thời lượng | File USED bị xóa khỏi ổ cứng; file ACTIVE còn nguyên | `[x] PASS (100%)` |
| **TEST-CLEAN-03** | Bảo toàn Layer Cache & Overlay dùng chung | Cache tĩnh không bị xóa nhầm, tái sử dụng cho các job sau | `[x] PASS (100%)` |
| **TEST-RECOVER-01**| Tự đứng dậy sau khi sập nguồn / khởi động lại | Quét SQLite, nhận diện job dở dang, tự động tiếp tục | `[x] PASS (100%)` |
| **TEST-UPDATE-01** | Tự động nâng cấp phiên bản ngầm từ xa | Tải zip update, tắt worker cũ, giải nén đè, bật worker mới | `[x] PASS (100%)` |
| **TEST-MASTER-01** | Giao diện Master Controller điều khiển cụm máy | Giao task, xem tiến độ real-time, nhận thông báo lỗi tức thì | `[x] PASS (100%)` |

---

## 2. Chi Tiết Kịch Bản Kiểm Thử Cho Từng Chức Năng

### 🧪 NHÓM 1: Kiểm Thử Giao Thức Google Drive & File Lệnh

#### TEST-DRIVE-01: Schema & Validation File `task.json`
- **Mục tiêu:** Đảm bảo máy render không bao giờ bị crash vì nhận phải file task sai định dạng.
- **Kịch bản thực hiện:**
  1. Gửi file `task_invalid_01.json` (thiếu link Drive).
  2. Gửi file `task_invalid_02.json` (link Drive hỏng hoặc sai quyền truy cập).
  3. Gửi file `task_valid.json` (đầy đủ thông số chuẩn).
- **Kết quả mong đợi:**
  - File sai lập tức bị từ chối, sinh file `ALERT_<ID>_INVALID_SCHEMA.json` vào `/VBS_FARM/Alerts/`.
  - File đúng được đưa vào hàng đợi `Processing/`.

#### TEST-DRIVE-02: Download Ngầm & Kiểm Tra Toàn Vẹn File
- **Mục tiêu:** Tải an toàn các file dung lượng lớn qua Internet mà không bị gián đoạn.
- **Kịch bản thực hiện:**
  1. Tạo thư mục Drive chứa 1 file voice (20 MB), 1 file SRT, 50 file ảnh (100 MB).
  2. Ra lệnh cho Worker tải về.
  3. Cố tình ngắt mạng 5 giây giữa chừng lúc đang tải.
- **Kết quả mong đợi:**
  - Worker phát hiện mất mạng, tạm dừng và tự động kết nối lại khi có mạng (Resume download).
  - Tải xong, kiểm tra số lượng file và dung lượng byte khớp 100% so với nguồn trên Drive.

#### TEST-DRIVE-03: Upload Video Thành Phẩm & Báo Cáo
- **Mục tiêu:** Video xuất xưởng được đẩy lên đúng nơi và giải phóng hàng đợi.
- **Kịch bản thực hiện:**
  1. Giả lập một video hoàn thành `output_sample.mp4` (500 MB).
  2. Worker gọi module upload lên thư mục Drive `targetDriveFolderUrl`.
- **Kết quả mong đợi:**
  - File xuất hiện đầy đủ trên Drive.
  - File `TASK_<ID>.done.json` được tạo trong `/VBS_FARM/Completed/` với đầy đủ thông số: Thời gian render, dung lượng, link video.

---

### 🧪 NHÓM 2: Kiểm Thử Chạy Ẩn (Silent Mode) & Khởi Động Cùng Windows

#### TEST-SILENT-01: Kiểm Tra Tính Vô Hình Tuyệt Đối
- **Mục tiêu:** Không làm gián đoạn bất kỳ thao tác nào của người dùng trên máy tính.
- **Kịch bản thực hiện:**
  1. Khởi động tiến trình Worker ngầm.
  2. Ra lệnh tải file và render 1 video liên tục trong 5 phút.
  3. Người dùng trên máy mở Word, gõ phím, duyệt web, mở video YouTube toàn màn hình.
- **Kết quả mong đợi:**
  - Không có bất kỳ cửa sổ CMD, PowerShell hay Electron nào bật lên trên màn hình.
  - Chuột không bị mất focus, video YouTube không bị giật khung hình.

#### TEST-SILENT-02: Đo Mức Tiêu Thụ Phần Cứng Ở Trạng Thái Chờ (Idle)
- **Mục tiêu:** Đảm bảo khi chưa có việc, ứng dụng không làm nặng máy.
- **Kịch bản thực hiện:**
  1. Bật máy tính, cho Worker chạy nền chờ lệnh.
  2. Dùng Windows Performance Monitor và Task Manager ghi lại chỉ số sau 15 phút.
- **Kết quả mong đợi:**
  - RAM tiêu thụ: Dưới **45 MB**.
  - CPU tiêu thụ: Dao động **0% - 0.2%**.
  - GPU tiêu thụ: **0%**.

#### TEST-SILENT-03: Tự Động Bật Cùng Windows Với Quyền Admin
- **Mục tiêu:** Khởi động độc lập, không cần con người ngồi đăng nhập ứng dụng.
- **Kịch bản thực hiện:**
  1. Đăng ký Windows Task Scheduler qua script cài đặt.
  2. Restart lại máy tính Windows.
  3. Kiểm tra tiến trình trong Task Manager ngay khi vào màn hình Desktop.
- **Kết quả mong đợi:**
  - Tiến trình `vbs-worker.exe` (hoặc node process) tự động chạy với cờ `Elevated = True` (Quyền Quản trị viên).

---

### 🧪 NHÓM 3: Kiểm Thử Điều Tiết Tài Nguyên (Ngày vs Đêm)

#### TEST-THROTTLE-01: Chế Độ Ban Ngày (Tối Đa 30% Công Suất)
- **Mục tiêu:** Vừa render ngầm vừa để người khác làm việc bình thường.
- **Kịch bản thực hiện:**
  1. Kích hoạt task với cờ `forceProfile: "DAY"`.
  2. Bắt đầu render video nặng (ghép nhiều layer, hiệu ứng).
  3. Kiểm tra trong Windows Task Manager (Tab Chi tiết - Details).
- **Kết quả mong đợi:**
  - `ffmpeg.exe` có Priority là `Low` hoặc `Below Normal`.
  - CPU Affinity chỉ gán trên 2-3 lõi (tối đa 30% công suất tổng).
  - Quạt tản nhiệt của máy tính chạy êm, nhiệt độ CPU/GPU duy trì mát mẻ (< 65°C).

#### TEST-THROTTLE-02: Chế Độ Ban Đêm (100% Công Suất Turbo)
- **Mục tiêu:** Vắt kiệt sức mạnh GPU NVENC để render xong nhiều video nhất trong đêm.
- **Kịch bản thực hiện:**
  1. Kích hoạt task với cờ `forceProfile: "NIGHT"`.
  2. Cho chạy batch nhiều video.
- **Kết quả mong đợi:**
  - CPU Affinity mở 100% số lõi.
  - GPU NVENC chạy tối đa hiệu năng (Preset P1/P3).
  - Thời gian render nhanh gấp 2.5 – 3 lần so với chế độ ban ngày.

---

### 🧪 NHÓM 4: Kiểm Thử Quản Lý Stock & Dọn Dẹp Ổ Cứng

#### TEST-STOCK-01: Báo Động Hết Stock (Out-of-Stock Alert)
- **Mục tiêu:** Ngăn chặn tình trạng render dở chừng rồi fail, báo động cho chủ máy.
- **Kịch bản thực hiện:**
  1. Chuẩn bị file voice dài 30 phút.
  2. Trong kho stock của máy chỉ còn 10 phút video.
  3. Bấm giao task render.
- **Kết quả mong đợi:**
  - Thuật toán `StockPlanner` chặn ngay ở khâu Preflight trước khi bật FFmpeg.
  - Tạo file cảnh báo `ALERT_TASK_001_OUT_OF_STOCK.json` lên Drive `/VBS_FARM/Alerts/`.
  - App Quản lý của bạn hiện cảnh báo đỏ: *"Máy 01: Thiếu 20 phút stock"*.

#### TEST-STOCK-02: Nạp Stock Mới Từ Xa
- **Mục tiêu:** Nạp nhiên liệu cho máy render từ xa qua Internet.
- **Kịch bản thực hiện:**
  1. Từ máy chủ, ném file `ADD_STOCK_PC_01.json` chứa link Drive 50 clip stock mới vào `/VBS_FARM/Stock_Incoming/`.
- **Kết quả mong đợi:**
  - Máy 01 tự động kéo toàn bộ 50 clip về thư mục stock cục bộ.
  - Quét kiểm tra độ hợp lệ của video và lưu vào SQLite.
  - Tự động tiếp tục job render đang bị tạm dừng trước đó.

#### TEST-CLEAN-01 & 02: Dọn Dẹp Rác & Xóa Stock Đã Dùng Hết
- **Mục tiêu:** Giữ ổ cứng máy render luôn gọn nhẹ, không bị đầy ổ theo thời gian.
- **Kịch bản thực hiện:**
  1. Thực hiện 1 task hoàn chỉnh: Tải tài nguyên (200 MB) -> Render ra video (300 MB) -> Sử dụng hết thời lượng của 3 clip stock cũ.
  2. Đợi Worker upload xong video lên Drive.
  3. Kiểm tra cây thư mục trên ổ cứng máy render.
- **Kết quả mong đợi:**
  - Thư mục `temp_download/` được xóa sạch (0 byte).
  - Video render tạm thời trên ổ cứng được xóa sạch.
  - 3 clip stock đã dùng hết thời lượng bị xóa vĩnh viễn khỏi ổ đĩa.
  - Các clip stock còn thời lượng và các file cache tĩnh (`.cache/overlay_*.mov`) vẫn còn nguyên vẹn.

---

### 🧪 NHÓM 5: Kiểm Thử Khôi Phục Sau Sự Cố (Reboot/Crash Recovery)

#### TEST-RECOVER-01: Mô Phỏng Cúp Điện / Tắt Máy Đột Ngột
- **Mục tiêu:** Máy tính bị restart không làm mất việc hay treo hệ thống.
- **Kịch bản thực hiện:**
  1. Bắt đầu render 1 video dài. Đến đoạn 50%, ép tắt máy hoặc kill process cưỡng bức (`taskkill /F /IM node.exe /T`).
  2. Bật lại máy tính (hoặc khởi động lại Worker).
- **Kết quả mong đợi:**
  - Worker khởi động, đọc database SQLite.
  - Phát hiện job đang ở trạng thái `PROCESSING` dở dang.
  - Dọn dẹp phần video render lỗi, tự động tái khởi động render từ đầu hoặc gửi thông báo sự cố về Drive.

---

### 🧪 NHÓM 6: Kiểm Thử Nâng Cấp Ngầm Từ Xa (Remote Silent Update)

#### TEST-UPDATE-01: Cập Nhật Phiên Bản Không Cần Chạm Vào Máy
- **Mục tiêu:** Đẩy code mới từ máy chủ sang tất cả máy con tự động.
- **Kịch bản thực hiện:**
  1. Đóng gói phiên bản v1.8.0 thành file `update_v1.8.0.zip`.
  2. Đặt file vào `/VBS_FARM/Updates/` kèm file lệnh `UPDATE_ALL.json`.
- **Kết quả mong đợi:**
  - Máy con tải file zip về, đợi render xong việc hiện tại rồi kích hoạt script nâng cấp ngầm.
  - Ghi đè mã nguồn mới, khởi động lại Worker.
  - Báo cáo lên Drive: `Máy PC_01 đã cập nhật thành công lên v1.8.0`.
