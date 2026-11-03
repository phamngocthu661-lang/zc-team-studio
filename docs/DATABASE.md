# Database local

SQLite lưu project, template/version/layer, media library, asset, batch/job, stock reservation/usage, render plan/attempt, report, audit và license cache.

## License cache

`license_cache` lưu:

- hash của key;
- device ID;
- plan;
- trạng thái;
- ngày hết hạn;
- entitlements;
- token được Electron safeStorage mã hóa khi khả dụng.

`app_settings.license_last_trusted_time` hỗ trợ phát hiện lùi đồng hồ cơ bản.

Không có database server hoặc dữ liệu license từ xa.
