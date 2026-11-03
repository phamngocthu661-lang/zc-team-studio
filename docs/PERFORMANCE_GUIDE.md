# Performance Guide 1.6

## GTX 1060 6GB

Recommended:

- Codec: Auto / H.264 NVENC.
- Acceleration: AUTO_STABLE.
- GPU: Auto scan.
- Profile: MAX_SPEED P1.
- 1 worker.
- 1080p30.

AUTO_STABLE keeps subtitle, Cross Dissolve and layer composition on CPU, then sends completed frames to NVENC. This avoids opening many NVDEC contexts for a long stock timeline.

## When to use Full CUDA

Only test FULL_CUDA when:

- There are one or two source videos.
- No SRT burn-in or only simple filters.
- No xfade chain with many inputs.
- All source codecs and pixel formats are supported by NVDEC.

If Full CUDA fails, the app automatically rebuilds the command as NVENC-only.

## Measuring performance

Use the render `speed` value:

- 1.0x: one hour takes about one hour.
- 2.0x: one hour takes about 30 minutes.
- 4.0x: one hour takes about 15 minutes.

Task Manager 3D usage is not an NVENC measurement. Show Video Encode and Video Decode graphs.
