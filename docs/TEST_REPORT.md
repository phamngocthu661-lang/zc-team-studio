# Test Report 1.7.0

## Static and automated checks

- JavaScript source syntax check: **50 files passed**.
- Automated tests: **34/34 passed**.
- `validateRenderConfig` regression test: passed.
- Modal `[hidden]` regression test: passed.
- Single-stock duration planner: passed.
- Single-stock no-transition render graph: passed.
- Short stock rejection and small end-frame padding: passed.
- NVIDIA GPU CSV detection: passed.
- AUTO_STABLE NVENC selection: passed.
- GTX 1060 automatic Pascal compatibility profile P2: passed.
- Encoder test isolation per encoder/GPU: implemented.
- CUDA/NVENC error classification and fallback plans: passed.
- Cancelled FFmpeg process returns `ABORTED`: passed.

## End-to-end smoke tests

- Pre-cut single-stock pipeline: passed.
- Existing stock-library pipeline: passed.
- Image-sequence pipeline: passed.
- Greenscreen/overlay pipeline: passed.
- Existing one-video workflow: passed.

The validation environment has no NVIDIA hardware. Real NVENC utilization and Windows driver compatibility must be verified on the target GTX 1060 machine.
