Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'Video|Batch|electron|ffmpeg' } | Select-Object ProcessId, Name, CommandLine | Format-List
