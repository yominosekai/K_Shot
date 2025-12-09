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
    rmdir /s /q "%APP_FOLDER%" 2>nul
)

REM Create folder structure
if not exist "%DIST_FOLDER%" mkdir "%DIST_FOLDER%" 2>nul
mkdir "%APP_FOLDER%" 2>nul
if not exist "%DIST_FOLDER%\node" mkdir "%DIST_FOLDER%\node" 2>nul

echo Folder structure created
echo.

REM Create production node_modules (excluding devDependencies)
echo Creating production dependencies...
echo.

set TEMP_PROD_MODULES=%TEMP%\k-shot-prod-modules-%RANDOM%

REM Create temporary folder
mkdir "%TEMP_PROD_MODULES%" 2>nul

REM Copy package.json and package-lock.json to temporary folder
copy /Y "package.json" "%TEMP_PROD_MODULES%\" >nul
if exist "package-lock.json" copy /Y "package-lock.json" "%TEMP_PROD_MODULES%\" >nul 2>nul

REM Change to temporary folder and run npm install --production
cd /d "%TEMP_PROD_MODULES%"
echo Running npm install --production...
call npm install --production --silent >nul 2>&1

REM Check if node_modules was created
if not exist "node_modules" (
    echo WARNING: Production dependencies creation failed. Using development node_modules.
    cd /d "%~dp0\.."
    set USE_DEV_MODULES=1
    goto :copy_files
)

REM Install TypeScript for next.config.ts
echo Installing TypeScript for next.config.ts...
call npm install typescript@^5.7.0 --no-save --silent >nul 2>&1

REM Return to project root
cd /d "%~dp0\.."

REM Check if production modules were created successfully
if exist "%TEMP_PROD_MODULES%\node_modules" (
    set USE_DEV_MODULES=0
) else (
    echo WARNING: Production dependencies creation failed. Using development node_modules.
    set USE_DEV_MODULES=1
)

:copy_files
echo.
echo Copying files...
echo.

REM Copy .next folder
echo   - .next
xcopy /E /I /Y ".next" "%APP_FOLDER%\.next\" >nul
REM Remove cache folder if it exists (to avoid path length issues)
if exist "%APP_FOLDER%\.next\cache" (
    rmdir /s /q "%APP_FOLDER%\.next\cache" 2>nul
)

REM Copy node_modules (production or development)
if "%USE_DEV_MODULES%"=="1" (
    echo   - node_modules (development - devDependencies included)
    xcopy /E /I /Y "node_modules" "%APP_FOLDER%\node_modules\" >nul
) else (
    echo   - node_modules (production - devDependencies excluded)
    xcopy /E /I /Y "%TEMP_PROD_MODULES%\node_modules" "%APP_FOLDER%\node_modules\" >nul
)

REM Copy public folder
echo   - public
xcopy /E /I /Y "public" "%APP_FOLDER%\public\" >nul

REM Copy required files
copy /Y "package.json" "%APP_FOLDER%\" >nul
if exist "package-lock.json" copy /Y "package-lock.json" "%APP_FOLDER%\" >nul 2>nul
copy /Y "next.config.ts" "%APP_FOLDER%\" >nul

echo File copy completed
echo.

REM Clean up temporary production modules folder
if exist "%TEMP_PROD_MODULES%" (
    echo Cleaning up temporary files...
    rmdir /s /q "%TEMP_PROD_MODULES%" 2>nul
)

REM Download and include Node.js (same version as current system)
set NODE_FOLDER=%DIST_FOLDER%\node
set NODE_EXE_PATH=%NODE_FOLDER%\node.exe
set NODE_SETUP_SUCCESS=0

if not exist "%NODE_EXE_PATH%" (
    echo.
    echo Downloading portable Node.js v%CURRENT_NODE_VERSION%...
    echo (This may take a few minutes on first run)
    echo.

    REM Download Node.js (same version as current system)
    set NODE_URL=https://nodejs.org/dist/v%CURRENT_NODE_VERSION%/node-v%CURRENT_NODE_VERSION%-win-x64.zip
    set ZIP_PATH=%TEMP%\node-v%CURRENT_NODE_VERSION%-win-x64.zip
    set EXTRACT_PATH=%TEMP%\node-v%CURRENT_NODE_VERSION%-win-x64

    REM Check if curl is available
    where curl >nul 2>&1
    if errorlevel 1 (
        echo.
        echo WARNING: curl command not found
        echo Node.js download requires curl (available on Windows 10+)
        echo You can set up Node.js manually (see README.txt)
        echo.
        goto :skip_node
    )

    echo Downloading...
    curl -L -o "%ZIP_PATH%" "%NODE_URL%" >nul 2>&1

    if not exist "%ZIP_PATH%" (
        echo.
        echo WARNING: Node.js download failed
        echo You can set up Node.js manually (see README.txt)
        echo.
        goto :skip_node
    )

    echo Download completed
    echo Extracting ZIP file...
    
    REM Remove existing extract path
    if exist "%EXTRACT_PATH%" rmdir /s /q "%EXTRACT_PATH%" 2>nul
    
    REM Extract using tar (available on Windows 10+)
    where tar >nul 2>&1
    if errorlevel 1 (
        echo WARNING: tar command not found
        echo ZIP extraction requires tar (available on Windows 10+)
        echo You can extract manually or set up Node.js manually (see README.txt)
        del /F /Q "%ZIP_PATH%" 2>nul
        goto :skip_node
    )
    
    cd /d "%TEMP%"
    tar -xf "%ZIP_PATH%" >nul 2>&1
    cd /d "%~dp0\.."
    
    if not exist "%EXTRACT_PATH%" (
        echo WARNING: ZIP extraction failed
        del /F /Q "%ZIP_PATH%" 2>nul
        goto :skip_node
    )

    echo Copying files...
    set SOURCE_NODE=%TEMP%\node-v%CURRENT_NODE_VERSION%-win-x64
    xcopy /E /I /Y "%SOURCE_NODE%\*" "%NODE_FOLDER%\" >nul

    REM Clean up temporary files
    del /F /Q "%ZIP_PATH%" 2>nul
    rmdir /s /q "%EXTRACT_PATH%" 2>nul

    REM Verify Node.js
    if exist "%NODE_EXE_PATH%" (
        "%NODE_EXE_PATH%" --version >nul 2>&1
        if errorlevel 1 (
            echo WARNING: Node.js verification failed
            goto :skip_node
        ) else (
            for /f "delims=" %%v in ('"%NODE_EXE_PATH%" --version') do echo    Version: %%v
            set NODE_SETUP_SUCCESS=1
        )
    ) else (
        echo ERROR: Node.js copy failed
        goto :skip_node
    )
) else (
    echo.
    echo Portable Node.js is already set up
    set NODE_SETUP_SUCCESS=1
)

:skip_node
echo.

REM Create start.bat
echo Creating start.bat...
(
echo @echo off
echo echo off
echo chcp 65001 ^>nul 2^>^&1
echo title K_Shot - Server Start
echo cd /d "%%~dp0" ^>nul 2^>^&1
echo.
echo if not exist "node\node.exe" ^(
echo     echo.
echo     echo ERROR: node.exe not found
echo     echo     Looking for: %%CD%%\node\node.exe
echo     echo.
echo     echo Please set up portable Node.js:
echo     echo 1. Download Node.js from https://nodejs.org/
echo     echo 2. Extract with 7-Zip
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
echo echo   K_Shot - Server Start
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

echo Start script created
echo.

REM Create README.txt (only if it doesn't exist)
set README_PATH=%DIST_FOLDER%\README.txt
if not exist "%README_PATH%" (
    echo Creating README.txt...
    (
        echo ========================================
        echo K_Shot - Portable Distribution Package
        echo ========================================
        echo.
        echo [Setup Instructions]
        echo.
        echo 1. Portable Node.js Setup
        echo.
        echo    Choose one of the following methods:
        echo.
        echo    [Method A] Use Portable Node.js ^(Recommended^)
        echo    - Download Node.js LTS from https://nodejs.org/
        echo    - Extract ZIP file with 7-Zip
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
        echo Or edit start.bat and change the PORT value.
        echo.
        echo [Log Level Settings]
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
        echo    - Check if node\node.exe exists
        echo    - Check if port is not used by another application
        echo    - Check firewall settings
        echo.
        echo 2. Database errors
        echo    - Check if network drive is properly mounted
        echo    - Check initial setup configuration
        echo.
        echo [Support]
        echo.
        echo For detailed documentation, see the project README.md
    ) > "%README_PATH%"
    echo README.txt created
) else (
    echo README.txt already exists, skipping
)
echo.

REM Check size
echo Package Information:
echo    Application folder: %APP_FOLDER%
if "%NODE_SETUP_SUCCESS%"=="1" (
    echo    Node.js: Included ^(v%CURRENT_NODE_VERSION%^)
) else (
    echo    Node.js: Not included ^(see README.txt for setup instructions^)
)
echo.
echo Portable distribution package creation completed!
echo.
echo Next steps:
if "%NODE_SETUP_SUCCESS%"=="1" (
    echo 1. Run dist-portable\start.bat to start the server
) else (
    echo 1. Set up Node.js in the "node" folder ^(see README.txt^)
    echo 2. Run dist-portable\start.bat to start the server
)
echo.
pause
