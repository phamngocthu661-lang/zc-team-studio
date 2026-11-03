# MEXICO RURAL — STEP CONTROLLER V1.1.0

## Cách gọi cùng syntax HOMELESS V12

`step1` → `step2` → `step3` (A) → `step3` (B) → `step3` (C) → `step4` (INITIAL) → [nếu cần `step5` (chỉ 1 lần) → `step4` (VERIFY)] → `step6`.

**One command = one step**; ngoại lệ nếu user yêu cầu rõ ràng `FULL PIPELINE` có thể chạy liền các bước nhưng phải chốt từng artifact và không skip kiểm định. Controller không viết thay Writer, không chấm thay QA.

1. Load file `SHARED_CROSS_SKILL_CONTRACT.md` và `SKILL.md` của bước đích. Chọn `CHANNEL_KEY=MEXICO_RURAL_CLASSIC`; không tải đồng thời skill HOMELESS/Mafia cùng tên nhiệm vụ.
2. `step1` cần source title/topic hoặc danh sách mẫu; kết xuất `FINAL_TITLE.txt`, `TITLE_REPORT.md`; khi đã khóa mới tiếp tục. Nếu user chỉ bảo “tìm 50 tiêu đề”, xuất 50 đề xuất, chọn top5 nhưng chỉ khóa winner theo chỉ thị.
3. `step2` dùng title khóa; `FINAL_OUTLINE.md` đủ 7 Part, mỗi Part có dramatic purpose, scenes, causality, cliffhanger, khoảng lời; không viết full script ở đây.
4. `step3` đọc outline gốc và lưu 3 đoạn A/B/C nối đúng 7 Part; ghép `FULL_SCRIPT.txt`; kiểm tra `scripts/mexico_pipeline.py check-script`. Chỉ sau assemble đầy đủ mới được gọi QA.
5. `step4 INITIAL` dùng script thực, kiểm tra logic và chính tả một lượt đọc tổng thể + một lượt soát chi tiết; phát hành `QA_REPORT.json`, `QA_REPORT.md`. PASS nếu `score>=97`, không hard fail, file cùng hash. Nếu lỗi nghiêm trọng, gói toàn bộ lỗi có thể sửa vào duy nhất một `REPAIR_PLAN.md`.
6. `step5 ONE_REPAIR` chỉ hợp lệ khi `repair_count=0`, QA INITIAL NOT_READY và lỗi đã được đóng băng. Thực hiện **một lượt sửa duy nhất**, xuất `FULL_SCRIPT_REVISED.txt`, `REPAIR_LOG.md`, cập nhật trạng thái qua `commit-repair`.
7. `step4 VERIFY` kiểm tra hash mới, logic/chính tả/canon không lỗi mới; nếu PASS → `step6`; nếu vẫn lỗi → `MANUAL_REVIEW_REQUIRED` (không gọi step5).
8. `step6` nhận script **cùng hash với QA READY** và title gốc; tạo `SEO_PACKAGE.md`, có đúng 2 supporting titles, A/B/C prompts, omni trailer và proof facts; không cần thêm skill thumbnail độc lập.

## Điều kiện bàn giao

- Không chuyển `step2` nếu chưa có title khóa.
- Không `step3` nếu outline thiếu 7 Part/canon.
- Không `step4` nếu chưa có full script; không dùng summary để chấm toàn bộ.
- Không `step5` nếu QA đã PASS, file đã đổi ngoài kiểm soát hoặc sửa_count >=1.
- Không `step6` nếu QA REPORT không READY hoặc hash script khác nguồn.

## Trạng thái và lệnh vận hành mẫu

```bash
python scripts/mexico_pipeline.py init --title-file FINAL_TITLE.txt --outline-file FINAL_OUTLINE.md --state WORKFLOW_STATE.json
python scripts/mexico_pipeline.py assemble --a SCRIPT_A.txt --b SCRIPT_B.txt --c SCRIPT_C.txt --out FULL_SCRIPT.txt
python scripts/mexico_pipeline.py check-script --script FULL_SCRIPT.txt --state WORKFLOW_STATE.json
python scripts/mexico_pipeline.py check-qa --report QA_REPORT_INITIAL.json --script FULL_SCRIPT.txt --state WORKFLOW_STATE.json
# Nếu QA INITIAL NOT_READY: sau khi Writer đã tạo file sửa đúng một lần
python scripts/mexico_pipeline.py audit-repair --before FULL_SCRIPT.txt --after FULL_SCRIPT_REVISED.txt --initial-report QA_REPORT_INITIAL.json
python scripts/mexico_pipeline.py commit-repair --before FULL_SCRIPT.txt --after FULL_SCRIPT_REVISED.txt --state WORKFLOW_STATE.json
python scripts/mexico_pipeline.py check-qa --report QA_REPORT.json --script FULL_SCRIPT_REVISED.txt --state WORKFLOW_STATE.json
python scripts/mexico_pipeline.py ready --script FULL_SCRIPT_REVISED.txt --report QA_REPORT.json --state WORKFLOW_STATE.json
# Sau STEP6 viết SEO_PACKAGE.md thì kiểm đủ 11 mục:
python scripts/mexico_pipeline.py check-seo --seo SEO_PACKAGE.md --script FULL_SCRIPT_REVISED.txt --report QA_REPORT.json --state WORKFLOW_STATE.json
```

**Lưu ý:** `check-qa` trên `phase=VERIFY` phải được chạy sau `commit-repair`; lệnh `ready` chỉ được chạy trên phiên bản hiện tại.

## Hướng dẫn trả lời ngắn cuối bước

- Step1 thành công: `Gợi ý: Gõ step2 để lập giàn ý 7 Part.`
- Step2: `Gợi ý: Gõ step3 để viết bản thảo A (Part 1–2).`
- Step3A: `Gợi ý: Gõ step3 để viết B (Part 3–5).`
- Step3B: `Gợi ý: Gõ step3 để viết C (Part 6–7), ghép Full Script.`
- Step3C: `Gợi ý: Gõ step4 để kiểm định logic và chính tả.`
- Step4 READY: `Gợi ý: Gõ step6 để đóng gói SEO.`
- Step4 NOT_READY (INITIAL): `Gợi ý: Gõ step5 để thực hiện lần sửa duy nhất.`
- Step5: `Gợi ý: Gõ step4 để QA xác nhận sau sửa.`
- Step4 VERIFY FAIL: `Đã hết 1 lượt sửa tự động. Cần biên tập thủ công; không gọi step5.`


### V1.1 state lock / corner cases

- If INITIAL QA READY: skip Step5/VERIFY and use `FULL_SCRIPT.txt` in `ready` / `check-seo`.
- If INITIAL NOT_READY: save `QA_REPORT_INITIAL.json` separately BEFORE repairing. `commit-repair` reads frozen findings and report digest from the existing state, checks every changed paragraph against exact original QA anchors. Never overwrite the INITIAL report with VERIFY before Step5.
- If cross-part fix requires modifications in a remote Part, put its exact source quote as `related_anchors` in INITIAL findings. If an anchor is not found, correct the initial report **before first registration**; once frozen do not silently edit.
- A missing transcript, incomplete source, QA not genuinely read, impossible needed edit or VERIFY still NOT_READY → `MANUAL_REVIEW_REQUIRED`. No second repair even if user later types `step5` again.
- After QA READY, `seo_gate_ready=true` but `seo_ready=false`; only successful `check-seo` sets final flag true. `seo_ready` is not a promise images/video were rendered or performance predicted.
- The state file must persist across all phases; moving folders does not require preserving the originating absolute sandbox path (script basename is stored). Do not reset state by running `init` on a different file for the same `video_id`.
