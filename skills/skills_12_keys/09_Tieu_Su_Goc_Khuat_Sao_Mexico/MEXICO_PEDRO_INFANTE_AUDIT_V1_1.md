# KIỂM TOÁN PEDRO INFANTE — MEXICO V1.0 → V1.1
Ngày kiểm tra: 2026-11-01 | Ngôn ngữ báo cáo: tiếng Việt | Dữ liệu đầu vào: `9-Pedro_Infante_Mexico_STEPS_1-6.zip` (24 tệp)

## 1. Quyết định tổng quát
**CHƯA ĐẠT CHUẨN PHÁT HÀNH ĐẦY ĐỦ; CẦN NÂNG CẤP PIPELINE V1.0.**
Mặc dù `QA_FINAL.json` tự báo `PASS_READY 98/100`, đó là kết quả QA của chính lần chạy đầu chứ không phải xác nhận độc lập. Công cụ V1.1 phát hiện lỗi lệch số đếm thật và metadata; yêu cầu đóng dấu QA từ bản script chính xác trước khi chuyển SEO/đăng tải. Điều này KHÔNG tự động kết luận nội dung tiểu sử sai hoặc bắt buộc viết lại.

## 2. Kiểm tra tệp/định lượng (đã thực hiện)
- ZIP 24 tệp, checksum của 24/24 mục trong `DELIVERY_FILE_CHECKSUMS.json` khớp file nguồn.
- Title khóa: `Pedro Infante: Sobrevivió a DOS ACCIDENTES AÉREOS… El TERCERO lo convirtió en LEYENDA` (85 ký tự theo báo cáo STEP 1).
- ID title `2bbba19bf255`, outline SHA `398f08dc9c30ea82232a48998fa648c510653a8b78c4ac017506ac3cb23a8e7c` và manifest tương hợp.
- 7 đề mục chính xác, A + B + C nối byte đúng `FULL_SCRIPT.txt`.
- `FULL_SCRIPT_REVISED.txt`: 45.582 byte, 44.609 body characters đo bởi công cụ, 7.023 body words; nội dung trong gate 40.000–49.000 ký tự.
- `QA_FINAL.json` V1.0 ghi 44.608 body characters (lệch 1). `QA_FINAL_REPORT.md` cũng ghi 44.608. `REPAIR_PROOF.json` ghi 44.609, đúng. **Đây là lỗi metadata thực tế, không phải lỗi biên tập.**
- Một patch P01 cho vấn đề số người tử nạn trên mặt đất; phép replay V1.1 khôi phục đúng script từ baseline + patch và xác minh mọi byte ngoài vùng sửa vẫn giữ nguyên. Chưa có chỉnh sửa script vòng hai.
- Ngưỡng phát hành thực sự 45–55 phút CHƯA chứng minh do không có TTS audio. 7.023 từ tương đương ~44–52 phút nếu tốc độ đọc 135–160 từ/phút (chưa tính nghỉ/ngắt, do đó chỉ là ước lượng).

### Phân bổ chương (đếm ký tự bao gồm khoảng trắng và dấu xuống dòng trong phần văn xuôi)
| Part | Ký tự | Từ xấp xỉ |
|---|---:|---:|
| 1 | 6.007 | 977 |
| 2 | 6.790 | 1.071 |
| 3 | 6.335 | 998 |
| 4 | 5.625 | 857 |
| 5 | 6.223 | 968 |
| 6 | 7.004 | 1.101 |
| 7 | 6.625 | 1.051 |

## 3. Đánh giá từng STEP
| STEP | Kết luận | Phát hiện | Nâng cấp V1.1 |
|---|---|---|---|
| 1 – TITLE | CONDITIONAL PASS | Hấp dẫn, <100 chars; tiêu đề khẳng định hai tai nạn đã chắc chắn trong khi một nguồn hành chính gọi tai nạn với Lupita là 'first'. Không nhất thiết tiêu đề sai, nhưng cần làm rõ độ độc lập bằng chứng, kể cả nguồn sao chép lại từ Notimex. | `TITLE_CLAIM_PROOF` với ma trận nguồn ủng hộ/đối lập và mức khẳng định. |
| 2 – OUTLINE | CONDITIONAL PASS | 7 Part, timeline rõ, nguồn ghi chi tiết; một entry S12 dùng hai cách mô tả không nhất quán về tình trạng đã xem ảnh PDF; Part 3 yêu cầu mục tiêu từ 5.100–5.900 nhưng thực tế 6.335, làm lệch nhịp phân bổ nhẹ. | Source conflict matrix, nguồn sơ cấp/thứ cấp, event-per-part, anti-padding. |
| 3 – SCRIPT | TECHNICAL PASS; EDITORIAL CONDITIONAL | Văn xuôi ~7.000 từ, 7 Part đầy đủ, TTS-clean; phần tranh luận chứng cứ chiếm diện tích đáng kể ở vài đoạn khiến lời kể có nguy cơ giống bài giảng hơn video hồi hộp. Chưa có thước đo audience retention thực tế. | Chặn trùng ý, mỗi 350–550 từ cần tiến triển thực chứng, chuyển Part không chỉ nhắc lại câu hỏi. |
| 4 – QA | TECHNICAL FAIL ON COUNTS | Đánh giá 98 do quy trình tự chấm; ghi sai 1 ký tự; JSON chưa khóa hash của QA final report hay source register, score breakdown. Chưa có checker thống nhất cho metadata. | `qa-seal` lấy số trực tiếp từ final file, khóa QA report/source, kiểm tổng điểm và các trường. |
| 5 – 1 REPAIR | PASS | Có đúng một batch patch P01, byte ngoài cửa sổ không đổi. Tệp trạng thái chứa đường dẫn tuyệt đối máy gốc nên lệnh verify cũ khó mang sang máy khác. | `repair-verify-portable` tính lại patch từ script gốc và chạy bằng đường dẫn tương đối trong package. |
| 6 – SEO/THUMB | CONDITIONAL PASS | 12 mục đầy đủ; title & SHA đúng; concept A/B/C và hook có cấu trúc. Chưa có ảnh thành phẩm, test CTR hay kiểm bản quyền tư liệu. Bước SEO legacy chỉ kiểm trạng thái JSON/score/hash. | `qa-check-strict` bắt buộc trước SEO, kiểm các ràng buộc release + khuyến nghị rights/TTS. |

## 4. Fact-check trọng tâm
1. Tai nạn cuối 15-04-1957 ở Mérida và tàu bay XA-KUN: xác nhận bởi hồ sơ chuyên ngành và báo đương thời.
2. Diễn giải hai tai nạn trước đó: bài Excélsior 2021 dẫn nguồn Notimex, TV Azteca và các bài báo hồi cố mô tả Guasave khoảng 1947 và Michoacán 1949. Ngược lại mục tiểu sử Secretaría de Cultura 2009 gọi tai nạn với Lupita Torrentera ở Michoacán là tai nạn "đầu tiên". Vì vậy gate title tuyệt đối cần kiểm độc lập trước khi dùng ngôn ngữ 'đã kiểm chứng hoàn toàn'. Đây là **bất đồng nguồn** chứ không đủ cơ sở kết luận tất cả các báo cáo về Guasave đều sai.
3. Số người chết ngoài phi hành đoàn trong vụ 1957: PDF báo *El Informador* 18/04/1957 trang 3 nêu Ruth Rosell Chan và Baltazar Martín Cruz; Los Angeles Times cũng nhắc một phụ nữ và một trẻ em; database BAAA ghi một người ngoài máy bay. Xử lý có ghi nguồn khác nhau là hợp lý. Tránh tuyên bố một con số duy nhất không dẫn chứng.
4. Cineteca Nacional xác nhận sinh 18/11/1917, cuộc đời điện ảnh, và giải thưởng tại Berlin; script không nên kể tin đồn lời trăn trối, suy nghĩ nội tâm hoặc lời thoại không có chứng cứ như sự thật.
5. Một tờ báo cũ có thể chứa phần tường thuật tin đồn cùng trang với tin chính xác; hai loại phải được tách biệt.

Nguồn để tự đối chiếu:
- Secretaría de Cultura: https://sic.cultura.gob.mx/ficha.php?table=artista&table_id=2420
- Cineteca Nacional: https://artsandculture.google.com/story/pedro-infante-%C3%ADcono-del-cine-mexicano/uwURiXkpkxKYLg?hl=es-419
- Báo El Informador 18/04/1957: https://hndm.iib.unam.mx/consulta/publicacion/pdf/558a36f17d1ed64f16d0960a.pdf?palabras=Pedro+Infante
- BAAA XA-KUN: https://www.baaa-acro.com/crash/crash-consolidated-b-24j-liberator-merida-4-killed
- Excélsior hai tai nạn: https://www.excelsior.com.mx/funcion/pedro-infante-voy-a-morir-en-un-accidente-de-aviacion/1443470
- Los Angeles Times: https://www.latimes.com/archives/la-xpm-2007-feb-11-me-then11-story.html

## 5. Những cải tiến trong ZIP 1.1 (không phá cấu trúc của hệ thống cũ)
- Giữ **5 Skills và 6 STEP**, tên thư mục Skill, tên artifact và giao thức điều phối; 7 Part, A/B/C, chỉ 1 batch sửa (Step 5), read-only final verify.
- Tool trong cả 5 Skills thêm `audit-run`, `repair-verify-portable`, `qa-seal`, `qa-check-strict`.
- Khóa QA bằng SHA của script/report/source, điểm chi tiết 35/30/25/10, số ký tự/từ tự động; phát hiện 1-character count mismatch và kiểm chứng bản vá byte-by-byte.
- Source conflict gate và title claim proof ngay từ STEP1/STEP2; chống padding không đủ bằng chứng; cảnh báo nhịp kể trong STEP3 nhưng không biến QA thành vòng viết lại vô hạn.
- 12 hạng mục SEO giữ nguyên, bắt buộc quality/release seal trước khi đóng gói cuối.

## 6. Regression tests
14/14 đạt trên bản gói Pedro Infante và một bản sao chuyển thư mục (bao gồm 8 negative tests và kiểm thử cấp phát sinh metadata). Những kiểm thử này chứng minh integrity CLI trong các tình huống đã thử; KHÔNG chứng minh chất lượng thẩm mỹ hay sự thật lịch sử của mọi video.

## 7. Hướng xử lý tập Pedro Infante hiện tại
Không cần chỉnh sửa lại kịch bản chỉ để sửa lệch 1 ký tự metadata, vì yêu cầu **chỉ sửa script một lượt** đã được thực hiện. Có thể giữ `FULL_SCRIPT_REVISED.txt` nguyên byte, sửa metadata/báo cáo bằng phép đếm chuẩn xác, tạo `QA_VERDICT_INPUT.json` dựa trên một lần thẩm tra thực chất cuối (không viết lại), rồi `qa-seal`/`qa-check-strict` và xuất lại SEO nếu cần. TTS runtime, bản quyền hình/nhạc và duyệt video thành phẩm vẫn là bước hậu kỳ chưa hoàn thành.
