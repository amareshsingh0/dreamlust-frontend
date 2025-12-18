# PowerShell script to clean and rebuild frontend
# Run: .\CLEAN_BUILD.ps1

Write-Host "🧹 Cleaning build artifacts..." -ForegroundColor Yellow

# Remove dist folder
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "✅ Removed dist folder" -ForegroundColor Green
} else {
    Write-Host "ℹ️  dist folder not found" -ForegroundColor Gray
}

# Remove Vite cache
if (Test-Path "node_modules\.vite") {
    Remove-Item -Recurse -Force "node_modules\.vite"
    Write-Host "✅ Removed Vite cache" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Vite cache not found" -ForegroundColor Gray
}

Write-Host "`n🔨 Building frontend..." -ForegroundColor Yellow
bun run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Build successful!" -ForegroundColor Green
    Write-Host "`n🚀 Starting preview server..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
    bun run preview
} else {
    Write-Host "`n❌ Build failed!" -ForegroundColor Red
    exit 1
}

