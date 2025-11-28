# ポータブルNode.js自動セットアップスクリプト
# Node.jsを自動的にダウンロードして配置します

Write-Host "📥 ポータブルNode.jsをセットアップ中..." -ForegroundColor Cyan

$nodeFolder = Join-Path $PSScriptRoot "node"
$nodeExe = Join-Path $nodeFolder "node.exe"

# 既にNode.jsが存在するか確認
if (Test-Path $nodeExe) {
    Write-Host "✅ 既にNode.jsが配置されています" -ForegroundColor Green
    $version = & $nodeExe --version
    Write-Host "   バージョン: $version" -ForegroundColor Gray
    $response = Read-Host "上書きしますか？ (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "セットアップをキャンセルしました" -ForegroundColor Yellow
        exit 0
    }
}

# Node.jsフォルダを作成
if (-not (Test-Path $nodeFolder)) {
    New-Item -ItemType Directory -Path $nodeFolder -Force | Out-Null
}

# 現在のシステムのNode.jsバージョンを取得
try {
    $currentVersion = node --version
    $nodeVersion = $currentVersion -replace 'v', ''
    Write-Host "現在のシステムのNode.jsバージョン: $currentVersion" -ForegroundColor Cyan
    Write-Host "同じバージョンをダウンロードします: v$nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️ システムのNode.jsバージョンを取得できませんでした" -ForegroundColor Yellow
    Write-Host "デフォルトのLTS版（v20.18.0）を使用します" -ForegroundColor Yellow
    $nodeVersion = "20.18.0"
}

# Node.jsのダウンロードURL（Windows x64）
$nodeUrl = "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip"
$zipPath = Join-Path $env:TEMP "node-v$nodeVersion-win-x64.zip"
$extractPath = Join-Path $env:TEMP "node-v$nodeVersion-win-x64"

Write-Host "📥 Node.js v$nodeVersion をダウンロード中..." -ForegroundColor Cyan
Write-Host "   URL: $nodeUrl" -ForegroundColor Gray

try {
    # ダウンロード
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $nodeUrl -OutFile $zipPath -UseBasicParsing
    
    Write-Host "✅ ダウンロード完了" -ForegroundColor Green
    
    # 展開
    Write-Host "📦 ZIPファイルを展開中..." -ForegroundColor Cyan
    if (Test-Path $extractPath) {
        Remove-Item -Recurse -Force $extractPath
    }
    Expand-Archive -Path $zipPath -DestinationPath $env:TEMP -Force
    
    # 展開したフォルダ内のファイルをnodeフォルダにコピー
    $sourceFolder = Join-Path $extractPath "node-v$nodeVersion-win-x64"
    Write-Host "📋 ファイルをコピー中..." -ForegroundColor Cyan
    
    Get-ChildItem -Path $sourceFolder | Copy-Item -Destination $nodeFolder -Recurse -Force
    
    Write-Host "✅ Node.jsのセットアップが完了しました" -ForegroundColor Green
    
    # バージョン確認
    $version = & $nodeExe --version
    Write-Host "   インストールされたバージョン: $version" -ForegroundColor Gray
    
    # 一時ファイルを削除
    Write-Host "🧹 一時ファイルを削除中..." -ForegroundColor Cyan
    if (Test-Path $zipPath) {
        Remove-Item -Force $zipPath
    }
    if (Test-Path $extractPath) {
        Remove-Item -Recurse -Force $extractPath
    }
    
    Write-Host ""
    Write-Host "🎉 セットアップ完了！" -ForegroundColor Green
    Write-Host "   start.bat を実行してサーバーを起動できます" -ForegroundColor Gray
    
} catch {
    Write-Host ""
    Write-Host "❌ エラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "手動でセットアップする場合:" -ForegroundColor Yellow
    Write-Host "1. https://nodejs.org/ からNode.jsをダウンロード" -ForegroundColor Gray
    Write-Host "2. ZIPファイルを展開" -ForegroundColor Gray
    Write-Host "3. 展開したフォルダ内のファイルを node フォルダにコピー" -ForegroundColor Gray
    exit 1
}
