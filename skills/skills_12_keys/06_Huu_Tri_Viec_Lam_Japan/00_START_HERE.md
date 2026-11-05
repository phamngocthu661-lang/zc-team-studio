# JAPAN SENIOR RETIREMENT × WORK KUCHIKOMI SKILLS V1.1

**Nội dung mới:** hưu trí, làm việc sau tuổi 60, lương hưu, nhà ở, chi tiêu và tâm sự tuổi già ở Nhật — hình thức `口コミ30選` của người lớn tuổi.

**Giữ đúng cấu trúc hệ thống cũ:** 05 SKILL, 06 bước điều phối; Title → Outline → Script A/B/C → QA → tối đa 01 Repair → SEO. File bàn giao UTF-8, khóa tiêu đề/giàn ý, SHA-256, QA độc lập và chặn SEO sai bản.

## Cài đặt
Đưa 5 thư mục Skill có tên đúng theo `name` trong SKILL.md (mỗi thư mục có `SKILL.md`, `references`, `scripts`) vào thư mục Skills hiện có. Mỗi ZIP riêng có thư mục Skill ở cấp gốc. Đối với bộ all-in-one, đọc `JAPAN_STEP_CONTROLLER_V1.md` và `SHARED_CROSS_SKILL_CONTRACT.md`. Chạy `python scripts/pipeline_guard.py --help` và `python -m unittest discover -s tests -v` để kiểm tra.

## Dữ liệu tham chiếu
RAR nguồn: `06_Huu_Tri_Viec_Lam_Japan.rar`: 1 channel `@izumi_kuchikomi`, 54 video metadata, 54 thumbnail JPG, 1 representative MP4 (~37m51s), không có subtitle/transcript được nộp. Nguồn dữ liệu gốc không đóng vào bộ Skills để giảm dung lượng và tránh lẫn original/reference với sản phẩm mới.

## Khác biệt với Homeless/Mafia
- Không dựng một twist phi logic liên thông 30 nhân vật; đây là 30 hồi ức/vignette độc lập, tạo kịch tính qua **lựa chọn và hệ quả cụ thể**.
- 7 Part chỉ là 7 **chương đóng gói** cho hệ thống cũ; chia 30 review theo phân phối 4/4/4/4/4/5/5.
- Dự kiến 10.500–13.500 ký tự Nhật đọc thật, 30–40 phút tùy nhịp đọc; không áp 70–80k của Homeless.
- QA có **một vòng chỉnh sửa tối đa**, ưu tiên logic, chữ, lỗi sai sự thật; không sửa văn phong hàng loạt để làm đẹp điểm.

## Mọi claim về RPM, CTR hay vượt đối thủ
Không được hứa CTR/retention hay view tuyệt đối; test sau xuất bản mới xác định. Phân loại video theo số lượt xem là dữ liệu snapshot chưa chuẩn hóa theo ngày đăng/nguồn traffic.

## V1.1 changes / one-repair compatible
This is a **drop-in replacement** with the same five skill directory names, the same six-step workflow, the same artifact filenames and the same `ONE_REPAIR` behavior. Only the version markers and additional gates/diagnostics change. Existing V1.0 episode outputs can be evaluated against the V1.1 QA rules; **do not rerun STEP5 on an already repaired episode**.

Main additions: original 30-story fingerprint/ending-diversity matrix, stronger first-15-second hook, storyboard evidence for QA, `review_id` patch enforcement, fixed SEO length bypass, mobile thumbnail visual gates. Run `python scripts/pipeline_guard.py editorial-diagnostics --script FULL_SCRIPT_REVISED.txt --output EDITORIAL_DIAGNOSTICS.json` on existing output and read warnings critically. Please see `FIRST_RUN_AUDIT_IDEA_3.md` for observed reasons and limitations.
