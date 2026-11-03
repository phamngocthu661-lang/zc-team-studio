@echo off
chcp 65001 >nul
title ZC TEAM - Day Ban Cap Nhat Len GitHub (OTA Update)
cd /d "%~dp0"
echo ============================================================================
echo   🚀 CONG CU DAY BAN CAP NHAT ZC TEAM LEN GITHUB (OTA UPDATE)
echo ============================================================================
echo.
python push_update_github.py
echo.
pause
