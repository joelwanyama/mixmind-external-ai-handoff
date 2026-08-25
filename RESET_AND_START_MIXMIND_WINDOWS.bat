@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo.
echo Closing any old MixMind server using port 8765...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8765" ^| findstr "LISTENING"') do (
  echo Closing old server process %%P
  taskkill /PID %%P /F >nul 2>nul
)
timeout /t 1 /nobreak >nul
echo.
echo Starting MixMind from this folder:
echo %CD%
echo.
call "%~dp0START_MIXMIND_WINDOWS.bat"
