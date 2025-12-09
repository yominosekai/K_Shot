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

REM Distribution folder
set DIST_FOLDER=dist-portable
set APP_FOLDER=%DIST_FOLDER%\app

REM Remove existing app folder (remove cache first to avoid path length issues)
if exist "%APP_FOLDER%" (
    echo Removing existing app folder...
    if exist "%APP_FOLDER%\.next\cache" (
        echo Removing cache folder first...
        rmdir /s /q "%APP_FOLDER%\.next\cache" 2>nul
    )
    rmdir /s /q "%APP_FOLDER%" 2>nul
)

REM Create folders
if not exist "%DIST_FOLDER%" mkdir "%DIST_FOLDER%" 2>nul
mkdir "%APP_FOLDER%" 2>nul
if not exist "%DIST_FOLDER%\node" mkdir "%DIST_FOLDER%\node" 2>nul

echo Folder structure created
echo.

REM Create production node_modules (excluding devDependencies)
echo Creating production dependencies...
set TEMP_PROD_MODULES=%TEMP%\k-shot-prod-modules-%RANDOM%

REM Create temp folder and copy package files
mkdir "%TEMP_PROD_MODULES%" 2>nul
copy /Y "package.json" "%TEMP_PROD_MODULES%\" >nul
copy /Y "package-lock.json" "%TEMP_PROD_MODULES%\" >nul 2>nul

REM Install production dependencies
cd /d "%TEMP_PROD_MODULES%"
echo Running npm install --production...
call npm install --production --silent >nul 2>&1

REM Install TypeScript for next.config.ts
echo Installing TypeScript for next.config.ts...
call npm install typescript@^5.7.0 --no-save --silent >nul 2>&1

cd /d "%~dp0\.."

REM Check if production node_modules was created
if not exist "%TEMP_PROD_MODULES%\node_modules" (
    echo WARNING: Failed to create production node_modules
    echo Using development node_modules instead
    set TEMP_PROD_MODULES=
) else (
    echo Production dependencies created
)

echo.
echo Copying files...
echo.

REM Copy .next folder (excluding cache)
if exist ".next" (
    echo Copying .next (excluding cache)...
    mkdir "%APP_FOLDER%\.next" 2>nul
    for /d %%d in (".next\*") do (
        if /i not "%%~nxd"=="cache" (
            echo   - %%~nxd
            xcopy /E /I /Y "%%d" "%APP_FOLDER%\.next\%%~nxd\" >nul
        )
    )
    for %%f in (".next\*") do (
        if not exist ".next\%%~nxf\" (
            copy /Y "%%f" "%APP_FOLDER%\.next\" >nul 2>nul
        )
    )
)

REM Copy node_modules (production version if available)
if not "%TEMP_PROD_MODULES%"=="" (
    echo Copying node_modules (production - devDependencies excluded)...
    xcopy /E /I /Y "%TEMP_PROD_MODULES%\node_modules" "%APP_FOLDER%\node_modules\" >nul
) else (
    echo Copying node_modules (development version)...
    xcopy /E /I /Y "node_modules" "%APP_FOLDER%\node_modules\" >nul
)

REM Copy public folder
if exist "public" (
    echo Copying public...
    xcopy /E /I /Y "public" "%APP_FOLDER%\public\" >nul
)

REM Copy required files
if exist "package.json" (
    echo Copying package.json...
    copy /Y "package.json" "%APP_FOLDER%\" >nul
)
if exist "package-lock.json" (
    echo Copying package-lock.json...
    copy /Y "package-lock.json" "%APP_FOLDER%\" >nul 2>nul
)
if exist "next.config.ts" (
    echo Copying next.config.ts...
    copy /Y "next.config.ts" "%APP_FOLDER%\" >nul
)

echo File copy completed
echo.

REM Clean up temporary production modules folder
if not "%TEMP_PROD_MODULES%"=="" (
    echo Cleaning up temporary files...
    rmdir /s /q "%TEMP_PROD_MODULES%" 2>nul
)

REM Create start.bat
echo Creating start.bat...
(
echo @echo off
echo echo off
echo chcp 65001 ^>nul 2^>^&1
echo title Knowledge Management Tool ^(K_Shot^) - Server Start
echo cd /d "%%~dp0" ^>nul 2^>^&1
echo.
echo if not exist "node\node.exe" ^(
echo     echo.
echo     echo ERROR: node.exe not found
echo     echo     Looking for: %%CD%%\node\node.exe
echo     echo.
echo     echo Please set up portable Node.js using the following steps:
echo     echo 1. Download Node.js from https://nodejs.org/
echo     echo 2. Extract using 7-Zip or similar
echo     echo 3. Copy files from extracted folder to "node" folder in this directory
echo     echo.
echo     pause
echo     exit /b 1
echo ^)
echo.
echo set "PATH=%%~dp0node;%%PATH%%" ^>nul 2^>^&1
echo cd app ^>nul 2^>^&1
echo.
echo if "%%PORT%%"=="" set PORT=3005
echo.
echo REM Set default log level to ERROR ^(user can override^)
echo if "%%LOG_LEVEL%%"=="" set LOG_LEVEL=ERROR
echo.
echo echo.
echo echo ========================================
echo echo   Knowledge Management Tool ^(K_Shot^) - Server Start
echo echo ========================================
echo echo   Port: %%PORT%%
echo echo   URL: http://localhost:%%PORT%%
echo echo   Stop: Ctrl+C
echo echo ========================================
echo echo.
echo.
echo node_modules\.bin\next.cmd start --port %%PORT%% --hostname localhost
echo.
echo pause
) > "%DIST_FOLDER%\start.bat"

echo start.bat created
echo.

REM Create README.txt (only if it doesn't exist)
set README_PATH=%DIST_FOLDER%\README.txt
if not exist "%README_PATH%" (
    echo Creating README.txt...
    (
        echo ========================================
        echo Knowledge Management Tool ^(K_Shot^) - Portable Version
        echo ========================================
        echo.
        echo [Setup Instructions]
        echo.
        echo 1. Portable Node.js Setup
        echo.
        echo    Use one of the following methods:
        echo.
        echo    [Method A] Use Portable Node.js ^(Recommended^)
        echo    - Download Node.js LTS from https://nodejs.org/
        echo    - Extract ZIP file using 7-Zip or similar
        echo    - Copy files from extracted folder to "node" folder in this directory
        echo    - Verify that node.exe exists at node\node.exe
        echo.
        echo    [Method B] Use System Node.js
        echo    - If Node.js is installed on your system, you can use it
        echo    - Edit start.bat to remove the portable Node.js check
        echo.
        echo 2. Start Server
        echo.
        echo    - Double-click start.bat to start
        echo    - Access http://localhost:3005 in your browser
        echo    - Initial setup screen will appear on first run
        echo.
        echo [Change Port]
        echo.
        echo You can change the port by setting the PORT environment variable:
        echo.
        echo     set PORT=3000
        echo     start.bat
        echo.
        echo Or edit start.bat to change the PORT value.
        echo.
        echo [Set Log Level]
        echo.
        echo You can change the log level by setting the LOG_LEVEL environment variable:
        echo.
        echo     set LOG_LEVEL=DEBUG
        echo     start.bat
        echo.
        echo Available values: DEBUG, INFO, WARN, ERROR
        echo.
        echo [Notes]
        echo.
        echo - This package contains a pre-built application
        echo - Development files ^(.git, src/ etc.^) are not included
        echo - Data is saved to network drive ^(configured on first run^)
        echo - node_modules folder contains only production dependencies ^(devDependencies excluded^)
        echo   - Test tools ^(vitest etc.^) and development tools are not included
        echo   - Package size is optimized
        echo.
        echo [Troubleshooting]
        echo.
        echo 1. Server won't start
        echo    - Verify node\node.exe exists
        echo    - Check if port is not used by another application
        echo    - Check firewall settings
        echo.
        echo 2. Database errors occur
        echo    - Verify network drive is properly mounted
        echo    - Check initial setup configuration
        echo.
        echo [Support]
        echo.
        echo For detailed documentation, refer to the project's README.md
    ) > "%README_PATH%"
    echo README.txt created
) else (
    echo README.txt already exists, skipping
)
echo.

REM Setup portable Node.js
set NODE_FOLDER=%DIST_FOLDER%\node
set NODE_EXE_PATH=%NODE_FOLDER%\node.exe
set NODE_SETUP_SUCCESS=0

if not exist "%NODE_EXE_PATH%" (
    echo.
    echo Setting up portable Node.js automatically...
    
    REM Get current Node.js version
    for /f "tokens=*" %%v in ('node --version 2^>nul') do set CURRENT_NODE_VERSION=%%v
    set CURRENT_NODE_VERSION=%CURRENT_NODE_VERSION:v=%
    
    if not "%CURRENT_NODE_VERSION%"=="" (
        echo Detected Node.js version: %CURRENT_NODE_VERSION%
        
        set NODE_ZIP_URL=https://nodejs.org/dist/v%CURRENT_NODE_VERSION%/node-v%CURRENT_NODE_VERSION%-win-x64.zip
        set TEMP_ZIP_PATH=%TEMP%\node-v%CURRENT_NODE_VERSION%-win-x64.zip
        set EXTRACTED_NODE_FOLDER=%TEMP%\node-v%CURRENT_NODE_VERSION%-win-x64
        
        echo Downloading...
        powershell -ExecutionPolicy Bypass -Command "& { $ProgressPreference = 'SilentlyContinue'; try { Invoke-WebRequest -Uri '%NODE_ZIP_URL%' -OutFile '%TEMP_ZIP_PATH%' -UseBasicParsing; Write-Host 'Download completed' } catch { Write-Host 'Download error: ' $_.Exception.Message; exit 1 } }"
        
        if not errorlevel 1 (
            echo Extracting...
            powershell -ExecutionPolicy Bypass -Command "& { if (Test-Path '%EXTRACTED_NODE_FOLDER%') { Remove-Item -Recurse -Force '%EXTRACTED_NODE_FOLDER%' }; Expand-Archive -Path '%TEMP_ZIP_PATH%' -DestinationPath '%TEMP%' -Force }"
            
            echo Copying files...
            if exist "%EXTRACTED_NODE_FOLDER%" (
                xcopy /E /I /Y "%EXTRACTED_NODE_FOLDER%\*" "%NODE_FOLDER%\" >nul
                
                if exist "%NODE_EXE_PATH%" (
                    set NODE_SETUP_SUCCESS=1
                    echo Portable Node.js setup completed
                ) else (
                    echo ERROR: Failed to copy Node.js
                )
            ) else (
                echo ERROR: Extracted folder not found
            )
            
            REM Clean up temporary files
            del /F /Q "%TEMP_ZIP_PATH%" 2>nul
            rmdir /s /q "%EXTRACTED_NODE_FOLDER%" 2>nul
        ) else (
            echo ERROR: Node.js download failed
        )
    ) else (
        echo ERROR: Failed to get Node.js version
    )
) else (
    set NODE_SETUP_SUCCESS=1
    echo.
    echo Portable Node.js is already set up
)

REM Calculate and display package size
echo.
echo Package Information:
for /f "tokens=3" %%a in ('dir /s /-c "%APP_FOLDER%" 2^>nul ^| find "File(s)"') do set APP_SIZE=%%a
echo    Application folder: %APP_FOLDER%

if exist "%NODE_FOLDER%\node.exe" (
    for /f "tokens=3" %%a in ('dir /s /-c "%NODE_FOLDER%" 2^>nul ^| find "File(s)"') do set NODE_SIZE=%%a
    echo    Node.js: Included
) else (
    echo    Node.js: Not included ^(can be set up manually^)
)

echo    Distribution folder: %DIST_FOLDER%
echo.
echo Portable distribution package creation completed!
echo.
echo Next steps:
if "%NODE_SETUP_SUCCESS%"=="1" (
    echo Run dist-portable\start.bat to start the server
) else (
    echo 1. Manually place portable Node.js in the "node" folder
    echo    ^(See README.txt for instructions^)
    echo 2. Run dist-portable\start.bat to start the server
)
echo.
pause
