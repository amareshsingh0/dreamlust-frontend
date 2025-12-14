# Script to set up new remote repository: dreamlust-problem

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsername,
    
    [string]$RepoName = "dreamlust-problem"
)

Write-Host ""
Write-Host "Setting up new remote repository: $RepoName" -ForegroundColor Cyan
Write-Host ""

# Check if repository exists on GitHub (basic check)
$repoUrl = "https://github.com/$GitHubUsername/$RepoName"
Write-Host "Repository URL: $repoUrl" -ForegroundColor Yellow
Write-Host ""

# Update remote URL
Write-Host "Updating remote URL..." -ForegroundColor Yellow
git remote set-url origin $repoUrl

# Verify
Write-Host ""
Write-Host "Verifying remote..." -ForegroundColor Yellow
git remote -v

Write-Host ""
Write-Host "✅ Remote updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure the repository '$RepoName' exists on GitHub" -ForegroundColor White
Write-Host "2. Push your code:" -ForegroundColor White
Write-Host "   git push -u origin trial" -ForegroundColor Green
Write-Host ""
Write-Host "Or create a main branch:" -ForegroundColor White
Write-Host "   git checkout -b main" -ForegroundColor Green
Write-Host "   git push -u origin main" -ForegroundColor Green
Write-Host ""
