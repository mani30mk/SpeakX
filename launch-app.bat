@echo off
title SpeakX AI Assistant
setlocal enabledelayedexpansion

echo ===================================================
echo             SpeakX AI Practice App
echo ===================================================
echo.

cd /d "%~dp0"

REM Check if .env exists
if not exist ".env" (
    if exist ".env.example" (
        echo [!] .env file not found. Creating from .env.example...
        copy .env.example .env >nul
        echo [!] Created .env file. Make sure to add your GEMINI_API_KEYS inside .env if not done yet.
        echo.
    )
)

REM Check if dependencies installed
if not exist "node_modules" (
    echo [*] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [X] Failed to install dependencies.
        pause
        exit /b 1
    )
)

echo [*] Starting SpeakX Server...
echo [*] Opening SpeakX in your browser (http://localhost:3000)...
echo.

REM Wait 2 seconds and open browser
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

REM Run server
node server.js

if %errorlevel% neq 0 (
    echo.
    echo Server stopped unexpectedly.
    pause
)
