# Giới hạn đã biết

- Subtitle libass, Cross Dissolve/xfade, drawtext và một số layer/chroma-key vẫn là filter CPU. GPU được dùng cho decode/scale khi tương thích và NVENC encode.
- Một số codec hoặc pixel format đầu vào có thể không hỗ trợ CUDA hardware decode. App sẽ tự retry bằng NVENC-only.
- Bản FFmpeg phải có `cuda`, `scale_cuda` và NVENC để dùng pipeline GPU đầy đủ.
- Card NVIDIA hoặc driver quá cũ có thể có encoder trong danh sách FFmpeg nhưng không khởi tạo được; app sẽ báo lỗi.
- Cần kiểm thử thực tế trên từng dòng GPU mục tiêu vì số phiên NVENC đồng thời và codec hỗ trợ khác nhau theo card/driver.
- License offline không thể thu hồi ngay sau khi đã phát hành nếu không đổi public key hoặc chờ hết hạn.
- Muốn khóa theo một máy, admin phải tạo key từ đúng Mã máy của khách hàng.
- Gia hạn yêu cầu gửi key mới; không có tự động thanh toán/gia hạn vì không dùng server.
- Thay mainboard/cài Windows có thể làm mã máy thay đổi và cần cấp key mới.
- Clock rollback protection chỉ ở mức cơ bản.
- Build installer Windows cần chạy trên Windows với dependency Electron đã cài.
