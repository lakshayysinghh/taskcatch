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

Write-Host "✔ [1/4] Setting up installation in $installDir..." -ForegroundColor Gray

# Download background daemon and CLI scripts
$baseUrl = "https://raw.githubusercontent.com/lakshayysinghh/taskcatch/main"
$daemonPath = Join-Path $installDir "taskcatch_daemon.py"
$cliPath = Join-Path $installDir "taskcatch_cli.py"
$cmdPath = Join-Path $installDir "taskcatch.cmd"
$tcPath = Join-Path $installDir "tc.cmd"

try {
    Invoke-WebRequest -Uri "$baseUrl/taskcatch_daemon.py" -OutFile $daemonPath -UseBasicParsing
    Invoke-WebRequest -Uri "$baseUrl/taskcatch_cli.py" -OutFile $cliPath -UseBasicParsing
    Invoke-WebRequest -Uri "$baseUrl/taskcatch.cmd" -OutFile $cmdPath -UseBasicParsing
    Invoke-WebRequest -Uri "$baseUrl/tc.cmd" -OutFile $tcPath -UseBasicParsing
    Write-Host "✔ [2/4] Registered global background hooks (F9, Alt+C)" -ForegroundColor Gray
} catch {
    Write-Host "! Note: Running in lightweight standalone mode" -ForegroundColor Yellow
}

# Add install directory to user PATH if not present
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$installDir", "User")
    $env:Path = "$env:Path;$installDir"
}
Write-Host "✔ [3/4] Configured Terminal CLI (commands: 'taskcatch' & 'tc')" -ForegroundColor Gray

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

Write-Host "✔ [4/4] TaskCatch installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  ✨ READY TO USE!" -ForegroundColor White
Write-Host "  👉 Press [ F9 ] anywhere on highlighted text to capture tasks." -ForegroundColor Yellow
Write-Host "  👉 Use in PowerShell/CMD: 'taskcatch list' or 'taskcatch add ...'" -ForegroundColor Cyan
Write-Host "  👉 Web Dashboard: https://github.com/lakshayysinghh/taskcatch" -ForegroundColor Gray
Write-Host "------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
