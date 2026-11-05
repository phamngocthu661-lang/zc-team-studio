---
name: studio-7-voice-video-producer
description: "Bàn #7 (Phòng Thu Voice AI & Dựng Video GPU NVENC): Tự động nhận file kịch bản sạch TTS ({TenKichBan}_KB.txt) từ Bàn #6 để tạo Voice (.wav) qua VoiceStudio/Kho_Voice, tạo phụ đề (.srt/.json) qua Faster-Whisper GPU và render video (.mp4) theo cấu hình người dùng đã khóa trước khi chạy."
---

# 🎬 BÀN #7: `studio-7-voice-video-producer` (PHÒNG THU VOICE AI & DỰNG VIDEO GPU NVENC)

## 1. Vai Trò Cốt Lõi
- Là **Bàn #7** trong dây chuyền khép kín **Từ Tiêu Đề ➔ Kịch Bản ➔ Voice ➔ Video Thành Phẩm (`.mp4`)**.
- Hoạt động tự động ngay sau khi **Bàn #6 (`studio-6-visual-tts-director`)** xuất file `{TenKichBan}_KB.txt` vào thư mục `TONG HOP` (hoặc `TONG HOP_HOMELESS`).

## 2. Quy Trình 3 Pha Tự Động
1. **Pha 7A — Tạo Voice AI (`.wav`):**
   - Đọc `{TenKichBan}_KB.txt` (đã sạch 100% lỗi phát âm TTS từ Bàn #6).
   - Chia câu thông minh (`<=250` ký tự/câu), gọi `VoiceStudio` (`127.0.0.1:3900/v1`) với hồ sơ giọng đọc (`voiceProfileId`) trong `Kho_Voice` (hoặc Fallback `Edge-TTS`), kiểm định âm thanh từng câu, ghép nối bằng FFmpeg thành `{TenKichBan}_KB.wav` và dọn sạch cache tạm.
2. **Pha 7B — Tạo Phụ Đề Whisper GPU (`.srt` / `.json`):**
   - Chạy `Faster-Whisper` (`small` model trên CUDA GPU) tạo file phụ đề `{TenKichBan}_KB.srt` (và word-timestamps `.json` nếu bật hiệu ứng **Karaoke hộp màu CapCut**).
3. **Pha 7C — Phối Ghép & Render Video GPU NVENC (`.mp4`):**
   - Áp dụng cấu hình Video (`lockedVideoConfig`) mà người dùng đã cài đặt sẵn trước khi bấm chạy (Project, Template, Chế độ nền `STOCK_VIDEO / IMAGE_SEQUENCE / STORY_PIP_STOCK`, Kho Stock, Disclaimer/Intro, Thư mục Output).
   - Render xuất file `{TenKichBan}_KB.mp4` bằng bộ mã hóa phần cứng **NVIDIA NVENC (`h264_nvenc` / `hevc_nvenc`)** và ghi nhận đường dẫn thành phẩm vào `STATE.json`.
