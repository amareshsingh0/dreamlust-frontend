# Script to fix test setup in backend repo's frontend folder
# Run this from the dreamlust-project root directory

Write-Host "🔧 Fixing backend repo frontend test files..." -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "frontend/src/test/setup.ts")) {
    Write-Host "❌ Error: frontend/src/test/setup.ts not found. Run this from dreamlust-project root." -ForegroundColor Red
    exit 1
}

# Check if backend repo exists
$backendRepoPath = "..\dreamlust-backend"
if (-not (Test-Path $backendRepoPath)) {
    Write-Host "⚠️  Backend repo not found at $backendRepoPath" -ForegroundColor Yellow
    Write-Host "📋 Please clone it first:" -ForegroundColor Yellow
    Write-Host "   cd .." -ForegroundColor Gray
    Write-Host "   git clone https://github.com/amareshsingh0/dreamlust-backend.git" -ForegroundColor Gray
    exit 1
}

# Check if frontend folder exists in backend repo
$backendFrontendPath = Join-Path $backendRepoPath "frontend"
if (-not (Test-Path $backendFrontendPath)) {
    Write-Host "⚠️  Frontend folder not found in backend repo" -ForegroundColor Yellow
    Write-Host "📋 The backend repo might not have a frontend folder." -ForegroundColor Yellow
    Write-Host "   If CI is using backend repo, you may need to:" -ForegroundColor Yellow
    Write-Host "   1. Update CI workflow to use dreamlust-frontend repo instead" -ForegroundColor Yellow
    Write-Host "   2. Or create frontend folder in backend repo" -ForegroundColor Yellow
    exit 1
}

# Copy fixed files
Write-Host "📁 Copying fixed test files..." -ForegroundColor Cyan

$filesToCopy = @(
    @{ Source = "frontend/src/test/setup.ts"; Dest = "frontend/src/test/setup.ts" },
    @{ Source = "frontend/src/test/a11y.tsx"; Dest = "frontend/src/test/a11y.tsx" },
    @{ Source = "frontend/eslint.config.js"; Dest = "frontend/eslint.config.js" }
)

foreach ($file in $filesToCopy) {
    $sourcePath = $file.Source
    $destPath = Join-Path $backendRepoPath $file.Dest
    
    if (Test-Path $sourcePath) {
        $destDir = Split-Path $destPath -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "   ✅ Copied $($file.Source) -> $($file.Dest)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Source file not found: $sourcePath" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. cd $backendRepoPath" -ForegroundColor Gray
Write-Host "   2. git add frontend/src/test/setup.ts frontend/src/test/a11y.tsx frontend/eslint.config.js" -ForegroundColor Gray
Write-Host "   3. git commit -m 'Fix vitest-axe import issue in frontend tests'" -ForegroundColor Gray
Write-Host "   4. git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Files copied! Now commit and push to backend repo." -ForegroundColor Green

