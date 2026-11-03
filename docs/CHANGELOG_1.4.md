# Changelog 1.4.0

## Fixed

- Sửa modal bị kẹt trên màn hình do `.modal { display:grid }` ghi đè thuộc tính HTML `hidden`.
- Thêm `html [hidden] { display:none !important; }` để sửa cho modal, License Gate và các panel ẩn khác.

## NVIDIA GPU

- Thêm phát hiện runtime NVENC thực tế thay vì chỉ kiểm tra tên encoder trong FFmpeg.
- Thêm phát hiện `cuda` hardware acceleration và filter `scale_cuda`.
- Thêm CUDA runtime smoke test với `hwupload_cuda`, `scale_cuda` và `h264_nvenc`.
- Video input có thể dùng NVDEC/CUDA decode bằng:
  - `-hwaccel cuda`
  - `-hwaccel_output_format cuda`
- Resize stock và video layer bằng `scale_cuda` trước khi download frame cho các filter CPU.
- Encode bằng `h264_nvenc` hoặc `hevc_nvenc` với GPU index đã chọn.
- Preset tốc độ mặc định là `p3`.
- Tự fallback từ CUDA decode/filter sang NVENC-only nếu media đầu vào không tương thích.
- Khi người dùng chọn NVENC nhưng GPU/driver không hoạt động, app báo lỗi thay vì âm thầm dùng CPU.

## UI

- Đổi nhãn codec thành NVIDIA CUDA/H.264 NVENC và NVIDIA CUDA/H.265 NVENC.
- Thêm checkbox `CUDA decode + scale`.
- Thêm ô chọn GPU NVIDIA theo index.
- Dashboard hiển thị trạng thái CUDA + NVENC, NVENC-only hoặc CPU.

## Tests

- Thêm test tạo FFmpeg arguments cho CUDA/NVDEC/scale_cuda/NVENC.
- Thêm test fallback CUDA sang NVENC-only.
- Thêm test ngăn silent CPU fallback khi đã chọn NVIDIA.
- Thêm regression test cho CSS `hidden` và modal `display:grid`.
