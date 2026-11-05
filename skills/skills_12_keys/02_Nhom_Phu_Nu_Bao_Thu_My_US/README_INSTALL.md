# CÀI ĐẶT WOMEN REVENGE US — V1.1 (upgrade compatible)

1. **Sao lưu** 5 ZIP V1.0 và các dự án/kịch bản đã chạy trước đây. Không ghi đè vào thư mục dự án cũ.
2. Dùng **chính xác năm ZIP V1.1** trong `INSTALL_ZIPS/`. Gỡ/disable bản Skill V1.0 đang active trước khi cài V1.1; giữ nguyên *slug Skill* (không cài song song 2 version cùng slug).
3. Thay nội dung Project Instructions bằng `WRV_US_PROJECT_INSTRUCTIONS_COPY_PASTE.md`. Controller `WRV_US_STEP_CONTROLLER_V1.md` có tên giữ nguyên để không phá link; nội dung đã cập nhật.
4. Gọi `step1` → `step2` (thêm `STORY_PREFLIGHT_V11.json` + script kiểm thử ngay trong Skill Outline) → `step3` A/B/C → `step4` → `step5` tối đa 1 lượt khi cần → `step4` final → `step6`.
5. Công cụ Python 3.10+, không cần cài thư viện ngoài. Chạy `python tests/test_wrv_tools.py`, `python tests/test_complete_qa_fixture.py`, `python tests/test_story_preflight_v11.py` từ thư mục bundle (có `tests/`).
6. Không bao giờ dùng Step5 lần hai trên cùng `video_id`, dù đổi bản Skill. `READY` QA không phải bằng chứng CTR/retention cao.

**Các file Script Python của V1.0 được giữ nguyên để bảo toàn schema và CLI.** Script mới V1.1 chỉ bổ sung kiểm tra ở STEP2.
