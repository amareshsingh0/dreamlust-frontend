# Script to free port 3001 and restart the backend server

Write-Host "Checking port 3001..." -ForegroundColor Cyan

# Find process using port 3001
$connection = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1

if ($connection) {
    $pid = $connection.OwningProcess
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-Host "Found process using port 3001: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
        
        # Check if server is responding
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 2
            Write-Host "✅ Server is already running and responding!" -ForegroundColor Green
            Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
            exit 0
        } catch {
            Write-Host "Server is not responding. Killing process $pid..." -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Write-Host "✅ Process killed. Port 3001 is now free." -ForegroundColor Green
        }
    }
} else {
    Write-Host "✅ Port 3001 is free." -ForegroundColor Green
}

# Start the server
Write-Host "`nStarting backend server..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
bun run dev
