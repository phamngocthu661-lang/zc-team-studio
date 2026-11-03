# NGUYÊN TẮC BẮT BUỘC DÀNH CHO AGENT TẠI WORKSPACE VIDEO BATCH STUDIO

> ⚠️ **LUẬT SỐ 1 - SỬA CẢ ỨNG DỤNG CHO TOÀN CỤM FARM, TUYỆT ĐỐI KHÔNG SỬA RIÊNG TỪNG MÁY**:
> **"Khi 1 máy có lỗi thì chắc chắn các máy khác cũng sẽ có lỗi như vậy. Sửa thì sửa cả ứng dụng, đừng có sửa riêng từng máy. Mày sửa xong máy Phuong thì máy Chung lại lỗi đấy thì làm như nào! Lần sau sửa cái gì thì đọc cái này rồi hãy làm!"**

> ⚠️ **LUẬT SỐ 2 - TUYỆT ĐỐI TUÂN THỦ MỆNH LỆNH, KHÔNG TỰ Ý HÀNH ĐỘNG**:
> **"Từ giờ trở đi lưu vào bộ nhớ: Tao nói gì thì làm cái đấy, tao nhắc đến cái gì thì làm cái đấy. Đừng có tự ý làm những cái tao không nhắc đến hoặc không được lệnh làm. Tuyệt đối không được tự ý đổi công nghệ, không được tự ý thay thế công cụ mà tao đã chỉ định rõ ràng!"**

Mỗi khi agent tiếp nhận yêu cầu sửa lỗi hoặc nâng cấp:
1. **Làm đúng 100% yêu cầu**: Chỉ thực hiện đúng công nghệ và phạm vi người dùng giao lệnh (ví dụ: giao VoiceStudio thì phải làm đúng VoiceStudio, không được tự ý đổi sang công cụ khác).
2. **Sửa gốc mã nguồn (`src/`)**: Luôn sửa code trong `src/`, không tạo file patch cục bộ cho riêng máy nào.
3. **Bump version**: Luôn tăng phiên bản trong `package.json` (ví dụ: `3.0.17` -> `3.0.18`).
4. **Đóng gói toàn diện**: Tạo gói `worker_app_vX.Y.Z.asar`, cập nhật vào `dist-worker/resources/app.asar` và `dist-server/resources/app.asar`, tạo `Cap-Nhat-Worker-X.Y.Z.bat`.
5. **Không tự ý phát lệnh OTA cho các máy con**: Đóng gói sẵn file `.asar` cập nhật cho ứng dụng và lưu vào thư mục `Updates/` trên Drive nếu cần. **TUYỆT ĐỐI KHÔNG TỰ Ý PHÁT CHỈ THỊ OTA (UPDATE_*.json) CHO CÁC MÁY CON** khi chưa có lệnh. Việc gửi lệnh cập nhật cho các máy con hoàn toàn do người dùng tự bấm trên giao diện hoặc trực tiếp ra lệnh riêng.
6. **Khởi động lại khi hoàn tất**: Nếu máy hiện tại đang chạy bản cũ hoặc có yêu cầu restart, tắt tiến trình cũ và mở lại bản mới.
7. **Cập nhật tài liệu**: Luôn cập nhật tiến độ vào `DOCSMOI/PHASE_ROADMAP_REMOTE_RENDER_FARM.md`.
8. **Giao tiếp**: Luôn trao đổi bằng tiếng Việt và gợi ý agent tiếp theo.
