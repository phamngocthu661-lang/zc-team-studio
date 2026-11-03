# HƯỚNG DẪN CÀI TRÊN WINDOWS / CODEX CLI

Bộ này không dùng thư viện Python bên ngoài, chỉ cần Python 3.9+ (khuyến nghị 3.11+). 

## Cách 1 — cài từng SKILL ZIP
Giải nén mỗi ZIP vào folder Skills đang được hệ thống quản lý. Khi giải nén phải được dạng `.../skills/viet-lai-tieu-de-japan-kuchikomi/SKILL.md`, `.../skills/viet-gian-y-japan-kuchikomi/SKILL.md`, v.v. **Đừng thêm 2 lớp folder trùng tên.** Tên thư mục cuối trùng `name:` trong SKILL.md.

## Cách 2 — cài ALL-IN-ONE ZIP
Giải nén để có `JAPAN_KUCHIKOMI_SKILLS_V1.0/`. Đặt 5 folder Skill con vào registry/workspace Skills. Giữ `JAPAN_STEP_CONTROLLER_V1.md` và `SHARED_CROSS_SKILL_CONTRACT.md` trong project instructions hoặc file mà agent đọc được.

## Kiểm tra
Mở CMD / PowerShell tại folder ALL-IN-ONE và chạy:
```
py -3 -m unittest discover -s tests -v
py -3 scripts/pipeline_guard.py --help
```
`CHECK_SKILLS_WINDOWS.bat` có sẵn cho Windows. Test là kiểm thử code/artifact, **không phải** đánh giá rằng mỗi script video có retention cao.

## Sử dụng
Trong chat hoặc Codex, nhập `step1`, `step2`, `step3`, `step4`, `step5`, `step4-post`, `step6` theo controller. Tạo mới `OUTPUT/<video_id>/`, không ghi đè file SHA đã khóa. Chỉ chạy `step5` nếu QA yêu cầu và **một lần duy nhất**.

## Lưu ý dữ liệu video mẫu
Không cần chép video đại diện 77 MB hoặc thumbnails nguồn vào SKILL; tất cả phân tích title, độ dài, chủ đề, thumbnail đã tóm tắt ở `ANALYSIS_KENH_MAU.md`. Khi cần nghiên cứu tiếp từ video gốc, dùng file RAR nguồn để mở, không suy diễn lời thoại từ metadata.

## Nâng cấp V1.0 → V1.1 (giữ nguyên tên thư mục)
1. Sao lưu 5 thư mục Skills V1.0 và các bản chạy đã hoàn tất.
2. Giải nén 5 Skills V1.1 **đè theo tên folder** (`viet-lai-tieu-de-japan-kuchikomi`, `viet-gian-y-japan-kuchikomi`, `viet-kich-ban-japan-kuchikomi`, `kiem-tra-kich-ban-japan-kuchikomi`, `viet-seo-japan-kuchikomi`), không đổi tên folder / lệnh step1..step6.
3. Test `python -m unittest discover -s tests -v` từ thư mục tổng. Với từng Skill zip, file `scripts/pipeline_guard.py` đã được đồng bộ.
4. Chạy thử từ ý tưởng mới để QA kiểm tra đủ 30 truyện, ký tự, ending variety. **Không gọi lại STEP5** cho video đã sửa V1.0.
5. Tùy chọn: `python scripts/pipeline_guard.py editorial-diagnostics --script PATH_TO/FULL_SCRIPT_REVISED.txt --output PATH_TO/EDITORIAL_DIAGNOSTICS.json` kiểm tra tập cũ; warnings cần người biên tập đọc.
