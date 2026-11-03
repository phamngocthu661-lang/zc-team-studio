@echo off
chcp 65001 >nul
title Video Batch Studio - Khoi Dong Truc Tiep
cd /d "%~dp0"

if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" "."
) else (
    call npx electron .
)
exit
