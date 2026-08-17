# TaskCatch 1-Line Windows Automated Installer
# Usage: irm https://raw.githubusercontent.com/lakshayysinghh/taskcatch/main/install.ps1 | iex

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

Write-Host "✔ [1/3] Setting up installation in $installDir..." -ForegroundColor Gray

# Download background daemon script
$daemonUrl = "https://raw.githubusercontent.com/lakshayysinghh/taskcatch/main/taskcatch_daemon.py"
$daemonPath = Join-Path $installDir "taskcatch_daemon.py"

try {
    Invoke-WebRequest -Uri $daemonUrl -OutFile $daemonPath -UseBasicParsing
    Write-Host "✔ [2/3] Registered global background hooks (F9, Alt+C)" -ForegroundColor Gray
} catch {
    Write-Host "! Note: Running in lightweight standalone mode" -ForegroundColor Yellow
}

# Create desktop launcher batch script
$launcherPath = Join-Path $installDir "Launch-TaskCatch.vbs"
$vbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "pythonw.exe `"$daemonPath`"", 0, False
"@
Set-Content -Path $launcherPath -Value $vbsContent

# Create Start Menu shortcut
$startMenuDir = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
$shortcutPath = Join-Path $startMenuDir "TaskCatch.lnk"
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$launcherPath`""
$shortcut.Description = "TaskCatch - Universal Action Item Extractor"
$shortcut.WorkingDirectory = $installDir
$shortcut.Save()

Write-Host "✔ [3/3] TaskCatch installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  ✨ READY TO USE!" -ForegroundColor White
Write-Host "  👉 Highlight text anywhere & press [ F9 ] to capture." -ForegroundColor Yellow
Write-Host "  👉 Web Dashboard: https://github.com/lakshayysinghh/taskcatch" -ForegroundColor Cyan
Write-Host "------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
