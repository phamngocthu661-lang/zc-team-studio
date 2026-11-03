# Kiến trúc Desktop Offline

```text
Electron UI
  ├── Project / Template / Media / Batch screens
  ├── Offline activation gate
  └── IPC bridge
        ├── SQLite local database
        ├── FFmpeg render workers
        ├── Stock reservation and recovery
        └── Offline LicenseClient
              ├── Embedded Ed25519 public key
              ├── Device fingerprint
              ├── Expiry and entitlement validation
              └── Local encrypted/signed cache
```

Ứng dụng không gọi license API và không cần dịch vụ nền. Private key chỉ nằm ở máy quản trị dùng để tạo key cho khách hàng.

## Activation

1. App tính device ID từ Windows MachineGuid.
2. App hiển thị mã máy dạng nhóm ký tự.
3. Admin tạo payload gồm product, device ID, plan, ngày phát hành, ngày hết hạn và quyền sử dụng.
4. Payload được ký bằng Ed25519 private key.
5. App xác minh bằng public key được đóng cùng installer.
6. License hợp lệ được lưu cục bộ và kiểm tra lại mỗi lần mở app/bắt đầu batch.
