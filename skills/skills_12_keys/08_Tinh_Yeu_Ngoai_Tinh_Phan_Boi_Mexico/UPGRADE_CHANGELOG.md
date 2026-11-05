# MEXICO SKILLS V1.1.0 — CHANGELOG

## Không phá vỡ workflow cũ
Giữ nguyên 5 Skill và tên thư mục, `SKILL.md` tại gốc ZIP cài riêng, `references/`, `scripts/`, `PART 1..7`, quy trình S1→S2→S3→S4→S5 một lượt→S4B→S6, các file giao tiếp `.json`/`.txt`/`.md`, niche ID `MEX_INFIDELIDAD_V1` và cơ chế hash SHA-256.

## Cải tiến
1. S1 khóa lời hứa title với biến cố, vật chứng, thời điểm và payoff; yêu cầu bằng chứng ledger chống trùng.
2. S2 kiểm timeline của nhân chứng (đến lúc nào, nghe trực tiếp hay biết qua video), chuẩn hóa tên các cơ sở và tính thứ trong tuần.
3. S3 đưa trọng tâm cảm xúc trở lại nhịp telenovela, lọc đại từ không rõ và trùng ngữ tiếng Tây Ban Nha, ưu tiên giọng Mexico tự nhiên.
4. S4/S4B bắt buộc bảng bằng chứng đọc từng PART và báo cáo lỗi bị bỏ sót; không xem boolean hoàn thành hay hash là chứng chỉ nội dung.
5. S5 vẫn đúng **một lượt sửa duy nhất**; lỗi sót sau sửa dẫn tới BLOCKED_MANUAL_DECISION, không mở vòng tự động mới.
6. S6 kiểm tra scene thumbnail/trailer thực sự tồn tại trong kịch bản, phân biệt ảnh đã render với prompt, cấm hư cấu số phút TTS.
7. Python: stage portable relative paths + hỗ trợ manifest V1 absolute sau khi xuất ZIP, `audit-run` xem toàn chuỗi, strict `seo-gate --workdir`, cảnh báo trùng cụm từ ở mức tư vấn, kiểm tra marker và proof sửa một lượt.
8. Bổ sung kiểm thử mới và dùng chính bộ chạy lần đầu làm fixture xác nhận tương thích.

## Lệnh sau khi import
`python scripts/workflow_tools.py audit-run --workdir runs/<video_id> --require-seo`

`python scripts/workflow_tools.py seo-gate --title-file runs/<video_id>/CURRENT_FINAL_TITLE.txt --script runs/<video_id>/FULL_SCRIPT_REVISED.txt --qa-final runs/<video_id>/QA_FINAL.json --workdir runs/<video_id>`

Nếu `repair_count=0` thì thay `FULL_SCRIPT_REVISED.txt` bằng `FULL_SCRIPT.txt`.

## Giới hạn kỹ thuật
`MECHANICAL_PASS_EDITORIAL_REVIEW_REQUIRED` và `PASS_STRICT_MECHANICAL_ONLY` chỉ xác nhận tệp/hash/số từ/chuỗi thao tác; không xác nhận mọi lời kể logic, giọng Tây Ban Nha bản xứ, độ dài âm thanh hay lượt xem.
