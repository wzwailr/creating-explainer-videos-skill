$ErrorActionPreference = 'Stop'

$packageRoot = Split-Path -Parent $PSScriptRoot
$buildScript = Join-Path $PSScriptRoot 'build-package.mjs'
$cleanSkill = Join-Path $packageRoot 'skill\creating-explainer-videos'
$distRoot = Join-Path $packageRoot 'dist'
$destination = Join-Path $distRoot 'creating-explainer-videos.skill.zip'

& node $buildScript
if ($LASTEXITCODE -ne 0) {
    throw "Skill payload build failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $cleanSkill -PathType Container)) {
    throw "Clean Skill does not exist: $cleanSkill"
}

New-Item -ItemType Directory -Path $distRoot -Force | Out-Null
$temporaryZip = Join-Path $distRoot ('.creating-explainer-videos-' + [guid]::NewGuid().ToString('N') + '.zip')
$skillParent = Split-Path -Parent $cleanSkill
$skillName = Split-Path -Leaf $cleanSkill
& tar -a -cf $temporaryZip --exclude='*/__pycache__/*' --exclude='*.pyc' -C $skillParent $skillName
if ($LASTEXITCODE -ne 0) {
    throw "Skill ZIP creation failed with exit code $LASTEXITCODE"
}
$entries = tar -tf $temporaryZip
$forbidden = @($entries | Where-Object { $_ -match '(^|/)(__pycache__)(/|$)|\.pyc$' })
if ($forbidden.Count -gt 0) {
    throw "ZIP contains generated Python cache: $($forbidden -join ', ')"
}
Move-Item -LiteralPath $temporaryZip -Destination $destination -Force

Write-Output "Built clean Skill ZIP: $destination ($($entries.Count) entries)"
