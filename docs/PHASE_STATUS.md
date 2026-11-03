# Phase implementation status — Offline Edition

## Phase 0 — Analysis, architecture and data design

Implemented: local SQLite schema, service boundaries, desktop screens, render data model and documentation. Không có server schema/runtime trong edition này.

## Phase 1 — Render Core

Implemented and smoke tested: voice, SRT, stock stitching, mute stock, fixed resolution/FPS, logo/text layers, H.264/H.265 NVENC selection, CPU fallback and output verification.

## Phase 2 — Stock Safety

Implemented and tested: media scanner, asset states, transactional reservation, no concurrent reuse, release after failure, commit/move to Used after success, usage history and restart reconciliation.

## Phase 3 — Image Sequence and Transitions

Implemented and smoke tested: configurable five-second image slots, looping, seeded scale/crop/pan/rotation/flip variations, weighted gentle transitions and repeat avoidance.

## Phase 4 — Visual Template Editor

Implemented: project/template screens, preview canvas, stable direct drag, four-corner resize, Shift aspect lock, automatic image/video source-frame preview, layer properties, text/media/green/overlay layers, subtitle/canvas/transition settings, Cross Dissolve, import/export and version restore.

Advanced masks, keyframe curves and full GPU real-time playback remain future improvements.

## Phase 5 — Batch Production & Intro Concat

Implemented: name matching, preflight, template assignment, stock/image/manual modes, Disclaimer intro, Job intro videos after Disclaimer (single clip / per-voice folder), queue state, logging, reports, pause, cancel and resume.

## Phase 6 — Long-video stability

Implemented: FFmpeg child process isolation, progress parsing, temporary output, validation, bitrate retry, recovery states and cache directories.

A real 1–4 hour acceptance run is still required on target Windows/NVIDIA hardware before commercial release.

## Phase 7 — Windows packaging

Implemented in source: Electron Builder NSIS configuration, resource packaging, user-data persistence and release scripts.

The current environment could not produce the `.exe` because Electron Builder could not download the Windows Electron binary from GitHub. Build on a connected Windows machine with `npm run dist:win`.

## Phase 8 — Offline commercial licensing

Implemented and tested:

- Activation gate inside desktop app.
- Ed25519 signed keys.
- Key bound to machine code.
- Monthly/custom expiry.
- Local verification without network.
- Local cache using Electron safeStorage when available.
- Basic clock rollback detection.
- Admin key-pair and license-generation tools.

No license server, update server, payment webhook or background service is required.

## Phase 9 — Story Video Pipeline (Reels / Hoạt hình / Truyện kể)

Implemented and tested:
- Tab giao diện mới "Tạo Video Ảnh" (Story Video) độc lập.
- 3 chế độ dựng video từ ảnh:
  1. Cố định thời gian mỗi ảnh (chọn số giây) + hiệu ứng chuyển cảnh + tự động lặp zoom/lật khi hết ảnh.
  2. Giàn đều ảnh hết video theo tổng thời lượng voice + chuyển cảnh.
  3. Cắt ảnh theo từng câu subtitle SRT + chuyển cảnh + lặp lại khi thiếu ảnh.
- Quản lý danh sách hàng đầu vào (Voice, SRT, Thư mục ảnh): thêm dòng lẻ, quét hàng loạt từ folder cha, xóa dòng.
- Render đồng thời đa luồng (workers), tích hợp kế thừa Project & Template, hỗ trợ dừng/hủy an toàn.
- Toàn bộ 169 unit tests pass 100%.

