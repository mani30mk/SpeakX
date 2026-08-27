@echo off
setlocal
cd /d "%~dp0"

echo Creating Desktop Shortcut for SpeakX...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1"

echo.
pause
