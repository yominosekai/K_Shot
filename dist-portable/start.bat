@echo off
chcp 65001 >nul 2>&1
title Knowledge Management Tool (K_Shot) - Server Startup
cd /d "%~dp0" >nul 2>&1

if not exist "node\node.exe" (
    echo.
    echo ERROR: node.exe was not found.
    echo Expected path: %CD%\node\node.exe
    echo.
    echo Please place the portable Node.js files into the "node" folder:
    echo 1. Download Node.js from https://nodejs.org/
    echo 2. Extract the ZIP archive
    echo 3. Copy the extracted files into "%~dp0node"
    echo.
    pause
    exit /b 1
)

set "PATH=%~dp0node;%PATH%" >nul 2>&1
cd app >nul 2>&1

if "%PORT%"=="" set PORT=3005

echo.
echo ========================================
echo   Knowledge Management Tool (K_Shot)
echo   Portable Server Startup
echo ========================================
echo   Port : %PORT%
echo   URL  : http://localhost:%PORT%
echo   Stop : Ctrl+C
echo ========================================
echo.

node_modules\.bin\next.cmd start --port %PORT% --hostname localhost

pause