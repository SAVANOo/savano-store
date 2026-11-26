param(
  [switch]$Publish,
  [string]$VersionName = "1.0.0",
  [int]$VersionCode = 1
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "1. Validando testes, TypeScript e ESLint..." -ForegroundColor Cyan
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Falha nos testes unitarios" }
npx.cmd tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Falha no tsc" }
npx.cmd expo lint
if ($LASTEXITCODE -ne 0) { throw "Falha no expo lint" }

Write-Host "2. Gerando build nativo Android (assembleRelease)..." -ForegroundColor Cyan
Push-Location (Join-Path $projectRoot 'android')
$env:JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'
.\gradlew.bat assembleRelease --no-daemon
$gradleExit = $LASTEXITCODE
Pop-Location
if ($gradleExit -ne 0) { throw "Falha no Gradle assembleRelease" }

$apkSource = Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path $apkSource)) {
  throw "APK release nao encontrado em $apkSource"
}

$releaseDir = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
$apkName = "savano-store-v$VersionName-universal.apk"
$apkDest = Join-Path $releaseDir $apkName
Copy-Item $apkSource $apkDest -Force

$sha256 = (Get-FileHash $apkDest -Algorithm SHA256).Hash.ToLower()
$sizeBytes = (Get-Item $apkDest).Length

$manifest = [ordered]@{
  packageId = "com.savanostore.app"
  name = "Savano Store"
  tagline = "Loja pessoal Android para distribuir e atualizar seus APKs com SHA-256."
  category = "Utilitários"
  iconUrl = "https://raw.githubusercontent.com/SAVANOo/savano-store/main/assets/icon.png"
  versionName = $VersionName
  versionCode = $VersionCode
  abi = "universal"
  apkFileName = $apkName
  sizeBytes = $sizeBytes
  sha256 = $sha256
  releasedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  minSdkVersion = 24
  changelog = @(
    "Build de release v$VersionName da Savano Store com verificacao SHA-256 e pinning de certificado"
  )
}

$manifestPath = Join-Path $releaseDir 'release-manifest.json'
$manifest | ConvertTo-Json -Depth 4 | Set-Content -Path $manifestPath -Encoding UTF8

Write-Host "✅ APK pronto: $apkDest ($sizeBytes bytes, sha256=$sha256)" -ForegroundColor Green

if ($Publish) {
  $tag = "v$VersionName"
  $gh = "C:\Program Files\GitHub CLI\gh.exe"
  if (-not (Test-Path $gh)) { $gh = "gh" }
  & $gh release create $tag $apkDest $manifestPath --repo SAVANOo/savano-store --title "Savano Store $tag" --notes "Release $tag" --clobber
  if ($LASTEXITCODE -ne 0) {
    & $gh release upload $tag $apkDest $manifestPath --repo SAVANOo/savano-store --clobber
  }
  node scripts/publish-release.mjs --manifest $manifestPath --release-base-url "https://github.com/SAVANOo/savano-store/releases/download/$tag" --apk $apkDest --catalog catalog/catalog.json
}
