$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$stamp=Get-Date -Format 'yyyyMMdd_HHmmss'
$dest=Join-Path (Split-Path $root -Parent) ("MixMind_Backups\\Backup_"+$stamp)
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$files=@('index.html','mixmind-canonical-master-renderer.js','mixmind-master-test-binding.js','mixmind-canonical-transition.js','mixmind-transition-qc.js')
foreach($f in $files){$src=Join-Path $root $f;if(Test-Path $src){Copy-Item $src $dest -Force}}
Write-Host "SUCCESS: Backup saved to $dest" -ForegroundColor Green
