$ErrorActionPreference = 'SilentlyContinue'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Stop-PortProcess($port) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($conn in $conns) {
    if ($conn.OwningProcess -and $conn.OwningProcess -gt 0) {
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
}

Stop-PortProcess 8081
Start-Sleep -Milliseconds 400

Start-Process -FilePath 'npx.cmd' -ArgumentList 'expo', 'start', '--clear', '--android' -WorkingDirectory $projectRoot

$lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress

Clear-Host
Write-Host ''
Write-Host '  ============================================================' -ForegroundColor DarkGreen
Write-Host '                  SAVANO STORE - AMBIENTE ATIVO               ' -ForegroundColor White
Write-Host '  ============================================================' -ForegroundColor DarkGreen
Write-Host '  Catalogo Live  : https://savanoo.github.io/savano-store/catalog/catalog.json' -ForegroundColor Cyan
if ($lanIp) {
  Write-Host "  Expo (Celular) : exp://${lanIp}:8081  (ou aperte 'a' no Metro)" -ForegroundColor Yellow
}
Write-Host '  ============================================================' -ForegroundColor DarkGreen
Write-Host ''
Read-Host '  Pressione Enter para fechar este painel (o Metro continua rodando)'
