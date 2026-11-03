# Changelog 1.3.0 — Single Video Mode

## Added

- Dedicated **Một video** page next to Batch mode.
- Direct selection of one MP3/WAV voice file and one SRT subtitle file.
- Direct output to the selected folder, using the voice filename for the MP4 output.
- Single-video preflight, progress bar, log, cancellation and report history.
- Single-video support for stock video, image sequence and manual media backgrounds.
- Single-video support for templates, transitions, H.264/H.265 NVENC, FPS, resolution and GB/hour size limits.
- `buildInputJobs()` abstraction so the same safe render pipeline supports both direct files and folder batches.
- Single-video unit tests and an end-to-end FFmpeg smoke test.

## Data safety

- Stock is reserved in SQLite before rendering.
- Stock is released when rendering fails or is cancelled.
- Stock is moved to the selected `Used` folder only after output verification succeeds.
- Single-video renders are retained in history as one-job render sessions, enabling reports and recovery.

## Output behavior

For a selected voice file:

```text
D:\Voice\chapter_01.mp3
```

the output is written directly as:

```text
<selected output folder>\chapter_01.mp4
```

Reports and logs are stored in `Reports` and `Logs` subfolders of the selected output folder.
