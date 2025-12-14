# Script to keep the backend server running
# This will restart the server if it stops

param(
    [int]$CheckInterval = 10 # Check every 10 seconds
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "Backend Server Monitor" -ForegroundColor Cyan
Write-Host "This script will keep checking and restarting the server if it stops" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = $scriptPath

function Test-Server {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Start-BackendServer {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting server..." -ForegroundColor Yellow
    
    $process = Start-Process -FilePath "bun" -ArgumentList "run", "dev" -WorkingDirectory $backendPath -PassThru -NoNewWindow
    
    # Wait a bit for server to start
    Start-Sleep -Seconds 5
    
    if (Test-Server) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Server started successfully!" -ForegroundColor Green
        return $process
    } else {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Server failed to start. Check for errors above." -ForegroundColor Red
        return $null
    }
}

# Initial start
$serverProcess = Start-BackendServer

if (-not $serverProcess) {
    Write-Host "Failed to start server initially. Exiting." -ForegroundColor Red
    exit 1
}

# Monitor loop
while ($true) {
    Start-Sleep -Seconds $CheckInterval
    
    # Check if process is still running
    if ($serverProcess.HasExited) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Server process stopped (Exit code: $($serverProcess.ExitCode))" -ForegroundColor Yellow
        $serverProcess = Start-BackendServer
    } elseif (-not (Test-Server)) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Server not responding. Restarting..." -ForegroundColor Yellow
        if (-not $serverProcess.HasExited) {
            Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
        $serverProcess = Start-BackendServer
    } else {
        # Server is running fine, just log occasionally
        $timestamp = Get-Date -Format 'HH:mm:ss'
        Write-Host "[$timestamp] Server is running OK" -ForegroundColor DarkGray
    }
}
