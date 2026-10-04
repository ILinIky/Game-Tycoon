@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\server.ps1" -Action Start
if errorlevel 1 (
  echo.
  echo Der Spielserver konnte nicht gestartet werden.
  pause
  exit /b 1
)
endlocal
