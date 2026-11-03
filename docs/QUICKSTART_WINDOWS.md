# Quick Start Windows

## 1. Cài dependency

```powershell
npm install
```

## 2. FFmpeg

Copy `ffmpeg.exe` và `ffprobe.exe` vào `resources\bin`, hoặc cài vào PATH.

## 3. Chạy ứng dụng

```powershell
npm start
```

Ứng dụng mở màn hình kích hoạt offline. Copy Mã máy.

## 4. Tạo key thử

```powershell
node admin-tools\generate-license.js --device "MÃ-MÁY" --customer "Demo" --months 1 --out demo.key
```

Mở `demo.key`, copy key vào app và bấm Kích hoạt.

## 5. Build installer

```powershell
npm run dist:win
```

Không cần mở terminal chạy server khi khách hàng sử dụng ứng dụng.

## Render một video không dùng Batch

1. Mở mục **Một video**.
2. Chọn trực tiếp file voice MP3/WAV.
3. Chọn trực tiếp file SRT; tên SRT không bắt buộc phải giống tên voice.
4. Chọn template.
5. Chọn Stock video, Chuỗi ảnh hoặc Media cố định.
6. Chọn thư mục output và thư mục Used nếu dùng stock.
7. Nhấn **Kiểm tra**.
8. Nhấn **Render video**.

Output lấy tên voice. Ví dụ `chapter_01.mp3` tạo `chapter_01.mp4` trực tiếp trong thư mục output đã chọn.
