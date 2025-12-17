# PowerShell script to restart backend with fresh Prisma client
# This script kills any running node/bun processes and regenerates Prisma client

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend Restart with Prisma Generation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all node and bun processes
Write-Host "Step 1: Stopping all Node.js and Bun processes..." -ForegroundColor Yellow
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "bun" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✓ Processes stopped" -ForegroundColor Green
} catch {
    Write-Host "✓ No processes to stop" -ForegroundColor Green
}
Start-Sleep -Seconds 2

# Step 2: Delete Prisma client directory to clear locks
Write-Host ""
Write-Host "Step 2: Cleaning Prisma client..." -ForegroundColor Yellow
$prismaClientPath = ".\node_modules\.prisma\client"
if (Test-Path $prismaClientPath) {
    Remove-Item -Path $prismaClientPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Prisma client cleared" -ForegroundColor Green
} else {
    Write-Host "✓ No cleanup needed" -ForegroundColor Green
}
Start-Sleep -Seconds 1

# Step 3: Generate Prisma client
Write-Host ""
Write-Host "Step 3: Generating Prisma client..." -ForegroundColor Yellow
try {
    bunx prisma generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Prisma client generated successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Prisma generation failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Error generating Prisma client: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Start the backend server
Write-Host ""
Write-Host "Step 4: Starting backend server..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

bun run dev
