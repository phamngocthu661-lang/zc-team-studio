# MEXICO CELEBRITY SKILLS V1.1 — VI / INSTALL

## Trạng thái và phạm vi
- Giữ nguyên tên thư mục của 5 Skill, 6 STEP, format file, tiêu đề khóa, kịch bản tiếng Tây Ban Nha Mexico, 7 Part, A/B/C và đúng **1 batch sửa**.
- Đây là bản nâng cấp kỹ thuật + quy tắc kể chuyện và đối chiếu nguồn sau lần chạy thử Pedro Infante. Không tự nhận rằng chất lượng phim đã được TTS đo hoặc đánh giá CTR thực.

## Cài đặt
1. Gỡ/ghi đè các phiên bản 1.0 của đúng 5 Skills Mexico; KHÔNG tạo Skill tên khác để giữ nguyên Controller.
2. Giải nén 5 ZIP V1.1, giữ đúng thư mục skill bên trong; không đặt thêm một lớp thư mục không cần thiết.
3. Sử dụng `MEXICO_STEP_CONTROLLER_V1.md` và file instructions ở thư mục gốc này. Hướng dẫn V1.1 có quyền ưu tiên khi có xung đột; không cần thay đổi controller lệnh next/status/redo hiện tại.
4. Các command mới (`audit-run`,`repair-verify-portable`,`qa-seal`,`qa-check-strict`) có sẵn trong mỗi Skill, chỉ là lệnh kiểm toàn vẹn: không xác minh nguồn trên Internet tự động.

## Handoff cần thi hành
- STEP 1 `TITLE_CLAIM_PROOF` cho title định lượng hoặc nhạy cảm; ưu tiên đóng gói sự thật, nguồn độc lập, title history.
- STEP 2 source conflict table, timeline, title promise và nguồn chứng cứ cho từng Part; dừng nếu chứng cứ mỏng, không bịa để đủ 40–49k char.
- STEP 3 script A/B/C 7 Part (một stage/lần) + SHA và đếm ký tự bằng tool; anti-padding.
- STEP 4 báo cáo đọc độc lập 2 lượt (logic/nguồn và chính tả); một QA_PATCHES duy nhất.
- STEP 5 chỉ 1 batch sửa, replay exact byte `repair-verify-portable` kể cả archive đã chuyển máy; không chỉnh sửa vòng hai.
- STEP 4 final READ-ONLY: giữ `QA_FINAL_REPORT.md` gồm final SHA và exact body_chars; build `QA_VERDICT_INPUT.json` từ review thực. Lệnh `qa-seal` xuất `QA_FINAL.json` chính xác từ final script.
- STEP 6 trước tạo SEO phải `qa-check-strict --dir <folder>` PASS. Nếu sai metadata thì tạo lại metadata QA từ nguồn xác thực KHÔNG sửa nội dung script. Quyền ảnh/âm thanh/TTS phải kiểm trước publish.

## QA verdict example (giá trị chỉ minh họa)
```json
{"score":98,"score_breakdown":{"factual":34,"chronology":29,"spanish":25,"title_structure":10},"editor_review_confirmed":true,"blocking_issues":[],"resolved_issue_ids":["P01"],"evidence_limitations":["Historical discrepancy retained with attribution"]}
```

## Không đổi
5 Skill names: `viral-title-rewriter-mexico`; `viet-gian-y-mexico`; `viet-kich-ban-mexico`; `kiem-tra-kich-ban-mexico`; `seo-mexico-celebrity`. 7 Part, naming `MEX_<title_sha12>_SCRIPT_A/B/C.txt`, `FULL_SCRIPT.txt`, `FULL_SCRIPT_REVISED.txt`, one batch only. Old project's results stay unchanged; V1.1 rules apply to NEW runs.
