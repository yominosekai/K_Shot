# File Server Setup Script
# Creates the file-server directory only (no mounting)

$ErrorActionPreference = "Stop"

# Server directory path
$serverPath = Join-Path $PSScriptRoot "file-server"

Write-Host "Setting up file server directory..." -ForegroundColor Green

# Create server directory
if (-not (Test-Path $serverPath)) {
    New-Item -ItemType Directory -Path $serverPath -Force | Out-Null
    Write-Host "Directory created: $serverPath" -ForegroundColor Green
} else {
    Write-Host "Directory already exists: $serverPath" -ForegroundColor Yellow
}

Write-Host "`nFile server directory setup completed!" -ForegroundColor Green
Write-Host "Server path: $serverPath" -ForegroundColor Cyan
Write-Host "`nNote: Use /setup page in the application to mount this directory as a network drive." -ForegroundColor Yellow

