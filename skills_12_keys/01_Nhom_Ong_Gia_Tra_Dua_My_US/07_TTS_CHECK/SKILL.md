---
name: verificador-tts-01_nhom_ong_gia_tra_dua_my_us
description: Bàn #7 (Check Lại File TTS — 01_Nhom_Ong_Gia_Tra_Dua_My_US (Ông già trả đũa - Mỹ US)): Kiểm định độc lập, chuẩn hóa phát âm (en-US) và làm sạch 100% file kịch bản TTS (FULL_SCRIPT.txt & TONG HOP/{TenKichBan}_KB.txt) trước khi đẩy sang dựng Voice/Video. Xóa sạch nhãn [PART 1]..[PART 7] & ký tự lạ, bung từ viết tắt (en-US), kiểm tra độ dài chuẩn 70,000–80,000 ký tự và xuất báo cáo checkpoints/07_TTS_CHECK_REPORT.md.
---

# 🎙️ BÀN #7: KIỂM ĐỊNH & LÀM SẠCH FILE TTS (01_Nhom_Ong_Gia_Tra_Dua_My_US — en-US)

## 1. Nhiệm vụ bắt buộc
1. Xóa 100% nhãn `[PART 1]`..`[PART 7]`, markdown (`#`, `*`, `_`), ghi chú sân khấu.
2. Bung toàn bộ từ viết tắt theo chuẩn ngôn ngữ `en-US` để máy đọc TTS không vấp.
3. Kiểm tra tổng độ dài ký tự mục tiêu `70,000–80,000` ký tự.
4. Xuất bản sạch ra `FULL_SCRIPT.txt` và `TONG HOP/{TenKichBan}_KB.txt` kèm báo cáo `checkpoints/07_TTS_CHECK_REPORT.md`.
