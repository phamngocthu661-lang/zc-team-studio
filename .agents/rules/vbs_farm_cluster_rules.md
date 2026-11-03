# NGUYÊN TẮC BẮT BUỘC KHI PHÁT TRIỂN & SỬA LỖI HỆ THỐNG RENDER FARM (VBS)

> **QUY TẮC CỐT LÕI TỪ NGƯỜI DÙNG**:
> **"Khi 1 máy có lỗi thì chắc chắn các máy khác cũng sẽ có lỗi như vậy. Sửa thì sửa cả ứng dụng, đừng có sửa riêng từng máy. Mày sửa xong máy Phuong thì máy Chung lại lỗi đấy thì làm như nào! Lần sau sửa cái gì thì đọc cái này rồi hãy làm!"**

---

## 1. NGUYÊN TẮC TOÀN CỤM (FARM CLUSTER FIRST)
1. **Lỗi trên một máy là lỗi của toàn hệ thống**:
   - Dù lỗi xuất hiện hoặc được báo cáo trên bất kỳ máy nào (`MAY-PHUONG`, `DESKTOP-CHUNG`, `MAY2`, `NHOISK`, `May-Thay`, `WORKER_PC1`...), Agent **PHẢI** coi đó là lỗi logic/kiến trúc của toàn bộ ứng dụng.
   - Tuyệt đối không giả định "chỉ máy đó bị" hay "sửa tạm cho máy đó chạy trước".

2. **CẤM sửa chắp vá cục bộ riêng lẻ cho từng máy**:
   - Nghiêm cấm việc chỉ sửa script chạy tay, patch thủ công file cho riêng máy `MAY-PHUONG` rồi bỏ quên máy `DESKTOP-CHUNG` hoặc các worker khác.
   - Sửa cho máy này mà máy kia lỗi tiếp là THẤT BẠI HOÀN TOÀN.

---

## 2. QUY TRÌNH CHUẨN KHI SỬA LỖI HOẶC NÂNG CẤP ỨNG DỤNG
Mỗi khi phát hiện lỗi hoặc người dùng yêu cầu sửa lỗi/nâng cấp:

### BƯỚC 1: Sửa tận gốc mã nguồn (`src/`)
- Mọi sửa đổi phải nằm trong source code chuẩn của dự án:
  - `src/main/services/farm/farm-worker-engine.js` (Worker Engine)
  - `src/main/services/farm/farm-auto-updater.js` (OTA Updater & Watchdog runner)
  - `src/main/services/farm/farm-master-service.js` (Master Controller)
  - `vbs_worker_watchdog.vbs` (Watchdog tiến trình)
  - Hoặc các module render/ffmpeg/cloud drive dùng chung.

### BƯỚC 2: Tăng phiên bản (Bump Version)
- Cập nhật số phiên bản trong `package.json` (ví dụ `3.0.16` -> `3.0.17`).
- Ghi nhận thay đổi vào `CHANGELOG.md` và `DOCSMOI/PHASE_ROADMAP_REMOTE_RENDER_FARM.md`.

### BƯỚC 3: Đóng gói đồng bộ toàn bộ App & Dist
- Đóng gói file `.asar` mới: `worker_app_vX.Y.Z.asar`.
- Cập nhật đồng bộ vào tất cả các đích phân phối:
  - `dist-worker/resources/app.asar`
  - `dist-server/resources/app.asar`
- Tạo/cập nhật file batch cập nhật khẩn cấp: `Cap-Nhat-Worker-X.Y.Z.bat`.

### BƯỚC 4: Phát hành OTA đồng loạt cho TẤT CẢ các máy trong Farm
- Tải gói `.asar` và file batch mới lên thư mục Updates trên Google Drive (`RENDER BOT`).
- Xóa sạch các Alert lỗi cũ trên Drive để tránh làm nghẽn hoặc báo động ảo.
- **PHÁT LỆNH CẬP NHẬT CHO TẤT CẢ CÁC MÁY**:
  - Gửi directive cập nhật với `targetWorker: "ALL"` hoặc lặp qua từng worker (`MAY-PHUONG`, `DESKTOP-CHUNG`, `MAY2`, `NHOISK`, `May-Thay`, `WORKER_PC1`).
  - Cả máy đang Online và máy đang Offline chờ đều phải có directive cập nhật sẵn sàng trên Drive để khi máy bật lên là tự động nâng cấp ngay.

### BƯỚC 5: Khởi động lại ứng dụng nếu cần
- Khi sửa đổi ứng dụng cần nạp code mới, tắt tiến trình cũ và mở lại (thông qua Watchdog hoặc script khởi động) để đảm bảo phiên bản mới nhất đang chạy thực tế.

### BƯỚC 6: Kiểm tra xác nhận trên nhiều máy
- Kiểm tra heartbeat và telemetry trên Drive của ít nhất 2 worker khác nhau (ví dụ cả `MAY-PHUONG` và `DESKTOP-CHUNG` hoặc máy local) để khẳng định bản sửa lỗi hoạt động ổn định trên toàn bộ cụm.

---

## 3. CHECKLIST TRƯỚC KHI BÁO CÁO HOÀN THÀNH
- [ ] Đã sửa trong `src/` chưa?
- [ ] Đã bump version `package.json` chưa?
- [ ] Đã build gói `.asar` mới và copy vào các `dist-*/resources/app.asar` chưa?
- [ ] Đã tải lên Google Drive và phát lệnh cho TẤT CẢ máy (`targetWorker: ALL`) chưa?
- [ ] Đã dọn sạch cảnh báo alert cũ trên Drive chưa?
- [ ] Đã cập nhật file Markdown theo dõi tiến độ (`DOCSMOI/...`) chưa?
- [ ] Đã trao đổi bằng tiếng Việt và gợi ý agent tiếp theo chưa?
