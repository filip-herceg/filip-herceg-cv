Param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$legacyPaths = @(
    'docs/contributing.md',
    'docs/product/vision-mission.md',
    'docs/product/taxonomy.md',
    'docs/product/search-spec.md',
    'docs/product/permalink-spec.md',
    'docs/product/permalink.md',
    'docs/product/export-matrix.md',
    'docs/product/i18n-seo-phase2.md',
    'docs/product/export-matrix-old.md',
    'docs/engineering/development.md',
    'docs/engineering/ci-cd.md',
    'docs/ci-cd-review.md',
    'docs/refactor-plan.md',
    'docs/refactor-rate-limiter.md',
    'docs/esm-migration-plan.md',
    'docs/operations/operations.md',
    'docs/operations/kubernetes.md',
    'docs/phase-2-roadmap.md',
    'docs/f17-retrospective.md',
    'docs/cv-integration-plan.md',
    'docs/cv-persistence-i18n-plan.md',
    'docs/_delete-test.md',
    'docs/legacy-aliases.md' # moved to meta/
    # Newly added architecture duplicates
    'docs/architecture/architecture.md',
    'docs/architecture/persistence.md',
    'docs/architecture/admin.md',
    'docs/architecture/observability.md',
    # Roadmap history tasks now under product/history
    'docs/roadmap/history/task-4-permalink-status.md',
    'docs/roadmap/history/task-6-perf-a11y-budgets.md',
    'docs/roadmap/history/task-7-logging-privacy.md'
)

$removed = @()
foreach ($p in $legacyPaths) {
    $full = Join-Path -Path $PSScriptRoot -ChildPath '..' | Join-Path -ChildPath $p
    if (Test-Path $full) {
        if ($DryRun) {
            Write-Host "Would remove $p"
        } else {
            Remove-Item $full -Force
            Write-Host "Removed $p"
            $removed += $p
        }
    }
}

if (-not $DryRun) {
    if ($removed.Count -eq 0) {
        Write-Host 'No legacy files removed.'
    } else {
        Write-Host "Removed $($removed.Count) legacy files." -ForegroundColor Green
    }
}
