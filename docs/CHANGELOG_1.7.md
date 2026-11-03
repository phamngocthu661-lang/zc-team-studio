# Video Batch Studio v1.7

## Chế độ 1 stock đã cắt sẵn
- Thêm background `SINGLE_STOCK` cho màn hình Một video.
- Chọn trực tiếp 1 stock bằng hoặc dài hơn voice.
- Không quét kho stock, không reserve, không nối nhiều clip và không chạy Cross Dissolve giữa các stock.
- Stock dài hơn voice được trim; stock ngắn hơn quá 500 ms bị chặn với báo cáo rõ ràng.
- Nếu stock đã đúng 1920×1080 và 30 FPS, render planner bỏ scale/FPS conversion không cần thiết.

## GPU tự động
- Quét NVIDIA nền sau khi cửa sổ đã mở, không làm chậm khởi động.
- Chế độ Auto luôn thử H.264 NVENC trước khi fallback CPU.
- GTX 10xx tự dùng cấu hình tương thích P2, không tune/multipass/lookahead phức tạp.
- Encoder test được khóa theo từng encoder/GPU, tránh kết quả GPU 0 bị dùng nhầm cho GPU khác.
- Nếu runtime probe tạm thời thất bại nhưng có GPU NVIDIA và FFmpeg có NVENC, render vẫn thử NVENC thực tế.
- Khi NVENC lỗi: dọn FFmpeg → quét lại → retry tương thích → CPU fallback.

## Sửa lỗi & Nâng cấp Giao diện
- Bổ sung `validateRenderConfig`, sửa lỗi `validateRenderConfig is not defined` khi nhấn Kiểm tra.
- Bổ sung cấu hình Video Intro sau Disclaimer cho chế độ Tạo Batch: chỉ định thư mục chứa video intro cùng tên với voice (`VOICE_01.mp4`, `VOICE_02.mp4`, ...), mỗi voice dùng đúng 1 video intro duy nhất.
- Hỗ trợ tùy chọn **Audio intro**: Tắt tiếng intro (để đọc voice kịch bản xuyên suốt) hoặc Giữ tiếng video intro gốc.
- **Loại bỏ phần intro nhiều video (hậu tố _1, _2...) và chuyển cảnh intro/nhiễu**, giúp luồng cấu hình gọn gàng và chuẩn xác 1-1 theo tên voice.
- **Loại bỏ phần Used folder & không di chuyển file**: Khi video stock được dùng trong batch, hệ thống ghi nhận lịch sử và đánh dấu trạng thái `USED` trong cơ sở dữ liệu để không dùng lại cho các batch sau; toàn bộ file video stock gốc được giữ nguyên tại chỗ, không di chuyển vào thư mục Used.
- **Loại bỏ màn hình Tạo 1 video (Single Video)** khỏi thanh điều hướng và giao diện người dùng, tập trung toàn bộ luồng làm việc vào **Tạo Batch** tự động hóa cao.
