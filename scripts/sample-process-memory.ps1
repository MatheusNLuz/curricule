param([int]$Port = 3003, [int]$Seconds = 12)
$ErrorActionPreference = 'Stop'
$serverProcessId = (Get-NetTCPConnection -LocalPort $Port -State Listen | Select-Object -First 1).OwningProcess
if (-not $serverProcessId) { throw 'Local validation server not running' }
$watch = [Diagnostics.Stopwatch]::StartNew()
while ($watch.Elapsed.TotalSeconds -lt $Seconds) {
  $all = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId)
  $family = [Collections.Generic.HashSet[int]]::new()
  [void]$family.Add([int]$serverProcessId)
  do {
    $added = $false
    foreach ($entry in $all) {
      if ($family.Contains([int]$entry.ParentProcessId) -and $family.Add([int]$entry.ProcessId)) { $added = $true }
    }
  } while ($added)
  $processes = @(Get-Process -Id @($family) -ErrorAction SilentlyContinue)
  $nodeBytes = ($processes | Where-Object ProcessName -eq 'node' | Measure-Object WorkingSet64 -Sum).Sum
  $browser = @($processes | Where-Object ProcessName -in @('chrome','msedge','chromium','headless_shell'))
  $browserBytes = ($browser | Measure-Object WorkingSet64 -Sum).Sum
  [pscustomobject]@{ elapsedMs = [int]$watch.Elapsed.TotalMilliseconds; nodeBytes = [long]$nodeBytes; browserBytes = [long]$browserBytes; browserProcesses = $browser.Count } | ConvertTo-Json -Compress
  Start-Sleep -Milliseconds 200
}
