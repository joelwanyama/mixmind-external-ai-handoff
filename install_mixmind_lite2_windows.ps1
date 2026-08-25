$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
Write-Host ''
Write-Host 'MixMind Lite 2-Stem Installer' -ForegroundColor Cyan
Write-Host 'This downloads two lightweight public models (about 40 MB total).' -ForegroundColor Yellow
Write-Host 'Lite mode creates Vocals + Instrumental only.' -ForegroundColor Yellow
$answer = Read-Host 'Continue? Type YES'
if ($answer -ne 'YES') { Write-Host 'Cancelled.'; exit 0 }

$models = Join-Path $root 'models\lite2'
$vendor = Join-Path $root 'vendor\onnxruntime'
if (!(Test-Path (Join-Path $vendor 'ort.min.js'))) { throw 'ONNX Runtime files are missing. Run the High Quality installer first.' }
New-Item -ItemType Directory -Force -Path $models | Out-Null
$temp = Join-Path $env:TEMP ('mixmind-lite2-' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Force -Path $temp | Out-Null
try {
  $archive = Join-Path $temp 'spleeter-lite2.tar.bz2'
  $url = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/source-separation-models/sherpa-onnx-spleeter-2stems-fp16.tar.bz2'
  Write-Host 'Downloading Lite 2-Stem model package...' -ForegroundColor Cyan
  & curl.exe -L --fail --retry 5 --retry-delay 3 --connect-timeout 30 --max-time 0 -o $archive $url
  if ($LASTEXITCODE -ne 0) { throw 'Lite model download did not finish. Rerun this installer to try again.' }
  Write-Host 'Extracting Lite model files...' -ForegroundColor Cyan
  $extractor = Join-Path $root 'extract_lite2_models.py'
  if (!(Test-Path $extractor)) { throw 'Missing extract_lite2_models.py. Re-copy the Lite update files.' }
  if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 $extractor $archive $models
  } elseif (Get-Command python -ErrorAction SilentlyContinue) {
    & python $extractor $archive $models
  } else {
    throw 'Python is required to extract this Lite model archive. Install Python or use the updated MixMind package.'
  }
  if ($LASTEXITCODE -ne 0) { throw 'Lite model archive extraction failed.' }
  if (!(Test-Path (Join-Path $models 'vocals.onnx')) -or !(Test-Path (Join-Path $models 'instrumental.onnx'))) { throw 'Could not find the expected Lite vocals/accompaniment model files.' }
  $vPath = Join-Path $models 'vocals.onnx'; $iPath = Join-Path $models 'instrumental.onnx'
  $manifest = [ordered]@{
    schemaVersion=1; modelId='spleeter-lite2'; modelVersion='sherpa-onnx-spleeter-2stems-fp16'; mode='lite-2stem'
    runtime=[ordered]@{ortScriptUrl='/vendor/onnxruntime/ort.min.js';wasmBaseUrl='/vendor/onnxruntime/';workerUrl='/mixmind-lite-2stem-worker.js';adapterScriptUrl='/mixmind-lite-2stem-adapter.js'}
    assets=@(
      [ordered]@{url='/models/lite2/vocals.onnx';sha256=(Get-FileHash -Algorithm SHA256 $vPath).Hash.ToLower();bytes=(Get-Item $vPath).Length;role='vocals'},
      [ordered]@{url='/models/lite2/instrumental.onnx';sha256=(Get-FileHash -Algorithm SHA256 $iPath).Hash.ToLower();bytes=(Get-Item $iPath).Length;role='instrumental'}
    )
    adapter=[ordered]@{id='mixmind-spleeter-lite2-v1';sampleRate=44100;nFft=4096;hopLength=1024;frames=512;bins=1024}
  }
  $manifest | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $models 'lite2.manifest.json') -Encoding UTF8
  Write-Host 'Lite 2-Stem installation complete.' -ForegroundColor Green
}
finally { if (Test-Path $temp) { Remove-Item $temp -Recurse -Force } }
