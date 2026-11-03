@echo off
chcp 65001 >nul
title PHIEN BAN 2 - CHATGPT WEB MULTI-TAB STUDIO (PORT 8098)
cd /d "%~dp0"
echo ============================================================================
echo   KHOI DONG PHIEN BAN 2: CHATGPT WEB MULTI-TAB STUDIO (PORT 8098)
echo   - Tu dong mo Chrome voi Profile luu vinh vien: D:\MAFIA_STUDIO_WEB\BROWSER_PROFILE
echo   - Giao dien dieu khien: http://127.0.0.1:8098
echo ============================================================================
start "" "http://127.0.0.1:8098"
python "%~dp0mafia_dashboard_server.py"
pause
