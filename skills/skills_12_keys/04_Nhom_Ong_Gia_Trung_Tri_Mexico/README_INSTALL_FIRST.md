# CÀI ĐẶT PADRE IMPLACABLE MÉXICO — V1.2

Mục đích: thêm bộ chủ đề 04 vào hệ thống 5 ZIP Skills / 6 Step hiện tại mà không ghi đè Mafia/Homeless. ZIP tổng bao gồm năm thư mục skill đầy đủ, mã Python, corpus từ CSV (71 entries), controller, references, hướng dẫn và kiểm thử.

## Năm ZIP cài đặt trong /mnt/data
1. `Viet-Tieu-De-PADRE-MX-V1_2.zip`
2. `viet-gian-y-padre-mx-V1_2.zip`
3. `Viet-kich-ban-padre-mx-V1_2-THREE-STAGE-ONE-REPAIR.zip`
4. `kiem-tra-kich-ban-padre-mx-V1_2-AUDIT-ONLY.zip`
5. `seo-padre-mx-V1_2.zip`

## Cài đặt
- Tạo Project Mexico riêng (không lẫn Skill Hoa Kỳ/Homeless). Upload đủ 5 ZIP ở trên và 2 file `PADRE_MX_STEP_CONTROLLER_V1.md`, `PADRE_MX_PROJECT_INSTRUCTIONS_COPY_PASTE.md`; thay Project instructions bằng nội dung file copy-paste; giữ một file `SHARED_CROSS_SKILL_CONTRACT_V1.md` chung.
- Giữ `SOURCE_DATA/channel_corpus_71.json` và `SOURCE_DATA/REFERENCE_ANALYSIS.md` làm tư liệu. Tốt nhất ghép thêm bản transcript chuẩn/retention thống kê về sau trước khi kết luận hơn đối thủ.
- Tên SKILL folder khác Homeless để tránh router gọi nhầm. Trong thư mục gốc mỗi ZIP có 1 skill thư mục với file `SKILL.md`.
- Nếu hệ thống của bạn tự chạy `step1` ... `step6`, chỉ cần mapping 5 ZIP theo bảng controller. Giao tiếp bước và các file A/B/C giữ kiểu V12; PREFIX đổi `HML_` sang `PMX_`, file QA schema đổi sang PADRE_MX, nên KHÔNG mang các manifest Homeless cũ sang.
- Chạy kiểm thử mô phỏng: `python tests/test_system.py`; bài test cố ý chứa dữ liệu văn bản giả nên không chứng minh câu chuyện hay. Có thể chạy Python `scripts/* --help` riêng trong từng Skill.

## Chỉnh sửa duy nhất
`step4` review→`step5` repair exactly once→`step4` re-audit; sửa lần thứ hai bị chặn bởi both skill logic & script guards. Khi QA postrepair không đạt: BLOCK, cần version mới chứ không loop.

## Giới hạn đánh giá
Dữ liệu nguồn có CSV/description/thumbnail 2 kênh và MP4 mẫu nhưng không có transcript độc lập. Vì thế phân tích nhận diện title/thumbnail/hook/tình huống chứ chưa chứng minh đã đánh giá đầy đủ kịch bản/retention từng video. Chưa thể bảo đảm kịch bản mới "hay hơn" kênh mẫu chỉ bằng bộ quy tắc; cần A/B test và phản hồi sản xuất thật.

V1.1 NEW: follow references/QA_REVIEW_V11_SCHEMA.json in the QA skill and require exact per-Part anchors, complete rubric and chronology ledger. Legacy frozen QA packets without this evidence are NOT upgraded retroactively. Run test_system.py and test_v11_regressions.py before deploying. ZIP filenames have _V1_1 suffix outside; the five installable root folder names remain V1 for compatibility.

**Deployment:** Đọc `CHANGELOG_V1_1.md` và `QA_AUDIT_IDEA2_AND_UPGRADE.md` trước khi nâng cấp. Thay trọn bộ 5 ZIP trong một Project Mexico riêng; không trộn file QA V1.0 với V1.1. Mỗi dự án mới chạy `python tests/test_system.py`, `python tests/test_v11_regressions.py`, `python tests/test_seo_v11.py`. Khi V1.1 không thể chứng nhận bản cũ, điều này là an toàn: QA lại từ đầu, không tự tái cấp READY.

## V1.2 — Hai yêu cầu cập nhật 07/11/2026
- **Khắc phục kịch bản chỉ đạt ~1/2 mục tiêu**: không giảm chuẩn 70–80 nghìn ký tự. Bắt buộc viết đủ nội dung tự nhiên; kiểm ngay Step3 A 20–24k/B 30–35k/C 20–25k; ít nhất 8.500 ký tự mỗi Part. Mã `segment_workflow.py` đã sửa để từ chối Stage ngắn.
- **Hai ảnh cuối Step6**: `THUMBNAIL.png` + `THUMBNAIL-NENXANH.png`, chung một chân dung nam ở bên phải, đúng vị trí/tỉ lệ, xanh thuần `#00FF00` để dễ tách, không có chữ trên ảnh nền xanh. Hai ảnh mẫu có trong `seo...zip/references/`. Phải render ảnh thật; có validator kiểm cả 2 file.
- TEST_REPORT_V1_1.md và QA_AUDIT_IDEA2_AND_UPGRADE.md là lịch sử của V1.1, KHÔNG phải bằng chứng test V1.2. Tham khảo CHANGELOG_V1_2.md và TEST_REPORT_V1_2.md.
