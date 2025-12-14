# Script to push code to new dreamlust-problem repository

Write-Host ""
Write-Host "Pushing to dreamlust-problem repository" -ForegroundColor Cyan
Write-Host ""

# Check current remote
$currentRemote = git remote get-url origin
Write-Host "Current remote: $currentRemote" -ForegroundColor Yellow
Write-Host ""

# Check if repository exists by trying to fetch
Write-Host "Checking if repository exists..." -ForegroundColor Yellow
$checkRepo = git ls-remote $currentRemote 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Repository exists!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pushing code..." -ForegroundColor Cyan
    
    $currentBranch = git branch --show-current
    Write-Host "Branch: $currentBranch" -ForegroundColor Yellow
    
    git push -u origin $currentBranch
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Successfully pushed to dreamlust-problem repository!" -ForegroundColor Green
        Write-Host "Repository URL: $currentRemote" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "❌ Push failed. Check the error above." -ForegroundColor Red
    }
} else {
    Write-Host "❌ Repository not found on GitHub" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create the repository first:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://github.com/new" -ForegroundColor White
    Write-Host "2. Repository name: dreamlust-problem" -ForegroundColor White
    Write-Host "3. Choose public or private" -ForegroundColor White
    Write-Host "4. DO NOT initialize with README, .gitignore, or license" -ForegroundColor White
    Write-Host "5. Click 'Create repository'" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again:" -ForegroundColor Yellow
    Write-Host "   .\push-to-new-repo.ps1" -ForegroundColor Green
    Write-Host ""
    Write-Host "Or push manually:" -ForegroundColor Yellow
    $currentBranch = git branch --show-current
    Write-Host "   git push -u origin $currentBranch" -ForegroundColor Green
}

Write-Host ""
