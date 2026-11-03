# BÁO CÁO PHÂN TÍCH DATA KÊNH MẪU — IZUMI KUCHIKOMI

## Dataset
Nguồn user RAR `06_Huu_Tri_Viec_Lam_Japan.rar`, folder `17_Huu_Tri_Japan_IzumiKuchikomi`, handle `https://www.youtube.com/@izumi_kuchikomi`. Có metadata 54 video, 54 thumbnail JPEG, 1 MP4 đại diện (~37m51s), không có transcript/subtitle. Thống kê theo snapshot CSV, không phải xếp hạng CTR, không biết tuổi video. 45/54 video đạt 1000+ views. **41/54 title có số 30**; top10 có 8 video chứa 30; median thời lượng 32 phút; không phải mọi video đều đúng 30 lời kể.

## Ranking đặc trưng đáng học
1. 167k: `【安さの理由】団地暮らし、家賃は安いのですが…` (đặt nghịch lý tiền thuê nhà rẻ nhưng đánh đổi vô hình; 30口コミ).
2. 102k: `最近の日本の異変` người tuổi 60/70 chứng kiến biến đổi xã hội (30口コミ).
3. 81k: Tour du lịch một mình, giá/định kiến/cô đơn/vui vẻ (30口コミ).
4. 80k: tái hôn sau tuổi 58, kỳ vọng vs hiện thực.
5. 79k: du lịch tàu vòng quanh thế giới: mong đợi vs thất vọng, chi phí phát sinh (30口コミ).
6. 78k: cảm giác Nhật Bản đang đổi khác, tình huống nhỏ rất cụ thể (30口コミ).
7. 76k: tour xe buýt giá rẻ không muốn đi lần hai (30口コミ).
16. 21k: thời gian trống sau nghỉ hưu và cảm giác vô dụng (30口コミ).
39. 3.6k: trở lại đi làm sau 60, không còn được gọi bằng tên (30口コミ).
43. 1.4k: việc làm part-time cao tuổi nghe có vẻ rất nhàn (30口コミ).

**Lưu ý:** video về việc làm thuần túy ở snapshot thấp hơn những chủ đề rộng về nhà ở/trải nghiệm. Vì vậy khi tạo ý tưởng “việc làm”, phải đóng gói như một lựa chọn có chi phí và hệ quả (lương hưu × công việc × quyền tự trọng × gia đình), chứ không chỉ danh sách việc làm chung chung. Đây là giả thuyết biên tập, chưa phải kết quả A/B test.

## Cấu trúc viral học được từ descriptions/chapters
- Cold open bằng một người kể và một sự việc đầy chi tiết: `家賃は安いのですが…`, `3日、声を出していませんでした`, `朝8時半に一日が終わった`.
- Mở rất ngắn bằng việc người xem tự hình dung mình trong chuyện, không chào quá dài.
- 30 vignette độc lập với một hình ảnh/câu/giá tiền/sự lúng túng cụ thể mỗi mục.
- Xen câu chuyện buồn, bật cười, ngạc nhiên, ích lợi thực tế; không phải 30 câu chuyện đều “地獄” hoặc 30 kết có cùng bài học.
- Tiêu đề gắn `口コミ30選`, `60代・70代`, danh mục cuộc sống; video dài thường 27–42 phút.
- Chapter mô tả thường có 0:00 cold open, ~1:00 chủ đề, rồi từng 口コミ từ 2 trở đi.

## Thumbnail visual DNA quan sát trực tiếp
- 16:9 ngang; chữ chính rất lớn; hàng trên vàng/cyan trên nền đen, hàng dưới đỏ/trắng viền đen.
- Ảnh ghép từ 2–5 khoảnh khắc cụ thể; mặt người lớn tuổi hoặc nhân vật minh họa phản ứng lo lắng/ngạc nhiên, đôi khi linh vật nữ cartoon dẫn chuyện.
- Cụm từ 7–14 ký tự dễ đọc ở kích thước điện thoại, một nghịch lý hoặc điều “sau khi làm mới biết”.
- Điểm rủi ro: quá nhiều chữ nhỏ; nên A/B/C các mật độ chữ khác nhau. Không sao chép khuôn mặt nhân vật/mascot mẫu.

## DNA chủ đề gợi ý cho niche mới
A. `老後のお金・住まいの落とし穴` (chọn sai nhà, quản lý chi tiêu, trợ cấp/thu nhập): **hook chi phí thấp, cái giá ẩn**.
B. `定年後の仕事・再就職の現実`: **mức lương tưởng tốt, điều kiện làm việc khiến mệt/đau lòng**.
C. `年金・家計と尊厳`: **số tiền + quyết định + điều không ai nói trước** (không đưa số luật chưa xác minh).
D. `退職後の居場所・孤独`: **ngày dài và việc nhỏ làm đổi cảm giác về bản thân**.
E. `予想外の失敗・比較体験`: **lần đầu thử cái mới, phát hiện chi phí/luật chơi**.
F. `現代日本の違和感`: **thói quen 60–70 tuổi va vào máy móc/thu tục** nhưng không châm ngòi định kiến xã hội.

## Phân bổ gợi ý trong 20 tập đầu
Gắn với niche của user: khoảng 7 video nghề/tái tuyển, 5 video lương hưu/thu nhập/chi tiêu, 4 video lựa chọn nhà ở, 2 video cô đơn/hoạt động, 2 video chi phí bất ngờ. Điều chỉnh từ dữ liệu xuất bản thực tế; không giả như đối thủ có 20 tập theo tỷ lệ này.

## Quy tắc nguồn
Đây là học **cơ chế** title/thumbnail/retention, không tái sử dụng lời nói, title hoặc hình ảnh mẫu như sản phẩm cuối. Không suy diễn transcript MP4 từ tên file; không lấy description làm toàn bộ kịch bản.
