Param(
  [string]$Target = 'docs/roadmap/current/phase-2-roadmap.md'
)
$ErrorActionPreference = 'Stop'

Write-Host "Restoring Phase 2 roadmap content..." -ForegroundColor Cyan
$commits = git rev-list HEAD -- docs/phase-2-roadmap.md 2>$null
if(-not $commits){
  Write-Host 'No historical phase-2-roadmap.md found in git history.' -ForegroundColor Red
  exit 1
}
$sourceCommit = ($commits | Select-Object -First 1)
Write-Host "Using source commit: $sourceCommit" -ForegroundColor Cyan
$content = git show "$sourceCommit`:docs/phase-2-roadmap.md" 2>$null
if(-not $content){ Write-Host 'Failed to read file content from commit.' -ForegroundColor Red; exit 2 }
Set-Content -Path $Target -Value $content -Encoding UTF8
Write-Host "Restored content to $Target" -ForegroundColor Green
if(Test-Path 'docs/engineering/ci-cd-review.md'){
  Remove-Item 'docs/engineering/ci-cd-review.md' -Force
  Write-Host 'Removed obsolete docs/engineering/ci-cd-review.md' -ForegroundColor Yellow
}