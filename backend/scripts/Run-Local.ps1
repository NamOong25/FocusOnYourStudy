$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path $PSScriptRoot -Parent
& (Join-Path $PSScriptRoot 'Setup-LocalDatabase.ps1')
. (Join-Path $PSScriptRoot 'Use-LocalDatabase.ps1')
Push-Location $backendRoot
try {
    & .\mvnw.cmd -B -ntp spring-boot:run
    if ($LASTEXITCODE -ne 0) { throw 'Backend chưa khởi động được. Kiểm tra log phía trên.' }
} finally { Pop-Location }
