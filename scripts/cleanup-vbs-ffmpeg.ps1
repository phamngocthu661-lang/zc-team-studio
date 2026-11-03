$ErrorActionPreference = 'SilentlyContinue'
$root = Join-Path $env:APPDATA 'Video Batch Studio\data\temp'
$items = Get-CimInstance Win32_Process -Filter "Name='ffmpeg.exe'"
$killed = 0
foreach ($item in $items) {
  if ($item.CommandLine -and $item.CommandLine.IndexOf($root, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
    Stop-Process -Id $item.ProcessId -Force
    $killed++
  }
}
Write-Host "Đã dừng $killed tiến trình FFmpeg của Video Batch Studio."
