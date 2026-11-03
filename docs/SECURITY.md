# Security

- App chỉ chứa Ed25519 public key.
- Private key production không được commit, copy vào `resources`, installer hoặc gửi khách hàng.
- License key gắn với Windows MachineGuid đã băm SHA-256.
- Key có `notBefore`, `expiresAt`, plan và entitlements.
- Chữ ký được xác minh trước khi lưu và mỗi khi sử dụng.
- Batch engine kiểm tra license trước khi bắt đầu và giữa các job.
- Cache license dùng Electron safeStorage khi khả dụng.
- Cơ chế clock rollback chỉ là bảo vệ cơ bản; ứng dụng offline không thể chống chỉnh sửa binary tuyệt đối.
- Ký số installer và obfuscation có thể tăng chi phí reverse engineering nhưng không thay thế chữ ký license.
