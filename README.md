# Video Batch Studio Desktop Offline v1.7

Bản v1.7 tập trung vào workflow nhanh nhất: **1 voice + 1 SRT + 1 stock đã cắt sẵn** và GPU NVIDIA tự động.

## Workflow nhanh
1. Mở **Một video**.
2. Chọn Voice và SRT.
3. Chọn Background **1 stock đã cắt sẵn — nhanh**.
4. Chọn file stock bằng hoặc dài hơn voice.
5. Để Codec = **Tự động** và Tăng tốc = **Tự động — GPU NVENC, tự fallback CPU**.
6. Nhấn Kiểm tra rồi Render.

Ở mode này app không quét kho stock, không nối nhiều clip và không tạo Cross Dissolve giữa các clip nền. Subtitle/layer vẫn được render theo template.

## GPU Auto
- Tự phát hiện NVIDIA bằng `nvidia-smi`.
- Tự phát hiện `h264_nvenc` trong FFmpeg.
- Luôn thử NVENC trước nếu có GPU NVIDIA.
- GTX 1060/GTX 10xx tự dùng cấu hình NVENC tương thích P2.
- Nếu NVENC lỗi tạm thời, app dọn process FFmpeg, retry và chỉ sau đó mới fallback CPU.
- Full CUDA không được bật tự động vì subtitle/libass và nhiều layer vẫn là filter CPU.

## Chạy
```powershell
npm install
npm run check
npm test
npm start
```

## Kiểm tra GPU
```powershell
npm run gpu:check
```

## Smoke test chế độ stock cắt sẵn
```powershell
npm run smoke:single-stock
```

Xem `docs/CHANGELOG_1.7.md` và `docs/GPU_AUTO_GUIDE.md`.
