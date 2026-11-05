# MEXICO TELENOVELA / INFIDELIDAD × TRAICIÓN — SKILLS PACK V1.1.0

## 1. Thông tin
- MARKET: Mexico; ngôn ngữ khán giả: tiếng Tây Ban Nha tự nhiên kiểu Mexico (es-MX).
- Thể loại: telenovela / long-form audio storytelling, ngoại tình, phản bội, phẩm giá, phục hồi vị thế; KHÔNG phải Mafia hay HOMELESS.
- Căn cứ đối chiếu: CSV 215 video, 215 thumbnail và 1 video 6.212 giây của kênh `Amor Secretos y Traición` trong tệp dữ liệu người dùng cung cấp. Không sao chép script/ảnh của kênh mẫu.
- 5 Skills riêng; 1 Controller + 1 Cross-skill Contract; mô hình **Step1 → Step2 → Step3 → Step4 → Step5 (tối đa một lần) → Step4B → Step6**.
- Nội dung `SKILL.md` bằng tiếng Việt để vận hành; *video output* bằng tiếng Tây Ban Nha es-MX.

## 2. Cài đặt giữ cấu trúc Skills cũ
Các thư mục sau là Skills độc lập; import **ZIP từng Skill** (có `SKILL.md` ở root ZIP) vào hệ thống cài Skills của bạn. Không nạp file ZIP tổng thành một Skill đơn.
1. `Viet-Lai-Tieu-De-Mexico`: S1 Tiêu đề.
2. `Viet-Gian-Y-Mexico`: S2 Giàn ý.
3. `Viet-Kich-Ban-Mexico`: S3 viết và S5 sửa theo QA.
4. `Kiem-Tra-Kich-Ban-Mexico`: S4/S4B kiểm định độc lập.
5. `Viet-SEO-Mexico`: S6 SEO, thumbnail, trailer.

Bản ZIP tổng là lưu trữ tất cả Skills và tệp vận hành, không thay thế việc chọn đúng Skill. Với hệ thống custom workflows, dán `PROJECT_INSTRUCTION_MEXICO_V1.md` làm controller và đặt các Skill tương ứng vào công đoạn tương ứng.

## 3. Thư mục làm việc cho mỗi video
Tạo thư mục độc lập `runs/<video_id>/`; KHÔNG ghi đè video khác. Mỗi bước lưu tệp thật, dùng UTF-8, LF; trạng thái chỉ được công bố sau khi file tồn tại và đã đọc lại.
- S1: `CURRENT_FINAL_TITLE.txt`, `TITLE_LOCK.json`, `TITLE_CANDIDATES.md`.
- S2: `FINAL_OUTLINE.md`, `OUTLINE_LOCK.json`.
- S3: `SCRIPT_A.txt`, `SCRIPT_B.txt`, `SCRIPT_C.txt` (nếu chia lượt), `FULL_SCRIPT.txt`, `SCRIPT_MANIFEST.json`.
- S4: `QA_INITIAL_REPORT.md`, `QA_FINDINGS.json`, `QA_FROZEN.json`.
- S5 (nếu cần): `REPLACEMENTS.json`, `FULL_SCRIPT_REVISED.txt`, `REPAIR_PROOF.json`.
- S4B: `QA_FINAL_REPORT.md`, `QA_FINAL.json`.
- S6: `SEO_PACKAGE.md`, `seo.txt`, `THUMBNAIL_A_PROMPT.txt`, `THUMBNAIL_B_PROMPT.txt`, `THUMBNAIL_C_PROMPT.txt`, `TRAILER_PROMPT.txt`.
- Tệp ledger toàn dự án: `TITLE_HISTORY_LEDGER.csv` (có header mẫu trong package); thêm mục ngay sau khi title được chốt để chặn chủ đề trùng ở các video sau.

## 4. Quy tắc viết và độ dài
Vì video mẫu có median ~105 phút, cấu hình mặc định là **LONG_95_110** (ước lượng 95–110 phút): 7 PART, **12.500–14.500 từ tiếng Tây Ban Nha được đọc**, giới hạn kiểm soát **75.000–100.000 ký tự body**. Thời lượng thực phụ thuộc tốc độ TTS; không gọi độ dài là 100 phút nếu chưa kiểm theo giọng đọc. S3 có thể viết 1 lần nếu hệ thống thật sự chứa được toàn bộ nội dung; mặc định chia A/B/C và ghép đúng byte, không coi đó là ba vòng sáng tác lại.

## 5. QA theo yêu cầu: MỘT LẦN SỬA
- Ưu tiên logic + chính tả/ngữ pháp. Kiểm tra tuổi, thời gian, danh tính, chứng cứ, tài sản, tiền tệ, động cơ và tên riêng.
- S4 tạo danh sách lỗi cần sửa, khóa `old_text` chính xác. S5 nhận toàn bộ danh sách lỗi hợp lệ, thực hiện **01 lượt duy nhất** và tạo chứng cứ diff. S4B kiểm định lại bản sửa một lượt.
- S4B nếu còn lỗi lớn: `BLOCKED_MANUAL_DECISION`. KHÔNG tự động quay lại S5 lần hai; không chạy vòng sửa vô hạn, không tự nâng điểm.
- Nếu S4 đạt READY không có lỗi phải sửa: bỏ qua S5, S4B chốt trực tiếp.
- Gọi `python scripts/workflow_tools.py --help` tại Writer/QA/SEO để xem công cụ kiểm đếm và kiểm chứng; Python chỉ chứng minh cấu trúc/hashes, không tự quyết chất lượng nội dung.

## 6. Những lỗi KHÔNG được lặp lại từ bản cũ
- Không nhập chồng ba bộ chủ đề Mafia/Homeless/Mexico; khóa `NICHE_ID=MEX_INFIDELIDAD_V1`.
- Không sửa một phần của `protected span`; công cụ kiểm tra **mọi khoảng byte giao nhau**.
- Không giả định Script được viết đủ dài khi mới có một đoạn.
- Không cho phép SEO sử dụng file khác với SHA đã QA xác nhận.
- Không tuyên bố đã render 3 thumbnail nếu chỉ có prompt.

## 7. Kiểm tra
Xem `TEST_REPORT.md` và `tests/test_workflow.py` trong ZIP tổng. Các công cụ được kiểm tra bằng văn bản giả lập cho tính toàn vẹn; cần QA biên tập bằng người/mô hình đọc thực tế khi sản xuất.

## V1.1 upgrades and portability
Keep installing 5 independent root-SKILL ZIPs as before; all filenames and stage signatures remain backward-compatible. New `workflow_tools.py` supports `audit-run --workdir <extracted run>` and `seo-gate ... --workdir <extracted run>` (strict recommended). Manifests now write relative stage paths when they are in the run folder; older absolute manifests are recovered from extracted A/B/C only if SHA matches. See `AUDIT_PRIMERA_EJECUCION.md` and `UPGRADE_CHANGELOG.md`. The project controller and source data are included in full package. The originally supplied run artifacts are **not rewritten**: one-repair has already been consumed.
