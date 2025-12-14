# Comprehensive Backend Server Startup Script
# This script handles all common startup issues

param(
    [switch]$Force,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Dreamlust Backend Server Startup" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Please run this script from the backend directory." -ForegroundColor Red
    exit 1
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Server may fail to start." -ForegroundColor Yellow
    Write-Host "   Create a .env file based on .env.example" -ForegroundColor Yellow
}

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $connection -ne $null
}

# Function to check if server is responding
function Test-Server {
    param([int]$Port)
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Check port 3001
$PORT = 3001
Write-Host "Checking port $PORT..." -ForegroundColor Yellow

if (Test-Port -Port $PORT) {
    Write-Host "   Port $PORT is in use" -ForegroundColor Yellow
    
    if (Test-Server -Port $PORT) {
        Write-Host "   Server is already running and responding!" -ForegroundColor Green
        if (-not $Force) {
            Write-Host ""
            Write-Host "   Server is working. No need to restart." -ForegroundColor Cyan
            Write-Host "   Use -Force to kill and restart anyway." -ForegroundColor Cyan
            Write-Host ""
            exit 0
        } else {
            Write-Host "   Force flag set, will kill and restart..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "   Port is in use but server is not responding" -ForegroundColor Yellow
    }
    
    # Kill process on port 3001
    $connection = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue
    if ($connection) {
        $pid = $connection.OwningProcess
        Write-Host "   Killing process $pid..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "   Process killed" -ForegroundColor Green
    }
} else {
    Write-Host "   Port $PORT is free" -ForegroundColor Green
}

if ($CheckOnly) {
    Write-Host ""
    Write-Host "Check complete. Use without -CheckOnly to start server." -ForegroundColor Green
    Write-Host ""
    exit 0
}

# Check dependencies
Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "   Installing dependencies..." -ForegroundColor Yellow
    bun install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Check Prisma client
Write-Host ""
Write-Host "Checking Prisma client..." -ForegroundColor Yellow
try {
    bunx prisma generate --schema=./prisma/schema.prisma 2>&1 | Out-Null
    Write-Host "   Prisma client is up to date" -ForegroundColor Green
} catch {
    Write-Host "   Warning: Prisma client generation had issues" -ForegroundColor Yellow
}

# Start server
Write-Host ""
Write-Host "Starting server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

try {
    bun run dev
} catch {
    Write-Host ""
    Write-Host "Server failed to start" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Check the error message above for details." -ForegroundColor Yellow
    Write-Host "   Common issues:" -ForegroundColor Yellow
    Write-Host "   - Missing environment variables in .env" -ForegroundColor Yellow
    Write-Host "   - Database connection issues" -ForegroundColor Yellow
    Write-Host "   - Port conflicts" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
