# PowerShell script to run account deletion processing
# This can be scheduled using Windows Task Scheduler

# Get the script directory
$scriptDir = Split-Path -Parent $PSScriptRoot
$backendDir = Split-Path -Parent $scriptDir

# Change to backend directory
Set-Location $backendDir

# Run the account deletion processing script
bun run src/scripts/processDeletions.ts

# Log the result
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$logMessage = "$timestamp - Account deletion processing completed"
Add-Content -Path "$backendDir\logs\account-deletion.log" -Value $logMessage

