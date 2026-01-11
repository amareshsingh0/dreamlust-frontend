# Kill process on port 4173
# Run: .\kill-port.ps1

$port = 4173
Write-Host "Checking port $port..." -ForegroundColor Yellow

$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($connections) {
    $processes = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processes) {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Killing process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Red
            Stop-Process -Id $processId -Force
            Write-Host "Process killed" -ForegroundColor Green
        }
    }
} else {
    Write-Host "No process found on port $port" -ForegroundColor Gray
}

Write-Host "`nStarting preview server..." -ForegroundColor Yellow
bun run preview

