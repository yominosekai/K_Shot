@echo off
echo ========================================
echo   Create Portable Distribution Package
echo ========================================
echo.

cd /d "%~dp0\.."

REM Check if build is complete
if not exist ".next" (
    echo ERROR: .next folder not found
    echo Please run 'npm run build' first
    pause
    exit /b 1
)

REM Get current Node.js version from system
for /f "tokens=*" %%v in ('node --version') do set CURRENT_NODE_VERSION=%%v
set CURRENT_NODE_VERSION=%CURRENT_NODE_VERSION:v=%
echo Detected Node.js version: %CURRENT_NODE_VERSION%
echo.

REM Distribution folder
set DIST_FOLDER=dist-portable
set APP_FOLDER=%DIST_FOLDER%\app

REM Remove existing app folder
if exist "%APP_FOLDER%" (
    echo Removing existing app folder...
    rmdir /s /q "%APP_FOLDER%"
)

REM Create folder
mkdir "%APP_FOLDER%" 2>nul

echo Folder structure created
echo.
echo Copying files...

REM Copy files and folders using PowerShell for better reliability
powershell -ExecutionPolicy Bypass -Command "& { Copy-Item -Path '.next' -Destination '%APP_FOLDER%\.next' -Recurse -Force -ErrorAction SilentlyContinue }"
powershell -ExecutionPolicy Bypass -Command "& { Copy-Item -Path 'node_modules' -Destination '%APP_FOLDER%\node_modules' -Recurse -Force -ErrorAction SilentlyContinue }"
powershell -ExecutionPolicy Bypass -Command "& { Copy-Item -Path 'src' -Destination '%APP_FOLDER%\src' -Recurse -Force -ErrorAction SilentlyContinue }"
powershell -ExecutionPolicy Bypass -Command "& { Copy-Item -Path 'public' -Destination '%APP_FOLDER%\public' -Recurse -Force -ErrorAction SilentlyContinue }"

copy /Y "package.json" "%APP_FOLDER%\" >nul
copy /Y "package-lock.json" "%APP_FOLDER%\" >nul 2>nul
copy /Y "next.config.ts" "%APP_FOLDER%\" >nul
copy /Y "tsconfig.json" "%APP_FOLDER%\" >nul
copy /Y "postcss.config.mjs" "%APP_FOLDER%\" >nul
copy /Y "tailwind.config.ts" "%APP_FOLDER%\" >nul
copy /Y "next-env.d.ts" "%APP_FOLDER%\" >nul

echo File copy completed
echo.

REM Download and include Node.js (same version as current system)
set NODE_FOLDER=%DIST_FOLDER%\node
if exist "%NODE_FOLDER%" (
    echo Removing existing node folder...
    rmdir /s /q "%NODE_FOLDER%"
)
mkdir "%NODE_FOLDER%" 2>nul

echo.
echo Downloading portable Node.js v%CURRENT_NODE_VERSION%...
echo (This may take a few minutes on first run)
echo.

REM Download Node.js (same version as current system)
set NODE_URL=https://nodejs.org/dist/v%CURRENT_NODE_VERSION%/node-v%CURRENT_NODE_VERSION%-win-x64.zip
set ZIP_PATH=%TEMP%\node-v%CURRENT_NODE_VERSION%-win-x64.zip
set EXTRACT_PATH=%TEMP%\node-v%CURRENT_NODE_VERSION%-win-x64

powershell -ExecutionPolicy Bypass -Command "& { $ProgressPreference = 'SilentlyContinue'; try { Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%ZIP_PATH%' -UseBasicParsing; Write-Host 'Download completed' } catch { Write-Host 'Download error: ' $_.Exception.Message; exit 1 } }"

if errorlevel 1 (
    echo.
    echo WARNING: Node.js download failed
    echo You can set up Node.js manually by running setup-complete.bat
    echo.
    goto :skip_node
)

echo Extracting ZIP file...
powershell -ExecutionPolicy Bypass -Command "& { if (Test-Path '%EXTRACT_PATH%') { Remove-Item -Recurse -Force '%EXTRACT_PATH%' }; Expand-Archive -Path '%ZIP_PATH%' -DestinationPath '%TEMP%' -Force }"

echo Copying files...
set SOURCE_NODE=%TEMP%\node-v%CURRENT_NODE_VERSION%-win-x64
xcopy /E /I /Y "%SOURCE_NODE%\*" "%NODE_FOLDER%\" >nul

REM Clean up temporary files
del /F /Q "%ZIP_PATH%" 2>nul
rmdir /s /q "%EXTRACT_PATH%" 2>nul

REM Verify Node.js
if exist "%NODE_FOLDER%\node.exe" (
    echo Node.js inclusion completed
    "%NODE_FOLDER%\node.exe" --version >nul 2>&1
    if errorlevel 1 (
        echo WARNING: Node.js verification failed
        goto :skip_node
    ) else (
        for /f "delims=" %%v in ('"%NODE_FOLDER%\node.exe" --version') do echo    Version: %%v
    )
) else (
    echo ERROR: Node.js copy failed
    goto :skip_node
)

REM Rebuild better-sqlite3 with portable Node.js
echo.
echo Rebuilding better-sqlite3 for portable Node.js...
echo (This may take a few minutes)
echo.

REM Get absolute paths
for %%I in ("%NODE_FOLDER%") do set "NODE_FOLDER_ABS=%%~fI"
for %%I in ("%APP_FOLDER%") do set "APP_FOLDER_ABS=%%~fI"

REM Set PATH with absolute paths
set "PATH_ORIG=%PATH%"
set "PATH=%NODE_FOLDER_ABS%;%NODE_FOLDER_ABS%\node_modules\npm\bin;%PATH%"

REM Change to app folder
cd /d "%APP_FOLDER_ABS%"

REM Check if npm.cmd exists
if exist "%NODE_FOLDER_ABS%\npm.cmd" (
    echo Using npm.cmd...
    "%NODE_FOLDER_ABS%\npm.cmd" rebuild better-sqlite3
    if errorlevel 1 (
        set "REBUILD_SUCCESS=1"
    ) else (
        set "REBUILD_SUCCESS=0"
    )
) else (
    echo npm.cmd not found, trying alternative method...
    "%NODE_FOLDER_ABS%\node.exe" "%NODE_FOLDER_ABS%\node_modules\npm\bin\npm-cli.js" rebuild better-sqlite3
    if errorlevel 1 (
        set "REBUILD_SUCCESS=1"
    ) else (
        set "REBUILD_SUCCESS=0"
    )
)

if "%REBUILD_SUCCESS%"=="1" (
    echo.
    echo WARNING: better-sqlite3 rebuild failed
    echo Trying alternative method with node-gyp...
    if exist "%NODE_FOLDER_ABS%\node_modules\npm\bin\npm-cli.js" (
        "%NODE_FOLDER_ABS%\node.exe" "%NODE_FOLDER_ABS%\node_modules\npm\bin\npm-cli.js" rebuild better-sqlite3 --build-from-source
        if errorlevel 1 (
            echo.
            echo WARNING: better-sqlite3 rebuild failed
            echo The package may not work correctly
            echo You may need to rebuild manually after setup
            echo.
        ) else (
            echo.
            echo better-sqlite3 rebuild completed successfully
            echo.
        )
    ) else (
        echo.
        echo ERROR: npm not found in portable Node.js
        echo better-sqlite3 rebuild failed
        echo.
    )
) else (
    echo.
    echo better-sqlite3 rebuild completed successfully
    echo.
)

REM Restore original PATH
set "PATH=%PATH_ORIG%"
cd /d "%~dp0\.."

:skip_node
echo.

REM Check size
for /f "tokens=3" %%a in ('dir /s /-c "%APP_FOLDER%" ^| find "File(s)"') do set SIZE=%%a
echo Package Information:
echo    Application folder: %APP_FOLDER%
if exist "%NODE_FOLDER%\node.exe" (
    echo    Node.js: Included (v%CURRENT_NODE_VERSION%)
) else (
    echo    Node.js: Not included (can be set up with setup-complete.bat)
)
echo.
echo Portable distribution package creation completed!
echo.
echo Next steps:
if exist "%NODE_FOLDER%\node.exe" (
    echo Node.js is already included
    echo 1. Run dist-portable\start.bat to start the server
) else (
    echo 1. Run dist-portable\setup-complete.bat to set up Node.js
    echo 2. Run dist-portable\start.bat to start the server
)
echo.
pause
