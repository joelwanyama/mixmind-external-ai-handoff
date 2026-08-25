$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$manifestPath = Join-Path $root 'models\htdemucs-4s.manifest.json'
if (!(Test-Path $manifestPath)) { throw 'Could not find models\htdemucs-4s.manifest.json. Run the stem installer first.' }
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$manifest.runtime.ortScriptUrl = '/vendor/onnxruntime/ort.min.js'
$manifest | ConvertTo-Json -Depth 8 | Set-Content $manifestPath -Encoding UTF8
Write-Host 'MixMind model manifest updated for compatible WASM inference.' -ForegroundColor Green
Write-Host 'Restart START_MIXMIND_WINDOWS.bat and refresh Edge with Ctrl+F5.' -ForegroundColor Green
