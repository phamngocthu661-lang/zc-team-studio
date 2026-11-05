---
name: viet-lai-tieu-de-japan-kuchikomi
version: "1.1.0"
language: "vi"
display_name: "Japan Senior Kuchikomi — Title Planner"
description: "STEP1: phát hiện title DNA từ 54 video Izumi, tạo 5 title Nhật 60+/退休/việc làm/tiền tuổi già, khóa một final Japanese title <=100 ký tự; không viết outline hoặc script."
---
# STEP1 — VIẾT TIÊU ĐỀ JAPAN SENIOR KUCHIKOMI

## Bắt buộc
Đọc `references/SHARED_CROSS_SKILL_CONTRACT.md`, `references/COMPETITOR_DNA.md`, `references/TITLE_PATTERNS.md`. Lệnh: `step1`. Không viết outline/story/script/QA/SEO. Lấy đề tài user đưa; nếu không có, gợi ý một *winner angle* từ dataset, **không khẳng định dự báo views**.

## DNA khóa
Tệp nguồn có **1 kênh và 54 video**, 41 tiêu đề chứa số 30. Nguyên tắc: các video top 1–7 đều có **mâu thuẫn kỳ vọng ↔ trải nghiệm thật**; tiêu đề tối ưu hành động trước, câu hỏi sau. Chủ đề làm việc sau nghỉ hưu không tự có performance như nhà ở/du lịch: cần móc nối quyết định thực tế ở 60–70 tuổi.

## Quy trình
1. Lấy 3–5 video tương tự (rank/views/độ dài/nhóm DNA) và rút cấu trúc click, không bê nguyên tiêu đề.
2. Viết `FAMILY=A..F` và `PROMISE` một câu chính xác. Đề tài phải bám định年後/仕事/年金/老後 hoặc phép nối cụ thể; tránh đổi hẳn sang drama Mafia hay các trò lừa vô lý.
3. Tạo **đúng 5 tiêu đề tiếng Nhật tự nhiên**, mỗi title ≤100 ký tự Unicode; không thêm hai title SEO vào đây.
4. Mỗi title có: `LENGTH`, cơ chế click, chủ đề, hình ảnh trung tâm, độ đặc thù, nguy cơ gây hiểu lầm, originality note. Có thể dùng `口コミ30選` nếu outline thật sự sẽ có 30 mục, tuyệt đối không ghi “実話” trừ khi có nguồn xác minh.
5. Kiểm tra title có phù hợp 30 chuyện độc lập, không mượn shock “地獄” sai bản chất; mỗi title hứa một sự thật cụ thể và 30 góc nhìn đa dạng.
6. Chọn một `WINNER`, xuất `CURRENT_FINAL_TITLE` nguyên văn, sau khi được user chọn thì khóa; nếu user chọn phương án khác giữ y nguyên lựa chọn.

## Test tránh tiêu đề nhạt
Reject `シニアが知っておきたいこと30選` (không có mâu thuẫn cụ thể); reject `70歳で全員が後悔する` (vơ đũa cả nắm), reject `年金が全部なくなる` (khẳng định sai luật), reject title dài >100.

## Artifact bắt buộc
`TITLE_LOCK.json` bằng `python scripts/pipeline_guard.py title-lock --title '...' --source 'competitor-data+new-original-idea' --output OUTPUT/TITLE_LOCK.json`. Báo exact length/hash; nếu môi trường không ghi file, in title đầy đủ và báo cần lưu bằng tay, không giả có SHA.

## Handoff
Gửi STEP2: `CURRENT_FINAL_TITLE`, `TITLE_LOCK.json`, niche DNA, keyword anchors, premise promise, 3 traps/truths cần có, target audience, source type (`fictional reconstructed` / `verified accounts`). Không tự thay TITLE sau khi khóa.

## V1.1 title promise gate
Anchor a single compelling mistaken choice and real-life consequence; for `30選`, promise 30 concrete variations rather than 30 identical morals. Compare five titles for specificity, novelty, audience decision value and what evidence a corresponding 30-story script can actually show. Do not promise "all 30 regretted it" if positive cases exist. Give predicted CTR only as hypothesis, not a guarantee.
