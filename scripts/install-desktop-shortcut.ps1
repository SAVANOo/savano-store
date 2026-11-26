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
$icoPath = Join-Path $projectRoot 'assets\savano-store.ico'
if (Test-Path $icoPath) {
  $shortcut.IconLocation = "$icoPath,0"
} else {
  $shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,21"
}
$shortcut.Save()

Write-Host "Atalho criado na Area de Trabalho: $shortcutPath" -ForegroundColor Green
