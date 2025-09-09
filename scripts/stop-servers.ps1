# Stop background Next.js servers started by VS Code tasks (Windows PowerShell)
# Kills node processes that are serving .next or Next.js start/dev in this workspace.

$ErrorActionPreference = 'SilentlyContinue'

# Get Node processes for this workspace
$workspace = (Get-Location).Path
$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'node.exe' -and $_.CommandLine -match [Regex]::Escape($workspace) -and ($_.CommandLine -match 'next start' -or $_.CommandLine -match 'next dev' -or $_.CommandLine -match '\\.next') }

if ($procs) {
  foreach ($p in $procs) {
    Write-Host "Stopping PID $($p.ProcessId): $($p.CommandLine)"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
  }
  Write-Host "Stopped $($procs.Count) process(es)."
} else {
  Write-Host "No matching Next.js server processes found for workspace $workspace."
}
