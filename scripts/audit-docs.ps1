Param(
  [int]$SizeThreshold = 150,
  [int]$MinBodyChars = 30
)

$ErrorActionPreference = 'Stop'

Write-Host "Auditing docs/*.md (threshold=$SizeThreshold, minBodyChars=$MinBodyChars)" -ForegroundColor Cyan
$files = Get-ChildItem -Path docs -Recurse -Filter *.md -ErrorAction Stop
$rows = @()
$flags = @()
foreach($f in $files){
  try {
    $raw = Get-Content -Raw -Path $f.FullName -ErrorAction Stop
  } catch {
    Write-Warning "Failed to read $($f.FullName): $($_.Exception.Message)"
    $raw = ''
  }
  if($null -eq $raw){ $raw = '' }
  $len = [text.encoding]::UTF8.GetByteCount($raw)
  $fm = $false; $body = $raw
  if($raw -match '^(?s)---.*?---'){ $fm = $true; $body = [regex]::Replace($raw,'^(?s)---.*?---','') }
  $bodyTrim = ($body -replace '(?s)^\s+|\s+$','')
  $bodyChars = ($bodyTrim -replace '\s','').Length
  $issue = @()
  if($len -lt $SizeThreshold){ $issue += 'SMALL' }
  if($bodyChars -lt $MinBodyChars){ $issue += 'TINY_BODY' }
  if(-not $raw.Trim()){ $issue += 'EMPTY' }
  $issueStr = ($issue -join ',')
  if($issue.Count -gt 0){ $flags += $f.FullName }
  $rows += [pscustomobject]@{ Path=$f.FullName; Bytes=$len; BodyChars=$bodyChars; FM=$fm; Issues=$issueStr }
}

$rows | Sort-Object Issues,Bytes | Format-Table -AutoSize
Write-Host "`nFlagged: $($flags.Count)" -ForegroundColor Yellow
if($flags.Count -gt 0){
  Write-Host 'Flagged file paths:' -ForegroundColor Red
  $flags | ForEach-Object { Write-Host $_ }
  exit 2
} else {
  Write-Host 'All docs pass size/body checks.' -ForegroundColor Green
}