$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot 'index.html'
if (-not (Test-Path $path)) { throw "index.html was not found beside this script." }

$old = "if(window.MixMindCanonicalMasterTest){window.MixMindCanonicalMasterTest.test()}else if(window.showToast){window.showToast('Canonical Master test module is not loaded.','error')}"
$new = "if(!window.MixMindCanonicalMasterRenderer||!window.timeline||timeline.length!==2){showToast&&showToast('Canonical Master test requires exactly two timeline songs and the renderer.','error')}else{window.MixMindCanonicalMasterRenderer.playTwoTracks(timeline,transitions,{forceMaster:true}).then(function(r){showToast&&showToast(r?'Testing canonical Master plan.':'Canonical Master test could not start.',r?'success':'error')}).catch(function(e){showToast&&showToast(e.message,'error')})}"

$text = [System.IO.File]::ReadAllText($path)
if ($text.Contains($new)) {
  Write-Host "SUCCESS: Direct Master renderer button is already installed." -ForegroundColor Green
  exit 0
}
if (-not $text.Contains($old)) {
  throw "The expected old button text was not found. No change was made."
}

Copy-Item $path "$path.before_master_button_fix.bak" -Force
$text = $text.Replace($old, $new)
[System.IO.File]::WriteAllText($path, $text, [System.Text.UTF8Encoding]::new($false))
Write-Host "SUCCESS: Updated the real index.html beside this script." -ForegroundColor Green
Write-Host "Backup created: index.html.before_master_button_fix.bak"
