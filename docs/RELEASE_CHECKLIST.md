# Release Checklist

- [ ] Tạo key pair production mới.
- [ ] Private key chỉ tồn tại ở máy quản trị có backup mã hóa.
- [ ] Public key production đã copy vào resources/license.
- [ ] Không đóng `admin-tools` hoặc private key vào installer khách hàng.
- [ ] FFmpeg/ffprobe có trong resources/bin và giấy phép đã được rà soát.
- [ ] `npm run check` thành công.
- [ ] `npm test` thành công.
- [ ] Smoke test stock, image và layers thành công.
- [ ] Installer được build và ký số trên Windows.
- [ ] Kích hoạt key đúng máy thành công.
- [ ] Key sai máy, hết hạn và bị sửa đều bị từ chối.
- [ ] Cài bản mới không xóa project/database/license hợp lệ.
