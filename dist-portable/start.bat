@echo off
echo off
chcp 65001 >nul 2>&1
title Knowledge Management Tool (K_Shot) - Server Start
cd /d "%~dp0" >nul 2>&1

if not exist "node\node.exe" (
    echo.
    echo ERROR: node.exe not found
    echo     Looking for: %CD%\node\node.exe
    echo.
    echo Please set up portable Node.js using the following steps:
    echo 1. Download Node.js from https://nodejs.org/
    echo 2. Extract using 7-Zip or similar
    echo 3. Copy files from extracted folder to "node" folder in this directory
    echo.
    pause
    exit /b 1
)

set "PATH=%~dp0node;%PATH%" >nul 2>&1
cd app >nul 2>&1

if "%PORT%"=="" set PORT=3005

REM Set default log level to ERROR (user can override)
if "%LOG_LEVEL%"=="" set LOG_LEVEL=ERROR

echo.
echo ========================================
echo   Knowledge Management Tool (K_Shot) - Server Start
echo ========================================
echo   Port: %PORT%
echo   URL: http://localhost:%PORT%
echo   Stop: Ctrl+C
echo ========================================
echo.

node_modules\.bin\next.cmd start --port %PORT% --hostname localhost

pause