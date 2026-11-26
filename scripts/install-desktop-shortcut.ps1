$projectRoot = Split-Path -Parent $PSScriptRoot
$launcherPath = Join-Path $PSScriptRoot 'launch-savano-store.ps1'
$desktopDir = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopDir 'Savano Store.lnk'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'powershell.exe'
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcherPath`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = 'Iniciar Savano Store (Expo Metro + Android)'
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,21"
$shortcut.Save()

Write-Host "Atalho criado na Area de Trabalho: $shortcutPath" -ForegroundColor Green
