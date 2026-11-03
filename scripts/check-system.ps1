$ErrorActionPreference = "Continue"
Write-Host "Node:"; node --version
Write-Host "npm:"; npm --version
Write-Host "FFmpeg:"; ffmpeg -hide_banner -version | Select-Object -First 1
Write-Host "ffprobe:"; ffprobe -hide_banner -version | Select-Object -First 1
Write-Host "NVENC encoders:"; ffmpeg -hide_banner -encoders 2>&1 | Select-String "nvenc"
Write-Host "CUDA hwaccel:"; ffmpeg -hide_banner -hwaccels 2>&1 | Select-String "cuda"
Write-Host "CUDA filters:"; ffmpeg -hide_banner -filters 2>&1 | Select-String "scale_cuda|chromakey_cuda|overlay_cuda"
Write-Host "NVIDIA:"; nvidia-smi
Write-Host "Application GPU runtime test:"; node tools\check-gpu.js 0
