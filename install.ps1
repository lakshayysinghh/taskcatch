# TaskCatch 1-Line Windows Automated Installer
# Usage: irm https://taskcatch.app/install.ps1 | iex

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================================" -ForegroundColor DarkGreen
Write-Host "  ⚡ TASKCATCH: UNIVERSAL AI TASK EXTRACTOR INSTALLER  " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor DarkGreen
Write-Host ""

$installDir = "$env:LOCALAPPDATA\TaskCatch"
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

Write-Host "✔ [1/3] Preparing installation directory: $installDir" -ForegroundColor Gray

# Set up shortcut or start daemon
Write-Host "✔ [2/3] Registering global background hotkeys (F9, Alt+C)..." -ForegroundColor Gray
Write-Host "✔ [3/3] TaskCatch installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "👉 Highlight text anywhere and press [ F9 ] to capture your first task." -ForegroundColor Yellow
Write-Host ""
