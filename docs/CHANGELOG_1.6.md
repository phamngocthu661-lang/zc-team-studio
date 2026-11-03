# Changelog 1.6.0

## GPU auto detection

- Quét NVIDIA GPU bằng `nvidia-smi`.
- Đọc GPU index, tên, driver, VRAM trống và utilization.
- Test `h264_nvenc` tuần tự tối đa ba lần.
- Tự chọn GPU có NVENC hoạt động và VRAM phù hợp.
- Cache kết quả 5 phút để tránh mở encoder test liên tục.
- Có nút Quét lại GPU trong Dashboard.

## Stable NVENC pipeline

- Mặc định chuyển từ Full CUDA sang `AUTO_STABLE`.
- CPU decode/filter + NVIDIA NVENC encode.
- Full CUDA chỉ chạy khi người dùng chủ động chọn.
- Giảm NVENC surfaces và CUDA extra frames trong profile tốc độ để phù hợp GTX 10xx.
- Có cấu hình NVENC compatibility mode P2 với ít option hơn.

## Recovery

- Phân biệt CUDA/NVDEC error và NVENC initialization error.
- CUDA lỗi tự chuyển NVENC-only.
- NVENC lỗi tự cleanup, rescan, thử GPU khác và compatibility mode.
- Cho phép CPU fallback để hoàn thành job.
- Không giảm bitrate khi gặp lỗi filter không liên quan.
- Retry dung lượng và retry pipeline được tách riêng.

## Cancel/process cleanup

- Hủy FFmpeg bằng lệnh `q`, sau đó kill toàn process tree trên Windows nếu cần.
- Ghi trạng thái `ABORTED/CANCELLED` thay vì `SIGTERM FAILED`.
- Lưu PID FFmpeg đang chạy và dọn PID còn sót sau crash.
- Tự tìm và dừng legacy FFmpeg có command line trỏ vào app temp folder.

## UI

- Codec mặc định `auto`.
- GPU mặc định `Tự động quét`.
- Tăng tốc mặc định `Tự động ổn định — NVENC`.
- Batch mặc định 1 worker trên GTX 1060.
- Hiển thị GPU được chọn và trạng thái NVENC.
