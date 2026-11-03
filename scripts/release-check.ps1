$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
npm run check
npm test
npm run smoke:core
npm run smoke:image
npm run smoke:layers
npm run manifest
Write-Host "Release checks passed. Run 1–4 hour acceptance tests on the target Windows/NVIDIA release machine before commercial deployment." -ForegroundColor Green
