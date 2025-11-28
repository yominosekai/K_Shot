# File Server Stop Script
# Unmounts Z drive if it was mounted via /setup page

Write-Host "Unmounting Z drive (if mounted)..." -ForegroundColor Yellow

# Delete Z drive mapping
try {
    subst Z: /D 2>$null
    Write-Host "Z drive mapping deleted" -ForegroundColor Green
} catch {
    Write-Host "Z drive mapping not found or already unmounted" -ForegroundColor Yellow
}

Write-Host "`nZ drive unmounted (if it was mounted)." -ForegroundColor Green
Write-Host "Note: The file-server directory still exists. Delete it manually if needed." -ForegroundColor Yellow

