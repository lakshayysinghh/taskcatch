# TaskCatch Windows Installer
# Usage: irm https://raw.githubusercontent.com/lakshayysinghh/taskcatch/main/install.ps1 | iex
#
# Downloads the latest TaskCatch release from GitHub Releases, installs it
# silently, then starts the full visual dashboard application.

$ErrorActionPreference = 'Stop'

# --- Config ---------------------------------------------------------------
$Repo        = 'lakshayysinghh/taskcatch'
$Platform    = 'nsis'   # Use NSIS setup.exe (supports /S silent install flag)
$InstallDir  = "$env:LOCALAPPDATA\TaskCatch"

Write-Host ''
Write-Host '  ======================================================' -ForegroundColor DarkGreen
Write-Host '   ⚡ TASKCATCH: UNIVERSAL AI TASK EXTRACTOR INSTALLER  ' -ForegroundColor Green
Write-Host '  ======================================================' -ForegroundColor DarkGreen
Write-Host ''

# --- Pre-flight -----------------------------------------------------------
if (-not [Environment]::Is64BitOperatingSystem) {
    throw 'TaskCatch requires 64-bit Windows 10 or later.'
}

# --- Fetch latest release manifest from GitHub ----------------------------
Write-Host '  > Checking for latest release...' -ForegroundColor Gray
$ManifestUrl = "https://github.com/$Repo/releases/latest/download/latest.json"
$SetupPath   = Join-Path $env:TEMP "TaskCatch_Setup_$([guid]::NewGuid().Guid).exe"

try {
    $manifest = Invoke-RestMethod -Uri $ManifestUrl -UseBasicParsing -ErrorAction Stop
    $version  = $manifest.version
    $dl       = $manifest.platforms."windows-x86_64-$Platform"

    if (-not $dl) {
        # Fallback: try the msi platform key
        $dl = $manifest.platforms.'windows-x86_64'
    }

    if ($dl -and $dl.url) {
        Write-Host "    Found TaskCatch v$version" -ForegroundColor Green
        Write-Host '  > Downloading installer...' -ForegroundColor Gray
        Invoke-WebRequest -Uri $dl.url -OutFile $SetupPath -UseBasicParsing
    } else {
        throw "No matching installer found in release manifest."
    }
} catch {
    # Fallback: direct download from Releases page (for manually uploaded assets)
    Write-Host '  > Fetching installer from GitHub Releases...' -ForegroundColor Gray
    $LatestUrl = "https://github.com/$Repo/releases/latest/download/TaskCatch_Setup.exe"
    try {
        Invoke-WebRequest -Uri $LatestUrl -OutFile $SetupPath -UseBasicParsing
        Write-Host '    Installer downloaded.' -ForegroundColor Green
    } catch {
        Write-Host ''
        Write-Host '  ERROR: Could not download TaskCatch installer.' -ForegroundColor Red
        Write-Host "  Please download it manually from: https://github.com/$Repo/releases/latest" -ForegroundColor Yellow
        Write-Host ''
        exit 1
    }
}

# --- Run silent installer -------------------------------------------------
Write-Host '  > Installing TaskCatch (silent)...' -ForegroundColor Gray
Start-Process -FilePath $SetupPath -ArgumentList '/S' -Wait -PassThru | Out-Null

# Clean up temp installer
Remove-Item $SetupPath -Force -ErrorAction SilentlyContinue

# --- Find installed executable -------------------------------------------
$ExePaths = @(
    "$env:LOCALAPPDATA\Programs\TaskCatch\TaskCatch.exe",
    "$env:PROGRAMFILES\TaskCatch\TaskCatch.exe",
    "$env:PROGRAMFILES(x86)\TaskCatch\TaskCatch.exe",
    (Join-Path $InstallDir 'TaskCatch.exe')
)

$InstalledExe = $ExePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

Write-Host ''
Write-Host '  ✔ TaskCatch installed successfully!' -ForegroundColor Green
Write-Host ''
Write-Host '  ------------------------------------------------------------------' -ForegroundColor DarkGray
Write-Host '   ✨ READY TO USE!' -ForegroundColor White
Write-Host '   👉 The TaskCatch dashboard is launching now...' -ForegroundColor Yellow
Write-Host '   👉 Press [ F9 ] or [ Alt+C ] on highlighted text to capture tasks.' -ForegroundColor Cyan
Write-Host '   👉 Press [ Ctrl+K ] in the dashboard to quick-add via AI.' -ForegroundColor Cyan
Write-Host "   👉 GitHub: https://github.com/$Repo" -ForegroundColor Gray
Write-Host '  ------------------------------------------------------------------' -ForegroundColor DarkGray
Write-Host ''

# --- Launch the visual dashboard ------------------------------------------
if ($InstalledExe) {
    Write-Host "  > Launching $InstalledExe ..." -ForegroundColor Gray
    Start-Process -FilePath $InstalledExe
} else {
    Write-Host '  > TaskCatch installed. Open it from your Start Menu or Desktop shortcut.' -ForegroundColor Yellow
}
