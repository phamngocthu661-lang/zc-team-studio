# KIỂM ĐỊNH LẦN CHẠY ĐẦU — CUỐN SỔ (MEXICO) V1.1.0

**Mẫu kiểm thử:** `7-MEXICO_CUON_SO_FULL_PIPELINE.zip` (22 ZIP entries; 21 actual files under project folder). **Phạm vi:** dữ liệu sản xuất do user cung cấp, chưa có file TTS render hoặc bảng CTR/retention YouTube.

## Kết quả độc lập có thể tái kiểm

| Gate | Kết quả |
|---|---|
| Title | Khóa một dòng, 92 ký tự Unicode, khớp các artifact |
| Outline | 7 Part, registry 10 nhân vật, timeline 1937–1938, proof/evidence ledger |
| Script ban đầu | 12.430 từ, 7 Part, SHA256 `2b117e85a8e8c0a35c0ef989645cc96d94348456d9a44e65f1f3005534d9fd45` |
| QA INITIAL | 95/100 nội bộ, NOT_READY; 1 MAJOR chronology và 2 MINOR es-MX |
| ONE_REPAIR | Cùng một batch, ảnh hưởng 3 đoạn văn ở Parts 2, 6, 7; 4,45% văn bản xét theo đoạn; đủ cả 3 findings và điều chỉnh phụ thuộc |
| Script sau sửa | 12.514 từ, 7 Part, SHA256 `75ea12edc8586035e56bbbdacc739e247cadb6ed745980ec7c8f051da852a322` |
| QA VERIFY | 99/100 nội bộ, READY; còn 1 cảnh báo MINOR về nhịp chuyển ngày, không phải lỗi logic nặng |
| SEO | Có đủ 11 mục; 2 supporting titles; 22 YouTube tags/368 ký tự; 3 prompts thumbnail 16:9; trailer 10/20/30s. Không có thumbnail/video được render |
| TTS | 92,7 phút nếu 135 từ/phút — **ước lượng**, chưa đo bản audio thật |

## V1 lỗi và rủi ro phát hiện

1. **BLOCKER REPRODUCED:** helper V1 placeholder regex `(?i)... TODO ...` đánh nhầm từ `todo` (~30 lần không phân biệt hoa thường). Lần chạy đã phải dùng `mexico_pipeline_esmx_fix.py`; V1.1 sửa chính script canonical lẫn tất cả ZIP dùng script này.
2. **HARDENED:** `commit-repair` của V1 chặn repair lần hai nhưng không giới hạn đoạn được sửa theo ledger. V1.1 kiểm tra vị trí thay đổi theo frozen exact QA anchors, yêu cầu khai báo dependent `related_anchors` trước khi chốt INITIAL QA, giới hạn max 25%. Đây là kiểm định phạm vi, không chứng minh hiệu quả sửa về nghĩa.
3. **HARDENED:** V1 có thể cập nhật QA report đồng điểm mà chưa xác minh exact report SHA. V1.1 đóng băng QA report SHA cùng findings.
4. **FIXED:** V1 đánh dấu `seo_ready=true` ngay ở QA READY, kể cả chưa có gói SEO. V1.1 tách `seo_gate_ready` và chỉ đánh dấu `seo_ready` sau khi validate 11-section package và giới hạn tag.
5. **HARDENED:** ngưỡng 300 từ/Part V1 cho phép Part rất ngắn trong tổng 11.5k–13.5k từ. V1.1 nâng mức mặc định ≥1000 từ/Part; still check content quality manually.
6. **EDITORIAL OPPORTUNITY:** nhiều cảnh xoay quanh giải thích/cuốn sổ, tạo nguy cơ trùng nhịp nếu lặp lại qua nhiều video. Bổ sung quy tắc mỗi Part phải có hành động, lựa chọn và cái giá thực; ít nhất mỗi 2 cảnh thuyết minh tài liệu phải có diễn biến bên ngoài.
7. **PUBLISH CAUTION:** lịch sử tiêu đề đã xuất bản của kênh chưa được cung cấp (`DUPLICATE_LEDGER_STATUS=NOT_SUPPLIED`), không thể chứng nhận title không trùng trên kênh. Ngưỡng 98/100 và QA 99/100 đều là rubric nội bộ, không phải thành tích CTR.

## Đối chiếu lịch sử bối cảnh

- Script đặt bối cảnh Veracruz, tháng 6/1938, không đưa mùa thu hoạch cà phê vào tháng 6. Mùa thu hoạch Coatepec hiện được ghi nhận vào khoảng tháng 11–3; đây chỉ là cross-check plausibility chứ không chứng minh mọi chi tiết 1938.
- Luật lao động liên bang Mexico đầu tiên năm 1931; kịch bản không tự phong bản thỏa thuận của 18 gia đình thành phán quyết tòa. Một bản bối cảnh lịch sử tổng hợp có giới hạn, không thể coi là tư vấn pháp luật 1938.

## Regression / result

- Script **không cần tự sửa thêm lần thứ hai**; V1.1 sửa hệ thống, không thay đổi `FULL_SCRIPT_REVISED.txt` của user. V1.1 áp dụng được lần chạy thực tế bằng cách tái chạy `init` → `check-script` → `check-qa INITIAL` → `commit-repair` → `check-qa VERIFY` → `check-seo` trên bản copy, giữ nguyên hash script.
- Unit tests: 16/16 `PASS` (gồm test chặn `TODO`, thay đổi ngoài vùng QA, QA anchor sai, QA report giả thay đổi, SEO thiếu section, sửa lần hai, wrong hash, 7 Part...).
- Những giới hạn còn lại: editor/AI cần kiểm tra chất lượng viết thật bằng cách đọc đầy đủ; chưa được nghe TTS, kiểm rendered thumbnails hoặc xác minh duplicate history của kênh.
