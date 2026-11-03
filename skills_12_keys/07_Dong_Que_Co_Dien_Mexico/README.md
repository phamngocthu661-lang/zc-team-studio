# MEXICO RURAL CLASSIC — 5 Skills / 6 steps (V1.1.0)

Bộ mới dựa vào 78 video của mẫu `@CuentosDelViejoCampo`, 78 thumbnail, metadata CSV + video mẫu TOP1 và đối chiếu kiến trúc HOMELESS V12/Mafia. Các sample title trong CSV phần lớn đã được chuyển sang tiếng Anh, nhưng mô tả/keywords kênh bằng Spanish; do thị trường đích Mexico, **đầu ra mặc định Spanish (es-MX)**.

## Cài đặt

- `01_viet-lai-tieu-de-mexico` → Title, Step1.
- `02_viet-gian-y-mexico` → Outline, Step2.
- `03_viet-kich-ban-mexico` → Writer (DRAFT ở Step3, ONE_REPAIR ở Step5).
- `04_kiem-tra-kich-ban-mexico` → QA, Step4 INITIAL/VERIFY.
- `05_seo-mexico` → SEO, Step6.

Mỗi ZIP Skill độc lập có `SKILL.md`, `VERSION.txt`, `README.md`, `references/CROSS_SKILL_QUALITY_CONTRACT.md` (bản copy đồng bộ). Có thể nhập ZIP Skill từng cái; bộ ZIP tổng chứa controller, tài liệu, scripts và evidence.

## Khác biệt theo yêu cầu

- QA tập trung **lỗi logic/canon/timeline và lỗi chính tả/ngữ pháp Tây Ban Nha**; vẫn kiểm promise title/độ dài để tránh sai cơ bản.
- Writer chỉ **một lần repair** sau QA: sửa tất cả lỗi đã chốt trong một batch; QA VERIFY không mở vòng sửa thứ hai.
- 3 lượt `step3` là 3 đoạn **soạn bản thảo mới**, không được tính là repair.

## Cách chạy

Đặt toàn bộ bộ `MEXICO...` trong project, dán `PROJECT_INSTRUCTIONS_COPY_PASTE.md` vào project instructions, và gọi `step1`/`step2`/... theo controller. Nếu môi trường có Python, sử dụng helper `scripts/mexico_pipeline.py` cho hash, word count, state và giới hạn repair. Nếu platform không cho chạy Python, hướng dẫn vẫn dùng được nhưng các chứng nhận hash/wordcount phải ghi rõ chưa kiểm chứng.

Chi tiết nguồn và DNA: `evidence/RESEARCH_DATA_REPORT.md`. Test helper bằng `python -m unittest discover -s tests -v`.


## V1.1 (after first full pipeline audit)

- Real first-run transcript length/7-Part/QA hashes verified, QA score 99 internally, one repair; no additional rewrite of the actual story mandated.
- Fixed critical false `TODO` placeholder match of `todo` in Spanish; no custom patched helper needed.
- QA report SHA and anchors frozen, repair scope mechanically checked, unchanged Part and paragraph preserved, one repair remains strict.
- SEO completion separate from QA approval: `check-seo` enforces 11 parts, tags ≤500 and exact evidence before `seo_ready=true`.
- 16 unit tests plus actual first-run full pipeline replay. Details and limitations in `AUDIT_FIRST_RUN_V1_1.md`.
