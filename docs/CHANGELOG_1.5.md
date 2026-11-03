# Changelog 1.5.0

## Performance

- Thêm profile `MAX_SPEED`, `BALANCED`, `QUALITY`.
- `MAX_SPEED` dùng NVENC P1, low-latency, single-pass, `bf=0`, `rc-lookahead=0`, AQ tắt.
- Tăng CUDA `extra_hw_frames` và NVENC `surfaces`.
- Thêm `filter_complex_threads` theo số CPU logic, tối đa 16.
- Tiến độ render hiển thị FPS, bitrate và speed.
- Tắt `faststart` trong profile MAX_SPEED để tránh bước di chuyển moov atom với file dài.

## Parallel Batch

- Batch hỗ trợ 1–2 video render đồng thời từ giao diện.
- Stock reservation vẫn được thực hiện transactionally trước khi worker bắt đầu render.
- Pause chờ các job đang chạy kết thúc rồi mới dừng cấp job mới.
- Cancel dùng chung AbortSignal để dừng các FFmpeg process đang chạy.

## Tests

- Thêm test các tham số NVENC MAX_SPEED.
- Thêm test worker pool giới hạn đúng hai job.
- Thêm smoke test thực tế tạo hai video đồng thời.
- Tổng 26 bài test tự động.
