@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\server.ps1" -Action Stop
if errorlevel 1 (
  echo.
  echo Der Spielserver konnte nicht beendet werden.
  pause
  exit /b 1
)
endlocal
