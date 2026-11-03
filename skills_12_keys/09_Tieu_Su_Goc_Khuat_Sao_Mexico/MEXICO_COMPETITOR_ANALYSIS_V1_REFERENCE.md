# Phân tích dữ liệu kênh mẫu — Nhóm 9 sao Mexico

**Nguồn**: Bộ RAR người dùng cung cấp; kênh mẫu [Tras el Aplauso](https://www.youtube.com/@TraselAplausoTV99). Đây là snapshot trong file, **không phải số liệu YouTube hiện tại**. Đã đọc metadata 137 dòng CSV, 137 thumbnail và lấy mẫu hình ảnh tại 8 mốc thời gian của 1 MP4 (48m31.7s); không có phụ đề hoặc bản transcript kèm theo. Các diễn giải dưới đây là phân tích kỹ thuật đóng gói, không phải xác nhận cáo buộc của video.

## Thống kê nội dung

| Metric | Data |
|---|---:|
| Tổng video | 137 |
| Tổng view snapshot | 12,298,300 |
| View median | 42,000 |
| View mean | 89,768 |
| Top10 share cumulative views | 36.8% |
| Thời lượng trung vị | 48.3 phút |
| Thời lượng trung bình | 49.1 phút |
| Video từ 40 đến <50 phút | 94 |
| Video từ 50 đến <60 phút | 42 |
| Video dài trên 60 phút | 1 |
| Độ dài title trung vị | 83 Unicode characters |
| Độ dài title tối đa | 100 Unicode characters |
| Có subtitle theo CSV | 0/137 |

## Định vị chủ đề và thiết bị thu hút người xem

Từ khóa trong title (chỉ dựa phép tìm chuỗi, có thể trùng nhãn và không phản ánh tính xác thực):

- `KARMA`: 48/137 titles.
- `DISGUSTING`: 37/137 titles.
- `CRUEL`: 30/137 titles.
- `BETRAYAL`: 10/137 titles.
- `SECRET`: 10/137 titles.
- `HUSBAND`: 17/137 titles.

Công thức phổ biến: tên sao nổi tiếng → đối lập hình tượng công chúng với sự kiện đời tư/sự nghiệp → hậu quả → câu hỏi khơi gợi. Top title đa số ghi bằng tiếng Anh, trong khi thumbnail kênh dùng những headline tiếng Tây Ban Nha lớn, và mô tả có nội dung Spanish. Bộ mới chọn **es-MX** nhất quán để thuận khán giả Mexico; không sao chép nguyên các cáo buộc clickbait.

Mẫu 16 thumbnail ở các thứ hạng 1, 2, 3, 4, 5, 6, 9, 10, 13, 17, 20, 25, 34, 50, 80, 110 cho thấy nền burgundy/đen, ảnh 1–2 chân dung lớn, ảnh thứ hai trong vòng tròn vàng, mũi tên cong vàng, headline to màu vàng có viền đen và subline màu trắng ở dưới. Các chi tiết cụ thể (screenshots, tài liệu trong hình đối thủ) không mặc định là thật.

Video đại diện có video stream AV1 640×360 và audio Opus; mẫu frame 5/25/60/180/600/1200/2200/2850 giây ghi nhận montage hình sân khấu, lưu trữ, chân dung và ảnh mang tính tư liệu. Không có transcript để phân tích chính xác câu chữ, tốc độ VO hay mức độ khớp với lời kể.

## Ý nghĩa cho bộ Skills mới

1. Mục tiêu video tương tự thị trường 45–55 phút; thiết kế 7 Part và script tầm 42–48k ký tự es-MX, chạy TTS test để biết duration thật.
2. Có năm content families xoay quanh image-vs-facts, relationship, decline/return, documented decision, legacy; chỉ dùng khi sự kiện thật được kiểm chứng.
3. Tạo 5 title candidate (≤100 ký tự), score 100; title có thể giật tò mò nhưng không được khẳng định bịa hoặc cáo buộc khi nguồn yếu.
4. Giàn ý phải có claim ledger Sxx/Cxx, timeline; documentary thật khác fiction Mafia và HOMELESS.
5. QA chỉ 1 vòng đọc đầy đủ gom toàn bộ lỗi logic/timeline/facts/chính tả, Step5 sửa **duy nhất 1 lần**, rồi chỉ final verify (read-only).
6. SEO kèm 3 concept thumbnail A/B/C, headline Spanish 2 dòng tương phản, hook video 8 giây; hạn chế ảnh giả mô phỏng bằng chứng.

## Giới hạn

Dữ liệu là một kênh, không có ngày phát hành hay CTR/AVD/retention, vì vậy không thể kết luận tính từ khóa gây view hoặc dự báo hiệu suất kênh mới. Các lời buộc tội trong tên video/mô tả mẫu **chưa được xác minh**; Skills không được tự kế thừa chúng thành lời khẳng định. Bộ mẫu cũng không cấp quyền sử dụng hình ảnh, video hoặc âm thanh của đối thủ.
