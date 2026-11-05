# HƯỚNG DẪN TẠO GOOGLE SERVICE ACCOUNT (LẤY FILE JSON)

Để hệ thống Video Batch Studio Master và Worker có thể tự động tải/upload file từ Google Drive thông qua link web mà **KHÔNG CẦN CÀI GOOGLE DRIVE DESKTOP** và **KHÔNG CẦN ĐĂNG NHẬP**, bạn cần tạo một tài khoản ảo (Service Account) trên Google Cloud.

Quá trình này hoàn toàn miễn phí và chỉ cần làm **1 lần duy nhất**.

---

## BƯỚC 1: Tạo Dự Án (Project) trên Google Cloud
1. Truy cập vào trang quản lý: [Google Cloud Console](https://console.cloud.google.com/)
2. Đăng nhập bằng tài khoản Google của bạn (tài khoản nào cũng được).
3. Ở góc trên cùng bên trái, kế bên chữ "Google Cloud", bấm vào **Select a project** (Chọn một dự án) > Bấm **NEW PROJECT** (Dự án mới).
4. Nhập tên dự án (Ví dụ: `VBS-Render-Farm`) và bấm **CREATE** (Tạo).
5. Đợi vài giây để dự án được tạo, sau đó chọn dự án vừa tạo.

## BƯỚC 2: Bật Google Drive API
1. Mở Menu (biểu tượng 3 dấu gạch ngang góc trái) > Chọn **APIs & Services** > **Library** (Thư viện).
2. Trong ô tìm kiếm, gõ `Google Drive API` và chọn kết quả hiển thị.
3. Bấm vào nút **ENABLE** (Bật).

## BƯỚC 3: Tạo Service Account (Tài khoản Robot)
1. Mở Menu > **APIs & Services** > **Credentials** (Thông tin xác thực).
2. Ở menu phía trên cùng, bấm **+ CREATE CREDENTIALS** > Chọn **Service account**.
3. Điền thông tin:
   - **Service account name**: Gõ tên bất kỳ (Ví dụ: `bot-render-01`)
   - Bấm **CREATE AND CONTINUE**
   - Ở phần cấp quyền (Role), bạn có thể bỏ qua hoặc chọn `Basic > Editor`.
   - Bấm **DONE**.
4. Lúc này ở danh sách phía dưới (phần Service Accounts), bạn sẽ thấy một tài khoản vừa tạo có dạng email ảo:
   👉 *Ví dụ:* `bot-render-01@vbs-render-farm.iam.gserviceaccount.com`
   **(HÃY COPY VÀ LƯU LẠI ĐỊA CHỈ EMAIL NÀY - BẠN SẼ CẦN NÓ ĐỂ SHARE THƯ MỤC LÊN ĐÓ)**

## BƯỚC 4: Xuất File Chìa Khóa (credentials.json)
1. Nhấp vào địa chỉ email Service Account bạn vừa tạo trong danh sách.
2. Chuyển sang tab **KEYS** (Thẻ khóa).
3. Bấm nút **ADD KEY** > Chọn **Create new key**.
4. Chọn định dạng **JSON** và bấm **CREATE**.
5. Một file có đuôi `.json` sẽ tự động tải về máy tính của bạn.
6. **Đổi tên file đó thành `credentials.json`** và copy nó vào bên trong thư mục cài đặt gốc của phần mềm `VideoBatchStudio-Desktop-Offline` (cùng cấp với thư mục `src`).

---

## BƯỚC 5: Cách Share thư mục Drive để Render
Từ giờ trở đi, khi bạn muốn Master hoặc Worker truy cập vào bất kỳ thư mục nào trên Google Drive (Ví dụ thư mục chứa Voice, thư mục gốc `VBS_FARM`), bạn chỉ cần làm 1 thao tác cực kỳ đơn giản:

1. Vào Google Drive của bạn (trên web), click chuột phải vào thư mục cần dùng > Chọn **Share** (Chia sẻ).
2. Ở ô "Add people and groups" (Thêm người và nhóm), **dán địa chỉ email ảo của Service Account** (ở Bước 3) vào.
3. Quyền hạn để là **Editor** (Người chỉnh sửa) và bấm **Gửi**.
4. Xong! Bây giờ bạn chỉ cần copy link web của thư mục đó (https://drive.google.com/drive/folders/XXXXXXX) và dán vào phần mềm là hệ thống tự động chui vào tải file.
