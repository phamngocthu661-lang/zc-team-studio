# GPU Recovery Guide

## Lỗi `cuvidCreateDecoder ... CUDA_ERROR_INVALID_VALUE`

Timeline stock dài có thể đưa nhiều input video vào cùng một FFmpeg process. Mỗi input CUDA có thể tạo decoder riêng. Trên GTX 1060, số decoder, codec, pixel format hoặc kích thước nguồn có thể làm NVDEC từ chối một số input.

Giải pháp mặc định trong v1.6 là không dùng NVDEC cho timeline phức tạp. App vẫn encode bằng NVENC nên Video Encode vẫn chạy trên GPU.

## Lỗi `scale_cuda ... Function not implemented`

Subtitle libass, xfade, drawtext, chromakey và nhiều overlay là software filter. Chuyển frame qua lại giữa CUDA và CPU làm filter graph phức tạp và phụ thuộc pixel format. `AUTO_STABLE` tránh đường truyền này.

## Lỗi `Không thể khởi tạo h264_nvenc`

App thực hiện theo thứ tự:

1. Dừng tiến trình FFmpeg còn sót.
2. Chờ giải phóng encoder.
3. Test lại GPU tối đa ba lần.
4. Thử GPU khác.
5. Thử NVENC compatibility mode.
6. Fallback libx264 nếu vẫn không thể dùng NVENC.

Nếu lỗi chứa `driver does not support the required nvenc API version`, phải cập nhật NVIDIA driver hoặc dùng FFmpeg tương thích driver hiện tại.

## Task Manager

Chọn GPU → đổi một biểu đồ sang `Video Encode` và một biểu đồ sang `Video Decode`. Với AUTO_STABLE:

- Video Encode tăng khi NVENC hoạt động.
- Video Decode có thể thấp vì decode chạy CPU.
- 3D không phải chỉ số chính của NVENC.
