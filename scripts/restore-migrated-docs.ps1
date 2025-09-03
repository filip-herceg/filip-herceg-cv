Param(
  [int]$SizeThreshold = 500,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# Determine parent commit that still contains the deleted originals
$parent = (git rev-parse HEAD^)
Write-Host "Using parent commit: $parent" -ForegroundColor Cyan

# Helper to fetch file content from parent commit
function Get-OldContent {
  param([string]$OldPath)
  return git show "$parent`:$OldPath" 2>$null
}

# Merge specs: list of groups where multiple legacy sources combine into one target
$mergeGroups = @(
  @{ target = 'docs/engineering/process/ci-cd.md'; sources = @('docs/engineering/ci-cd.md','docs/ci-cd-review.md'); header = '## (Merged ci-cd + review)'; },
  @{ target = 'docs/product/specs/permalink-design.md'; sources = @('docs/product/permalink.md','docs/product/permalink-spec.md'); header = '## (Merged permalink + spec)'; }
)

# Simple one-to-one mappings (skip those handled by mergeGroups)
$mappings = @(
  'docs/contributing.md=docs/contributing/contributing.md',
  'docs/engineering/development.md=docs/engineering/process/development-workflow.md',
  'docs/esm-migration-plan.md=docs/engineering/process/esm-migration-plan.md',
  'docs/refactor-rate-limiter.md=docs/engineering/refactoring/rate-limiter-refactor.md',
  'docs/refactor-plan.md=docs/engineering/refactoring/refactor-program.md',
  'docs/operations/kubernetes.md=docs/operations/platform/kubernetes.md',
  'docs/operations/operations.md=docs/operations/runbooks/operations.md',
  'docs/product/export-matrix.md=docs/product/specs/export-matrix.md',
  'docs/product/i18n-seo-phase2.md=docs/product/specs/i18n-seo-phase2.md',
  'docs/product/search-spec.md=docs/product/specs/search.md',
  'docs/product/taxonomy.md=docs/product/vision/taxonomy.md',
  'docs/product/vision-mission.md=docs/product/vision/vision-mission.md',
  'docs/cv-integration-plan.md=docs/roadmap/plans/cv-integration-plan.md',
  'docs/cv-persistence-i18n-plan.md=docs/roadmap/plans/cv-persistence-i18n-plan.md',
  'docs/f17-retrospective.md=docs/roadmap/retrospectives/f17-retrospective.md',
  'docs/roadmap/history/task-4-permalink-status.md=docs/product/history/task-4-permalink-status.md',
  'docs/roadmap/history/task-6-perf-a11y-budgets.md=docs/product/history/task-6-perf-a11y-budgets.md',
  'docs/roadmap/history/task-7-logging-privacy.md=docs/product/history/task-7-logging-privacy.md'
)

function Restore-OneToOne {
  param([string]$Old,[string]$New)
  if(-not (Test-Path $New)) { return }
  $len = (Get-Item $New).Length
  if($len -ge $SizeThreshold) { return }
  $content = Get-OldContent $Old
  if(-not $content) { Write-Warning "Could not retrieve $Old from $parent"; return }
  if($DryRun){ Write-Host "Would restore $Old -> $New"; return }
  Set-Content -Path $New -Value $content -Encoding UTF8
  Write-Host "Restored $New from $Old" -ForegroundColor Green
}

function Restore-MergeGroup {
  param($Group)
  $target = $Group.target
  if(-not (Test-Path $target)) { return }
  $len = (Get-Item $target).Length
  # Always rebuild if very small; otherwise ensure each source marker appears
  $needs = $len -lt $SizeThreshold
  $existing = Get-Content $target -Raw
  foreach($s in $Group.sources){
    if($existing -notmatch [Regex]::Escape($s)) { $needs = $true }
  }
  if(-not $needs) { return }
  if($DryRun){ Write-Host "Would merge -> $target from $($Group.sources -join ', ')"; return }
  $builder = @()
  # Preserve any YAML front matter already present
  if($existing -match '^(?s)---.*?---\s*'){
    $fm = [Regex]::Match($existing, '^(?s)---.*?---\s*').Value
    $builder += $fm
  }
  $builder += $Group.header
  foreach($s in $Group.sources){
    $srcContent = Get-OldContent $s
    if($srcContent){
      $builder += "\n<!-- Source: $s -->\n"
      $builder += $srcContent
    } else {
      $builder += "\n<!-- Missing source: $s in $parent -->\n"
    }
  }
  Set-Content -Path $target -Value ($builder -join "`n") -Encoding UTF8
  Write-Host "Rebuilt merged doc $target" -ForegroundColor Green
}

# Execute restorations
foreach($m in $mappings){
  $parts = $m.Split('='); Restore-OneToOne -Old $parts[0] -New $parts[1]
}
foreach($g in $mergeGroups){ Restore-MergeGroup -Group $g }

Write-Host 'Restore pass complete.' -ForegroundColor Cyan