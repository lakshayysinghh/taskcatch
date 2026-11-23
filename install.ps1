# TaskCatch Windows Installer
# Usage: irm https://raw.githubusercontent.com/lakshayysinghh/taskcatch/main/install.ps1 | iex
#
# Finds the latest TaskCatch release through the GitHub API, downloads the
# NSIS setup .exe, verifies its SHA-256 against the digest GitHub publishes for
# the asset, installs it silently, then launches the app.
#
# Everything runs inside a function and failures `return` rather than `exit`:
# under `irm | iex`, `exit` would close the user's PowerShell window.

function Install-TaskCatch {
    $ErrorActionPreference = 'Stop'
    $ProgressPreference    = 'SilentlyContinue'   # the progress bar makes Invoke-WebRequest very slow on PS 5.1

    # Windows PowerShell 5.1 may default to TLS 1.0, which GitHub rejects.
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

    $Repo        = 'lakshayysinghh/taskcatch'
    $ReleasesUrl = "https://github.com/$Repo/releases/latest"

    Write-Host ''
    Write-Host '  ======================================================' -ForegroundColor DarkGreen
    Write-Host '   TASKCATCH: UNIVERSAL AI TASK EXTRACTOR INSTALLER    ' -ForegroundColor Green
    Write-Host '  ======================================================' -ForegroundColor DarkGreen
    Write-Host ''

    function Write-Failure([string]$Message) {
        Write-Host ''
        Write-Host "  ERROR: $Message" -ForegroundColor Red
        Write-Host "  You can download the installer manually from: $ReleasesUrl" -ForegroundColor Yellow
        Write-Host ''
    }

    # --- Pre-flight -------------------------------------------------------
    if (-not [Environment]::Is64BitOperatingSystem) {
        Write-Failure 'TaskCatch requires 64-bit Windows 10 or later.'
        return
    }

    # --- Locate the latest release asset ------------------------------------
    Write-Host '  > Checking for latest release...' -ForegroundColor Gray
    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" `
            -UseBasicParsing -Headers @{ 'User-Agent' = 'TaskCatch-Installer'; 'Accept' = 'application/vnd.github+json' }
    } catch {
        Write-Failure "Could not reach GitHub to find the latest release ($($_.Exception.Message))."
        return
    }

    # Tauri names the NSIS installer TaskCatch_<version>_x64-setup.exe
    $asset = $release.assets | Where-Object { $_.name -like '*_x64-setup.exe' } | Select-Object -First 1
    if (-not $asset) {
        Write-Failure "Release $($release.tag_name) has no Windows x64 setup .exe."
        return
    }

    # GitHub publishes a SHA-256 digest ("sha256:<hex>") for each release asset.
    # Without one there is no way to check the download, so refuse to run it.
    if (-not ($asset.digest -and $asset.digest -like 'sha256:*')) {
        Write-Failure "Release $($release.tag_name) does not publish a SHA-256 checksum for $($asset.name); refusing to install an unverified file."
        return
    }
    $expectedHash = $asset.digest.Substring(7).ToLowerInvariant()

    # --- Download & verify ------------------------------------------------
    $SetupPath = Join-Path $env:TEMP "TaskCatch_Setup_$([guid]::NewGuid().Guid).exe"
    Write-Host "    Found TaskCatch $($release.tag_name)" -ForegroundColor Green
    Write-Host "  > Downloading $($asset.name)..." -ForegroundColor Gray
    try {
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $SetupPath -UseBasicParsing
    } catch {
        Remove-Item $SetupPath -Force -ErrorAction SilentlyContinue
        Write-Failure "Download failed ($($_.Exception.Message))."
        return
    }

    $actualHash = (Get-FileHash -Path $SetupPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $expectedHash) {
        Remove-Item $SetupPath -Force -ErrorAction SilentlyContinue
        Write-Failure "Checksum mismatch for $($asset.name) (expected $expectedHash, got $actualHash). The download was deleted."
        return
    }
    Write-Host '    SHA-256 checksum verified.' -ForegroundColor Green

    # --- Run silent installer -------------------------------------------
    Write-Host '  > Installing TaskCatch (silent)...' -ForegroundColor Gray
    try {
        $proc = Start-Process -FilePath $SetupPath -ArgumentList '/S' -Wait -PassThru
    } finally {
        Remove-Item $SetupPath -Force -ErrorAction SilentlyContinue
    }
    if ($proc.ExitCode -ne 0) {
        Write-Failure "The installer exited with code $($proc.ExitCode)."
        return
    }

    # --- Find installed executable ---------------------------------------
    $ExePaths = @(
        (Join-Path $env:LOCALAPPDATA 'TaskCatch\TaskCatch.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs\TaskCatch\TaskCatch.exe'),
        (Join-Path $env:ProgramFiles 'TaskCatch\TaskCatch.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'TaskCatch\TaskCatch.exe')
    )
    $InstalledExe = $ExePaths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

    Write-Host ''
    Write-Host '  TaskCatch installed successfully!' -ForegroundColor Green
    Write-Host ''
    Write-Host '  ------------------------------------------------------------------' -ForegroundColor DarkGray
    Write-Host '   READY TO USE!' -ForegroundColor White
    Write-Host '   - Highlight text anywhere and press [ F9 ] to capture it as a task.' -ForegroundColor Cyan
    Write-Host '   - Press [ Ctrl+K ] in the dashboard to quick-add a task.' -ForegroundColor Cyan
    Write-Host "   - GitHub: https://github.com/$Repo" -ForegroundColor Gray
    Write-Host '  ------------------------------------------------------------------' -ForegroundColor DarkGray
    Write-Host ''

    # --- Launch ------------------------------------------------------------
    if ($InstalledExe) {
        Write-Host "  > Launching $InstalledExe ..." -ForegroundColor Gray
        Start-Process -FilePath $InstalledExe
    } else {
        Write-Host '  > Open TaskCatch from your Start Menu or Desktop shortcut.' -ForegroundColor Yellow
    }
}

Install-TaskCatch
