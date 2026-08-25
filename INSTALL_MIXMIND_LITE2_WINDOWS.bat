@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_mixmind_lite2_windows.ps1"
echo.
pause
