@echo off
echo ========================================
echo   Learning Management System - Complete Setup
echo ========================================
echo.
echo This script will:
echo 1. Automatically download and set up portable Node.js
echo 2. Verify setup completion
echo.
pause

cd /d "%~dp0"

echo.
echo [1/2] Setting up portable Node.js...
powershell -ExecutionPolicy Bypass -File "%~dp0setup-node.ps1"

if errorlevel 1 (
    echo.
    echo ERROR: Node.js setup failed
    pause
    exit /b 1
)

echo.
echo [2/2] Verifying setup...
if not exist "node\node.exe" (
    echo ERROR: node\node.exe not found
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup completed!
echo ========================================
echo.
echo Next steps:
echo 1. Double-click start.bat to start the server
echo 2. Open http://localhost:3005 in your browser
echo.
pause
