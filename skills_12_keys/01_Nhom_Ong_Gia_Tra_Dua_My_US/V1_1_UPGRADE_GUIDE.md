# DADUS V1.0 → V1.1 UPDATE GUIDE (KHÔNG PHÁ CẤU TRÚC)

## Cài đúng
1. Sao lưu nguyên bản 5 Skill V1.0 và Project Instructions.
2. Thay 5 Skill hiện hữu bằng 5 file ZIP cùng tên ở `INSTALL_5_ZIP/`. **Không cài 5 tên mới song song** vì Skill slug không thay đổi.
3. Upload/cập nhật tài liệu Project: `DADUS_STEP_CONTROLLER_V1_1.md`, `SHARED_CROSS_SKILL_CONTRACT_V1_1.md`, `CREATIVE_UPGRADE_MANIFEST_V1_1.md`. Copy nội dung `DADUS_PROJECT_INSTRUCTIONS_COPY_PASTE.md` vào hướng dẫn Project.
4. Trên nội dung mới, chạy các lệnh như trước: `step1` → `step2` → `step3 A` → `step3 B` → `step3 C` → `step4` → (`step5` tối đa 1 lần khi NOT READY) → `step4` hậu sửa → `step6`.

## Bảo toàn dữ liệu video đang làm
- Nếu `CURRENT_FINAL_OUTLINE.txt` đã lưu và có SHA/video_id: **KHÔNG chèn các trường V1.1 mới vào file đó**, vì sẽ đổi SHA và ID video. V1.1 có thể đọc outline cũ; chỉ áp dụng prewrite gates V1.1 bắt đầu từ video mới.
- Nếu Stage A/B/C đã bắt đầu: tiếp tục đúng manifest của bản đang làm; không viết đè Part hay chạy lại Stage A để lấy chất lượng V1.1.
- Nếu đã Step5 hoặc READY: không cho một Step5 thứ hai. Không thay `FULL_SCRIPT_REVISED.txt` của video đã chốt. Muốn nâng nội dung, tạo **một phiên bản sáng tạo mới tách hẳn**, không được giả làm bản sửa thuộc cùng một manifest.
- QA `READY` không chứng minh CTR, giữ chân người xem hoặc 'hay hơn kênh mẫu'. Dùng chỉ số YouTube sau khi xuất bản để kiểm chứng.

## Các trường mới cho *outline mới* (vẫn là 7 Part, cùng 1 file)
`TITLE_EVENT`, `PROMISE_PAYOFF_EVENT`, `OUTCOME_PROOF`, `MORAL_COST`, `SCENE_STATE_CHANGE_GRID`, `EXPLAINED_ONCE_IN`, `US_LOCAL_ANCHORS`, `PRE_WRITE_GATES`. Chúng thuộc **khâu Step2 lập kế hoạch**; không thêm cổng file mới trong script Python cũ.

## QA và Step5
- `CREATIVE_READOUT` dùng để báo hook yếu, exposition lặp, Part 6 ít consequence… nhưng KHÔNG đưa vào Patch Ledger nếu chỉ là sở thích sáng tạo.
- Pxx sửa đúng lỗi thật về logic, nhân quả, lịch, tuổi, tài sản/quyền, nguồn chứng cứ, continuity, grammar/spelling/TTS. 1 giao dịch vá tất cả lỗi → 1 Step4 QA lại → dừng.
- Đây là ranh giới quan trọng giúp V1.1 vẫn tương thích bộ khóa byte và quota ONE_REPAIR_MAX=1.

## Kiểm thử
`python TEST_SUITE/run_tests.py` — regression bộ cũ.
`python TEST_SUITE/test_v1_1.py` — các kiểm thử phần chẩn đoán và bảo toàn script.

## Chẩn đoán kịch bản đã viết (không chỉnh sửa)
`python SKILLS/03-viet-kich-ban-ong-gia-us/scripts/narrative_diagnostics.py FULL_SCRIPT.txt --expected-location 'Columbus' --expected-location 'Ohio' --out RETENTION_DIAGNOSTICS.json`
Những cờ trong kết quả chỉ hướng dẫn biên tập viên đọc kiểm tra thêm; không phải kết luận tự động về retention hay tính pháp lý.
