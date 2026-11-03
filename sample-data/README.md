# Sample data

- `voice/demo.mp3`: voice thử 10 giây.
- `srt/demo.srt`: ba caption tiếng Việt.
- `stock/stock01.mp4` đến `stock03.mp4`: ba stock 4 giây, không audio.
- `logo.png`: logo mẫu.
- `output/demo-render.mp4`: output đã được kiểm tra với 300 frame, 1280×720, 30 FPS, H.264 + AAC.

Chạy lại output mẫu:

```bash
node tools/render-sample.js
```

Công cụ sample dùng CPU libx264 để có thể kiểm tra trên máy không có NVIDIA. Ứng dụng Desktop sẽ tự ưu tiên NVENC khi phát hiện encoder.
