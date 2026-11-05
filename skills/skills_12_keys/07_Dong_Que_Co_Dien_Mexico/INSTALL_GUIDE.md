# INSTALL / INTEGRATION — MEXICO RURAL V1.1

## Cài 5 Skill mới mà không làm hỏng các Skill đã chạy

1. Giữ nguyên HOMELESS V12 và Mafia V1.x cũ, không đổi tên/xóa/ghi đè chúng.
2. Cài từng ZIP `Mexico_01_...zip` đến `Mexico_05_...zip`; bên trong ZIP `SKILL.md` nằm ngay thư mục gốc và tài liệu tại `references/`. `01`, `02`, `03`, `04`, `05` là định danh tránh xung đột.
3. Tạo một Project hoặc Agent riêng cho `MEXICO_RURAL_CLASSIC` và dán toàn bộ `PROJECT_INSTRUCTIONS_COPY_PASTE.md` vào Project Instructions, bổ sung `MEXICO_STEP_CONTROLLER_V1.md` nếu có chức năng kèm tài liệu. Không kích hoạt controller HOMELESS cho kênh mới.
4. Với môi trường hỗ trợ filesystem/Python, lưu `scripts/mexico_pipeline.py` từ bundle tổng trong project workflow. Mỗi Skill cần script đã có bản copy riêng ở `scripts/`; nhưng **WORKFLOW_STATE.json phải là file chung của một video**, không khởi tạo state riêng cho mỗi Skill.
5. Chạy `step1` bằng title hoặc danh sách data mới; dùng `step2` sau khi khóa winner. `step3` chạy 3 lần A/B/C; QA `step4`; nếu cần chỉ `step5` một lần rồi `step4` xác nhận; cuối cùng `step6`.

## Đối chiếu hệ cũ

| Cũ HOMELESS | Mexico tương ứng |
|---|---|
| viral-title-rewriter | 01_viet-lai-tieu-de-mexico |
| viet-gian-y-homeless | 02_viet-gian-y-mexico |
| viet-kich-ban-homeless (DRAFT/REPAIR) | 03_viet-kich-ban-mexico (DRAFT/ONE_REPAIR) |
| kiem-tra-kich-ban-homeless | 04_kiem-tra-kich-ban-mexico |
| seo-homeless-story | 05_seo-mexico |

**Giống:** 5 Skill, 6 Step, riêng Writer Step3+5, title/outline canon lock, source hash, script 7 Part, QA độc lập, SEO sau READY. **Khác:** es-MX, các 6 DNA Hacienda/Rancho, target 85–100 phút / 11.5k–13.5k words và **chỉ một lượt sửa Step5**, không vòng patch liên tiếp.

## Nếu chỉ dùng text prompt không có Python

Có thể dùng Skills bằng mô hình, nhưng không xác minh được hash, đếm từ chính xác hay bảo toàn bản trước một cách độc lập. Không hiển thị `PROOF PASS` cho các kiểm tra chưa thực thi.

## Đảm bảo và giới hạn

- Unit tests xác nhận flow và chặn sửa lần 2. Chúng **không** chứng minh rằng model đã viết được kịch bản 90 phút hấp dẫn, không thay thế kiểm định chất lượng nhân công.
- Toàn bộ ví dụ minh họa là văn bản gốc, không sao chép nội dung mẫu.
- Đầu vào không có transcript; phân tích DNA dựa metadata, mô tả, thumbnail và mẫu frame chứ không phải phân tích đầy đủ spoken narrative.
- Nếu muốn xuất bản ngôn ngữ khác, cần thay cả language contract, SEO và QA rubric đồng bộ; không đổi riêng trong Writer.


## V1.1 mandatory commands / verification

Run `python -m unittest discover -s tests -v` in the full bundle before production. For a complete example with one repair:

```bash
python scripts/mexico_pipeline.py init --title-file FINAL_TITLE.txt --outline-file FINAL_OUTLINE.md --state WORKFLOW_STATE.json
python scripts/mexico_pipeline.py assemble --a SCRIPT_A.txt --b SCRIPT_B.txt --c SCRIPT_C.txt --out FULL_SCRIPT.txt
python scripts/mexico_pipeline.py check-script --script FULL_SCRIPT.txt --state WORKFLOW_STATE.json
python scripts/mexico_pipeline.py check-qa --report QA_REPORT_INITIAL.json --script FULL_SCRIPT.txt --state WORKFLOW_STATE.json
python scripts/mexico_pipeline.py audit-repair --before FULL_SCRIPT.txt --after FULL_SCRIPT_REVISED.txt --initial-report QA_REPORT_INITIAL.json
python scripts/mexico_pipeline.py commit-repair --before FULL_SCRIPT.txt --after FULL_SCRIPT_REVISED.txt --state WORKFLOW_STATE.json
python scripts/mexico_pipeline.py check-qa --report QA_REPORT.json --script FULL_SCRIPT_REVISED.txt --state WORKFLOW_STATE.json
python scripts/mexico_pipeline.py ready --script FULL_SCRIPT_REVISED.txt --report QA_REPORT.json --state WORKFLOW_STATE.json
python scripts/mexico_pipeline.py check-seo --seo SEO_PACKAGE.md --script FULL_SCRIPT_REVISED.txt --report QA_REPORT.json --state WORKFLOW_STATE.json
```

On INITIAL QA pass, omit audit-repair, commit-repair and VERIFY; use original script in both Step6 checks. The `audit-repair` command does not consume the one repair; only `commit-repair` does. Do not reinitialize a completed video to bypass the repair lock. The script helper cannot prove semantic quality or protect a state file that an administrator deliberately edits on disk.
