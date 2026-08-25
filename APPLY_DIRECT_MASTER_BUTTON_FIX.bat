@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0APPLY_DIRECT_MASTER_BUTTON_FIX.ps1"
echo.
pause
