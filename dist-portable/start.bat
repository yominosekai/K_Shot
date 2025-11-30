@echo off
echo off
chcp 65001 >nul 2>&1
title ナレッジ管理ツール（K_Shot） - サーバー起動
cd /d "%~dp0" >nul 2>&1

if not exist "node\node.exe" (
    echo.
    echo ❌ エラー: node.exe が見つかりません
    echo    探しているパス: %CD%\node\node.exe
    echo.
    echo ポータブルNode.jsを以下の手順でセットアップしてください:
    echo 1. https://nodejs.org/ からNode.jsをダウンロード
    echo 2. 7-Zipなどで展開
    echo 3. 展開したフォルダ内のファイルを、このフォルダの "node" フォルダにコピー
    echo.
    pause
    exit /b 1
)

set "PATH=%~dp0node;%PATH%" >nul 2>&1
cd app >nul 2>&1

if "%PORT%"=="" set PORT=3005

:: デフォルトのログレベルをERRORに設定（ユーザーが上書き可能）
if "%LOG_LEVEL%"=="" set LOG_LEVEL=ERROR

echo.
echo ========================================
echo   ナレッジ管理ツール（K_Shot） - サーバー起動
echo ========================================
echo   ポート: %PORT%
echo   URL: http://localhost:%PORT%
echo   停止: Ctrl+C
echo ========================================
echo.

node_modules\.bin\next.cmd start --port %PORT% --hostname localhost

pause