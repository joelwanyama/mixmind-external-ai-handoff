@echo off
setlocal
cd /d "%~dp0"
echo.
echo Starting MixMind local test server...
echo.
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  start "MixMind Server" /b py -3 mixmind_local_server.py
) else (
  where python >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    start "MixMind Server" /b python mixmind_local_server.py
  ) else (
    echo Python was not found on this PC.
    echo Install Python from https://www.python.org/downloads/ then run this file again.
    pause
    exit /b 1
  )
)
timeout /t 2 /nobreak >nul
start "" "microsoft-edge:http://localhost:8765/"
echo MixMind should now open in Edge.
echo Keep this window open while using MixMind. Press Ctrl+C to stop the server.
cmd /k
