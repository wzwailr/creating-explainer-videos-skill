$ErrorActionPreference = 'Stop'

$packageRoot = Split-Path -Parent $PSScriptRoot
$buildScript = Join-Path $PSScriptRoot 'build-package.mjs'
$cleanSkill = Join-Path $packageRoot 'skill\creating-ai-principle-videos'
$distRoot = Join-Path $packageRoot 'dist'
$destination = Join-Path $distRoot 'creating-ai-principle-videos.skill.zip'

& node $buildScript
if ($LASTEXITCODE -ne 0) {
    throw "Skill payload build failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $cleanSkill -PathType Container)) {
    throw "Clean Skill does not exist: $cleanSkill"
}

New-Item -ItemType Directory -Path $distRoot -Force | Out-Null
Compress-Archive -LiteralPath $cleanSkill -DestinationPath $destination -CompressionLevel Optimal -Force
$entries = tar -tf $destination
$forbidden = @($entries | Where-Object { $_ -match '(^|/)(__pycache__)(/|$)|\.pyc$' })
if ($forbidden.Count -gt 0) {
    throw "ZIP contains generated Python cache: $($forbidden -join ', ')"
}

Write-Output "Built clean Skill ZIP: $destination ($($entries.Count) entries)"
