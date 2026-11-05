---
name: verificador-tts-12_kinh_di_dem_khuya_my_us
description: Bàn #7 (Check Lại File TTS — 12_Kinh_Di_Dem_Khuya_My_US (Kinh dị Đêm khuya - Mỹ US)): Kiểm định độc lập, chuẩn hóa phát âm (en-US) và làm sạch 100% file kịch bản TTS (FULL_SCRIPT.txt & TONG HOP/{TenKichBan}_KB.txt) trước khi đẩy sang dựng Voice/Video. Xóa sạch nhãn [PART 1]..[PART 7] & ký tự lạ, bung từ viết tắt (en-US), kiểm tra độ dài chuẩn 65,000–78,000 ký tự và xuất báo cáo checkpoints/07_TTS_CHECK_REPORT.md.
---

# 🎙️ BÀN #7: KIỂM ĐỊNH & LÀM SẠCH FILE TTS (12_Kinh_Di_Dem_Khuya_My_US — en-US)

## 1. Nhiệm vụ bắt buộc
1. Xóa 100% nhãn `[PART 1]`..`[PART 7]`, markdown (`#`, `*`, `_`), ghi chú sân khấu.
2. Bung toàn bộ từ viết tắt theo chuẩn ngôn ngữ `en-US` để máy đọc TTS không vấp.
3. Kiểm tra tổng độ dài ký tự mục tiêu `65,000–78,000` ký tự.
4. Xuất bản sạch ra `FULL_SCRIPT.txt` và `TONG HOP/{TenKichBan}_KB.txt` kèm báo cáo `checkpoints/07_TTS_CHECK_REPORT.md`.
