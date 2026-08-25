$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host ''
Write-Host 'MixMind Local Stem Runtime Installer' -ForegroundColor Cyan
Write-Host 'This downloads approximately 316 MB for the HTDemucs model.' -ForegroundColor Yellow
Write-Host 'Your music never uploads to a server; only public model/runtime files download.' -ForegroundColor Yellow
$answer = Read-Host 'Continue? Type YES'
if ($answer -ne 'YES') { Write-Host 'Cancelled.'; exit 0 }

# Some Windows Desktop/redirected-folder configurations report zero through
# PowerShell's drive APIs even when Explorer shows free space correctly.
# Do not block a valid install on that unreliable probe. The download/write
# itself remains protected by Windows and will report a genuine disk error.
Write-Host 'Storage check: using Windows disk-write protection during download.' -ForegroundColor DarkYellow
Write-Host 'Recommended free space: at least 2 GB.' -ForegroundColor DarkYellow

$vendor = Join-Path $root 'vendor\onnxruntime'
$models = Join-Path $root 'models'
New-Item -ItemType Directory -Force -Path $vendor, $models | Out-Null
$temp = Join-Path $env:TEMP ('mixmind-ort-' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Force -Path $temp | Out-Null

try {
  Write-Host 'Downloading ONNX Runtime Web browser files...' -ForegroundColor Cyan
  $packageInfo = Invoke-RestMethod 'https://registry.npmjs.org/onnxruntime-web/latest'
  $tarball = Join-Path $temp 'onnxruntime-web.tgz'
  Invoke-WebRequest -Uri $packageInfo.dist.tarball -OutFile $tarball
  tar -xzf $tarball -C $temp
  $dist = Join-Path $temp 'package\dist'
  if (!(Test-Path $dist)) { throw 'ONNX Runtime package did not contain dist files.' }
  Copy-Item (Join-Path $dist '*') $vendor -Recurse -Force
  if (!(Test-Path (Join-Path $vendor 'ort.min.js'))) { throw 'ONNX Runtime WebAssembly browser build was not found.' }

  # Pinned public model revision. Do not silently substitute a later model.
  $revision = 'd54ed9eb60e258ea82131c6ee14578628816456a'
  $modelUrl = "https://huggingface.co/StemSplitio/htdemucs-onnx/resolve/$revision/htdemucs.onnx?download=true"
  $modelPath = Join-Path $models 'htdemucs-4s.onnx'
  Write-Host 'Downloading HTDemucs 4-stem model. This can take several minutes...' -ForegroundColor Cyan
  Write-Host 'If the connection drops, rerun this installer; the download will resume.' -ForegroundColor DarkYellow
  $partialModelPath = $modelPath + '.partial'
  if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
    # curl supports resume (-C -), redirects, and retries better than the
    # legacy Windows PowerShell Invoke-WebRequest implementation.
    & curl.exe -L --fail --http1.1 --retry 5 --retry-delay 3 --connect-timeout 30 --max-time 0 -C - -o $partialModelPath $modelUrl
    if ($LASTEXITCODE -ne 0) { throw 'The model download did not finish. Check your connection and rerun the installer to resume.' }
    Move-Item -Force $partialModelPath $modelPath
  } else {
    Invoke-WebRequest -Uri $modelUrl -OutFile $modelPath -TimeoutSec 0
  }
  $hash = (Get-FileHash -Algorithm SHA256 $modelPath).Hash.ToLower()
  $bytes = (Get-Item $modelPath).Length
  if ($bytes -lt 250MB) { throw 'Model download is unexpectedly small; installation stopped.' }

  $manifest = [ordered]@{
    schemaVersion = 1
    modelId = 'htdemucs-4s'
    modelVersion = "StemSplitio-htdemucs-onnx-$($revision.Substring(0,12))-fp32"
    license = 'MIT; retain Demucs/HTDemucs and ONNX-export attribution in product notices'
    source = [ordered]@{ repository='StemSplitio/htdemucs-onnx'; revision=$revision; upstreamFilename='htdemucs.onnx' }
    runtime = [ordered]@{
      ortScriptUrl = '/vendor/onnxruntime/ort.min.js'
      wasmBaseUrl = '/vendor/onnxruntime/'
      workerUrl = '/mixmind-stem-separation-worker.js'
      adapterScriptUrl = '/mixmind-htdemucs-4s-adapter.js'
    }
    runtimeMemoryBytes = 1181116006
    assets = @([ordered]@{ url='/models/htdemucs-4s.onnx'; sha256=$hash; bytes=$bytes; role='model' })
    adapter = [ordered]@{
      id='mixmind-htdemucs-4s-onnx-v1'; sampleRate=44100; segmentSamples=343980
      inputName='mix'; outputName='stems'; inputShape=@(1,2,343980); outputShape=@(1,4,2,343980)
      stemNames=@('drums','bass','other','vocals')
    }
  }
  $manifest | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $models 'htdemucs-4s.manifest.json') -Encoding UTF8
  Write-Host ''
  Write-Host 'Installation complete.' -ForegroundColor Green
  Write-Host "Model size: $([math]::Round($bytes / 1MB, 1)) MB"
  Write-Host "SHA-256: $hash"
  Write-Host 'Restart the MixMind local server, refresh Edge with Ctrl+F5, then use Prepare Stems.' -ForegroundColor Green
}
finally {
  if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
}
