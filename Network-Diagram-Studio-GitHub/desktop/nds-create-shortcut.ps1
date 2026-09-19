$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$distDir = Split-Path -Parent $here
$html = Join-Path $distDir 'index.html'
$icon = Join-Path $here 'NetworkDiagramStudio.ico'

foreach ($required in @($html, $icon)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        throw "Incomplete package: missing $required. Extract the complete release first."
    }
}

function Find-Browser {
    $candidates = @(
        (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
        (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            return $candidate
        }
    }
    return $null
}

$browser = Find-Browser
if (-not $browser) {
    throw 'Microsoft Edge or Google Chrome is required for app-mode shortcuts.'
}

$desktop = [Environment]::GetFolderPath('Desktop')
$startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$pinDir = Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar'
$shell = New-Object -ComObject WScript.Shell
$url = 'file:///' + ($html -replace '\\', '/')

foreach ($folder in @($desktop, $startMenu)) {
    $shortcut = $shell.CreateShortcut((Join-Path $folder 'Network Diagram Studio.lnk'))
    $shortcut.TargetPath = $browser
    $shortcut.Arguments = '--app="' + $url + '" --start-maximized'
    $shortcut.WorkingDirectory = $distDir
    $shortcut.IconLocation = "$icon,0"
    $shortcut.Description = 'Network Diagram Studio'
    $shortcut.WindowStyle = 1
    $shortcut.Save()
}

$pinPath = Join-Path $pinDir 'Network Diagram Studio.lnk'
if (Test-Path -LiteralPath $pinPath -PathType Leaf) {
    $pin = $shell.CreateShortcut($pinPath)
    $pin.TargetPath = $browser
    $pin.Arguments = '--app="' + $url + '" --start-maximized'
    $pin.WorkingDirectory = $distDir
    $pin.IconLocation = "$icon,0"
    $pin.Save()
    Start-Process ie4uinit.exe -ArgumentList '-show' -WindowStyle Hidden -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host '  Done. The shortcut is on your Desktop and in the Start menu.' -ForegroundColor Green
Write-Host ''
