@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0BACKUP_MIXMIND_BEFORE_UPDATE.ps1"
pause
