# Build Report 1.7.0

This source package contains the Electron desktop app, SQLite data layer, FFmpeg render engine, offline license system, template editor, batch workflow and the new pre-cut single-stock fast workflow.

## Important release behavior

- GPU scanning is started in the background after the application window opens.
- Auto mode prefers H.264 NVENC whenever NVIDIA hardware and an NVENC-enabled FFmpeg build are detected.
- A transient encoder probe failure does not permanently disable GPU rendering.
- GTX 10xx cards use the conservative P2 compatibility command automatically.
- CPU fallback is enabled after cleanup and NVENC retry.

## Windows installer

Run on Windows:

```powershell
npm install
npm run check
npm test
npm run dist:win
```

The installer is generated under `release\`.
