# CHI TIẾT NÂNG CẤP V1.1 (VI)

## Lý do nâng
Từ `MX_CUARTO_FULL_STEPS-03 test 1.zip`: 7/7 Part, 75.787 ký tự, SHA đúng, đúng 1 lượt sửa, 98/100 nhưng phát hiện 2 lỗi P1: thứ tự tối thứ Năm → chiều thứ Năm không có hồi tưởng; nhân vật Teresa nghe thú nhận ngày 10/09 nhưng sự kiện 11/09 diễn đạt như phát hiện mới. Đúng kỹ thuật nhưng chưa sẵn sàng xuất bản.

## Thay đổi
- Skill 01 Title: preflight tính khả thi của payoff, giữ nguyên mục tiêu <=100 ký tự.
- Skill 02 Outline: Scene Contracts thời gian theo ngày + buổi, fact-first-known, change of state, cảnh thực chứ không kéo dài giải thích.
- Skill 03 Writer: state ledger xuyên A/B/C; quan sát cận cảnh trước/sau một patch; proof ghi byte-offset bản mới; không cho sửa thêm lần hai.
- Skill 04 QA: bắt buộc bản `QA_EDITORIAL_EVIDENCE.json` với 21+ cảnh thực, một kiểm tra context cho MỖI patch; tự động phát hiện mâu thuẫn *trong bảng bằng chứng được QA khai báo*, chặn score-only READY.
- Skill 05 SEO: chặn schema READY cũ; bắt buộc evidence SHA; tạo TTS sạch không có nhãn Part; kiểm tra thumbnail nhỏ trên điện thoại.
- Controller: TECH_PASS khác EDITORIAL_PASS, 5 Skills/6 STEP/3 giai đoạn Writer không thay đổi.

## Triển khai
1) Sao lưu V1 hiện có; 2) Cài cùng lúc đủ 5 ZIP V1.1 (bên trong vẫn tên thư mục `_V1` để tương thích); 3) thay text controller và project instructions; 4) chạy regression; 5) video đã có kết quả cũ không thể tự được nâng trạng thái QA. **Không cấp thêm lượt sửa cho bản kịch bản cũ đã sửa 1 lần.**

## Giới hạn trung thực
Python kiểm chứng hash/offset và tính nhất quán trên JSON bằng chứng, nhưng không đọc hiểu văn học tự động. Người/AI kiểm định vẫn phải khai báo đúng chứng cứ từ file, không được tự đặt các bảng giả. 32 thử nghiệm kiểm tra kỹ thuật trên văn bản nhân tạo không chứng minh chất lượng của câu chuyện thật.
