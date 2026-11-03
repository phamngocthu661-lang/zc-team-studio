@echo off
chcp 65001 >nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir="D:\ZC_TEAM\TOOL_ZC_TEAM\BROWSER_PROFILE" --no-first-run --no-default-browser-check --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --new-window "https://chatgpt.com/"
