# GPU Auto Guide

## Cấu hình khuyên dùng GTX 1060 6GB
- Codec: Auto — ưu tiên H.264 NVENC
- Acceleration: AUTO_STABLE
- Performance: MAX_SPEED
- Worker: 1

AUTO_STABLE dùng CPU cho decode/filter phức tạp và NVENC cho encode. Đây là cách ổn định nhất với SRT, logo, text, greenscreen và Cross Dissolve. GPU Video Encode không nhất thiết đạt 100%; tốc độ `speed=x` mới là chỉ số chính.

## Trình tự phục hồi
1. Thử NVENC trên GPU tự chọn.
2. Nếu lỗi, đóng toàn bộ cây process FFmpeg.
3. Quét lại GPU.
4. Retry preset tương thích GTX 10xx.
5. Fallback libx264 nếu vẫn thất bại.
