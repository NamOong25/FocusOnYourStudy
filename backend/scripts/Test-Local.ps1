$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path $PSScriptRoot -Parent
& (Join-Path $PSScriptRoot 'Setup-LocalDatabase.ps1')
. (Join-Path $PSScriptRoot 'Use-LocalDatabase.ps1')
$env:TEST_DB_URL = $env:DB_URL
$env:TEST_DB_USER = $env:DB_USER
$env:TEST_DB_PASSWORD = $env:DB_PASSWORD
Push-Location $backendRoot
try {
    & .\mvnw.cmd -B -ntp verify
    if ($LASTEXITCODE -ne 0) { throw 'Kiểm thử backend chưa qua. Xem target/surefire-reports.' }
} finally { Pop-Location }
