# Triển khai Windows không server

1. Tạo key pair production bằng `node admin-tools/generate-keypair.js <thư-mục-an-toàn>`.
2. Lưu private key ngoài repository và ngoài máy khách hàng.
3. Copy public key production vào `resources/license/offline-public-key.pem`.
4. Đặt FFmpeg binaries được cấp phép phù hợp vào `resources/bin`.
5. Chạy `npm install`, `npm run check`, `npm test`.
6. Build bằng `npm run dist:win` trên Windows.
7. Ký số installer và thử cài trên Windows 10/11 sạch.
8. Gửi installer cho khách hàng.
9. Khách hàng gửi Mã máy; tạo key theo tháng bằng admin tool.
10. Cập nhật phần mềm bằng installer mới; không cần update server.
