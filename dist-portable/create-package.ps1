# ポータブル配布パッケージ作成スクリプト
# 本番ビルド済みのアプリケーションを配布用にパッケージ化します

Write-Host "📦 ポータブル配布パッケージを作成中..." -ForegroundColor Cyan

# プロジェクトルートに移動
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# 配布用フォルダ
$distFolder = Join-Path $projectRoot "dist-portable"
$appFolder = Join-Path $distFolder "app"

# 既存のappフォルダのみを削除（スクリプトやREADMEなどは保持）
if (Test-Path $appFolder) {
    Write-Host "🗑️  既存のappフォルダを削除中..." -ForegroundColor Yellow
    
    # cacheフォルダを先に削除（パス長制限の問題を回避）
    $cacheFolder = Join-Path $appFolder ".next\cache"
    if (Test-Path $cacheFolder) {
        Remove-Item -Path $cacheFolder -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # appフォルダを削除（エラーは無視 - パス長制限の問題があるため）
    Remove-Item -Path $appFolder -Recurse -Force -ErrorAction SilentlyContinue
}

# フォルダを作成（存在しない場合のみ）
if (-not (Test-Path $distFolder)) {
    New-Item -ItemType Directory -Path $distFolder -Force | Out-Null
}
New-Item -ItemType Directory -Path $appFolder -Force | Out-Null
if (-not (Test-Path (Join-Path $distFolder "node"))) {
    New-Item -ItemType Directory -Path (Join-Path $distFolder "node") -Force | Out-Null
}

Write-Host "✅ フォルダ構造を作成しました" -ForegroundColor Green

# ビルドが完了しているか確認
if (-not (Test-Path ".next")) {
    Write-Host "❌ エラー: .next フォルダが見つかりません" -ForegroundColor Red
    Write-Host "   先に 'npm run build' を実行してください" -ForegroundColor Yellow
    exit 1
}

# 本番用のnode_modulesを作成（devDependenciesを除外）
Write-Host "📦 本番用の依存関係を準備中..." -ForegroundColor Cyan
$tempProdModules = Join-Path $env:TEMP "k-shot-prod-modules-$(Get-Random)"
try {
    # 一時フォルダに本番用のnode_modulesを作成
    New-Item -ItemType Directory -Path $tempProdModules -Force | Out-Null
    Copy-Item -Path "package.json" -Destination (Join-Path $tempProdModules "package.json") -Force
    Copy-Item -Path "package-lock.json" -Destination (Join-Path $tempProdModules "package-lock.json") -Force -ErrorAction SilentlyContinue
    
    # 本番用の依存関係のみをインストール
    Push-Location $tempProdModules
    Write-Host "   npm install --production を実行中..." -ForegroundColor Gray
    npm install --production --silent 2>&1 | Out-Null
    
    # next.config.tsを使用するため、TypeScriptを追加インストール（package.jsonは変更しない）
    Write-Host "   TypeScriptを追加インストール中（next.config.ts用）..." -ForegroundColor Gray
    npm install typescript@^5.7.0 --no-save --silent 2>&1 | Out-Null
    
    Pop-Location
    
    if (Test-Path (Join-Path $tempProdModules "node_modules")) {
        Write-Host "✅ 本番用の依存関係を準備しました" -ForegroundColor Green
    } else {
        Write-Host "⚠️  本番用の依存関係の作成に失敗しました。開発用のnode_modulesを使用します" -ForegroundColor Yellow
        $tempProdModules = $null
    }
} catch {
    Write-Host "⚠️  本番用の依存関係の作成に失敗しました: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   開発用のnode_modulesを使用します" -ForegroundColor Yellow
    $tempProdModules = $null
}

# コピーするファイルとフォルダ
# 注意: クローズド環境で即動くポータブル版を作成するため、
#       本番用の依存関係（dependenciesのみ）を含めます
#       devDependencies（vitestなど）は除外されます
$itemsToCopy = @(
    ".next",              # ビルド成果物（必須）- npm run buildで生成
    "node_modules",       # 依存関係（必須）- 本番用のみ（devDependencies除外）
    "public",             # 静的ファイル（必須）- ロゴ、マニュアルなど
    "package.json",       # 依存関係の定義（必須）
    "package-lock.json",  # 依存関係のロックファイル（推奨）
    "next.config.ts"      # Next.jsの設定（必須）- 実行時に読み込まれる可能性あり
)

Write-Host "📋 ファイルをコピー中..." -ForegroundColor Cyan

foreach ($item in $itemsToCopy) {
    # node_modulesの場合は本番用のものを使用
    if ($item -eq "node_modules" -and $tempProdModules -ne $null) {
        $sourcePath = Join-Path $tempProdModules $item
    } else {
        $sourcePath = Join-Path $projectRoot $item
    }
    $destPath = Join-Path $appFolder $item
    
    if (Test-Path $sourcePath) {
        Write-Host "  → $item" -ForegroundColor Gray
        if ($item -eq "node_modules" -and $tempProdModules -ne $null) {
            Write-Host "    （本番用 - devDependencies除外）" -ForegroundColor DarkGray
        }
        if (Test-Path $sourcePath -PathType Container) {
            # フォルダの場合
            if ($item -eq ".next") {
                # .nextフォルダはcacheサブフォルダを除外してコピー
                # （cacheは実行時に再生成されるため配布不要、かつパス長制限の問題を回避）
                Write-Host "    （cacheフォルダを除外）" -ForegroundColor DarkGray
                $destParent = Split-Path -Parent $destPath
                New-Item -ItemType Directory -Path $destParent -Force | Out-Null
                
                # .nextフォルダ内のすべてのアイテムをコピー（cacheを除く）
                Get-ChildItem -Path $sourcePath -Exclude "cache" | ForEach-Object {
                    $itemDestPath = Join-Path $destPath $_.Name
                    Copy-Item -Path $_.FullName -Destination $itemDestPath -Recurse -Force -ErrorAction SilentlyContinue
                }
            } else {
                # その他のフォルダは通常通りコピー
                Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
            }
        } else {
            # ファイルの場合
            Copy-Item -Path $sourcePath -Destination $destPath -Force
        }
    } else {
        Write-Host "  ⚠️  $item が見つかりません（スキップ）" -ForegroundColor Yellow
    }
}

# 一時フォルダをクリーンアップ
if ($tempProdModules -ne $null -and (Test-Path $tempProdModules)) {
    Write-Host "🧹 一時ファイルをクリーンアップ中..." -ForegroundColor Gray
    Remove-Item -Path $tempProdModules -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "✅ ファイルのコピーが完了しました" -ForegroundColor Green

# 起動スクリプトをコピー
$startBat = @"
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
"@

$startBatPath = Join-Path $distFolder "start.bat"
$startBat | Out-File -FilePath $startBatPath -Encoding UTF8 -NoNewline

Write-Host "✅ 起動スクリプトを作成しました" -ForegroundColor Green

# READMEを作成（既存の場合は上書きしない）
$readmePath = Join-Path $distFolder "README.txt"
if (-not (Test-Path $readmePath)) {
    $readme = @"
========================================
ナレッジ管理ツール（K_Shot） - ポータブル版
========================================

【セットアップ手順】

1. ポータブルNode.jsのセットアップ
   
   以下のいずれかの方法でNode.jsをセットアップしてください:
   
   【方法A】ポータブルNode.jsを使用（推奨）
   - https://nodejs.org/ からNode.js LTS版をダウンロード
   - 7-ZipなどでZIPファイルを展開
   - 展開したフォルダ内のファイルを、このフォルダの "node" フォルダにコピー
   - node.exe が node\node.exe に存在することを確認
   
   【方法B】システムのNode.jsを使用
   - システムにNode.jsがインストールされている場合は、そのまま使用できます
   - start.bat を編集して、ポータブルNode.jsのチェックを削除してください

2. サーバーの起動
   
   - start.bat をダブルクリックして起動
   - ブラウザで http://localhost:3005 にアクセス
   - 初回起動時は初期設定画面が表示されます

【ポートの変更】

環境変数 PORT を設定することでポートを変更できます:

    set PORT=3000
    start.bat

または、start.bat を編集して PORT の値を変更してください。

【ログレベルの設定】

環境変数 LOG_LEVEL を設定することでログレベルを変更できます:

    set LOG_LEVEL=DEBUG
    start.bat

設定可能な値: DEBUG, INFO, WARN, ERROR

【注意事項】

- このパッケージには、ビルド済みのアプリケーションが含まれています
- 開発用のファイル（.git, src/ の一部など）は含まれていません
- データはネットワークドライブに保存されます（初回起動時に設定）
- node_modules フォルダには本番用の依存関係のみが含まれます（devDependenciesは除外）
  - テストツール（vitestなど）や開発ツールは配布物に含まれません
  - 配布物のサイズが最適化されています

【トラブルシューティング】

1. サーバーが起動しない場合
   - node\node.exe が存在するか確認
   - ポートが他のアプリケーションで使用されていないか確認
   - ファイアウォールの設定を確認

2. データベースエラーが発生する場合
   - ネットワークドライブが正しくマウントされているか確認
   - 初回起動時の設定を確認

【サポート】

詳細なドキュメントは、プロジェクトの README.md を参照してください。
"@
    $readme | Out-File -FilePath $readmePath -Encoding UTF8
    Write-Host "✅ READMEを作成しました" -ForegroundColor Green
} else {
    Write-Host "ℹ️  README.txtは既に存在するため、上書きしませんでした" -ForegroundColor Gray
}

# ポータブルNode.jsの自動セットアップ
$nodeFolder = Join-Path $distFolder "node"
$nodeExePath = Join-Path $nodeFolder "node.exe"
$nodeSetupSuccess = $false

if (-not (Test-Path $nodeExePath)) {
    Write-Host ""
    Write-Host "📥 ポータブルNode.jsを自動セットアップ中..." -ForegroundColor Cyan
    
    # 現在のNode.jsバージョンを取得
    try {
        $currentNodeVersion = node --version
        if ($currentNodeVersion -match 'v(\d+\.\d+\.\d+)') {
            $nodeVersion = $matches[1]
            Write-Host "   検出されたNode.jsバージョン: v$nodeVersion" -ForegroundColor Gray
            
            # Node.jsのダウンロードURL
            $nodeZipUrl = "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip"
            $tempZipPath = Join-Path $env:TEMP "node-v$nodeVersion-win-x64.zip"
            $extractedNodeFolder = Join-Path $env:TEMP "node-v$nodeVersion-win-x64"
            
            Write-Host "   ダウンロード中..." -ForegroundColor Gray
            try {
                # ZIPファイルをダウンロード
                $ProgressPreference = 'SilentlyContinue'
                Invoke-WebRequest -Uri $nodeZipUrl -OutFile $tempZipPath -UseBasicParsing
                
                Write-Host "   展開中..." -ForegroundColor Gray
                # ZIPファイルを展開
                Expand-Archive -Path $tempZipPath -DestinationPath $env:TEMP -Force
                
                # nodeフォルダにコピー
                if (Test-Path $extractedNodeFolder) {
                    Copy-Item -Path "$extractedNodeFolder\*" -Destination $nodeFolder -Recurse -Force
                    
                    # コピーが成功したか確認
                    if (Test-Path $nodeExePath) {
                        $nodeSetupSuccess = $true
                        Write-Host "✅ ポータブルNode.jsをセットアップしました" -ForegroundColor Green
                    } else {
                        Write-Host "❌ Node.jsのコピーに失敗しました" -ForegroundColor Red
                    }
                } else {
                    Write-Host "❌ 展開されたフォルダが見つかりません" -ForegroundColor Red
                }
                
                # 一時ファイルを削除
                Remove-Item -Path $tempZipPath -Force -ErrorAction SilentlyContinue
                Remove-Item -Path $extractedNodeFolder -Recurse -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Host "❌ Node.jsの自動ダウンロードに失敗しました: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Node.jsバージョンの取得に失敗しました" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Node.jsがインストールされていないか、PATHに含まれていません" -ForegroundColor Red
    }
} else {
    $nodeSetupSuccess = $true
    Write-Host ""
    Write-Host "ℹ️  ポータブルNode.jsは既にセットアップ済みです" -ForegroundColor Gray
}

# サイズを確認
$appSize = (Get-ChildItem -Path $appFolder -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$nodeSize = 0
if (Test-Path $nodeFolder) {
    $nodeSize = (Get-ChildItem -Path $nodeFolder -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
}
$totalSize = $appSize + $nodeSize

Write-Host ""
Write-Host "📊 パッケージ情報:" -ForegroundColor Cyan
Write-Host "   アプリケーションサイズ: $([math]::Round($appSize, 2)) MB" -ForegroundColor Gray
if ($nodeSize -gt 0) {
    Write-Host "   Node.jsサイズ: $([math]::Round($nodeSize, 2)) MB" -ForegroundColor Gray
    Write-Host "   合計サイズ: $([math]::Round($totalSize, 2)) MB" -ForegroundColor Gray
}
Write-Host "   配布フォルダ: $distFolder" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 ポータブル配布パッケージの作成が完了しました！" -ForegroundColor Green
Write-Host ""
Write-Host "次のステップ:" -ForegroundColor Yellow
if ($nodeSetupSuccess) {
    Write-Host "✅ start.bat を実行してサーバーを起動してください" -ForegroundColor Green
} else {
    Write-Host "1. node フォルダにポータブルNode.jsを手動で配置してください" -ForegroundColor Yellow
    Write-Host "   （README.txtの手順を参照）" -ForegroundColor DarkGray
    Write-Host "2. start.bat を実行してサーバーを起動してください" -ForegroundColor Gray
}
Write-Host ""
