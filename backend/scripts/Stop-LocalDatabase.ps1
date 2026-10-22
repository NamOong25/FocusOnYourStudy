$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path $PSScriptRoot -Parent
$pgCtl = Join-Path $backendRoot '.local\postgres-17.11.0\bin\pg_ctl.exe'
$dataRoot = Join-Path $backendRoot '.local\data'
if (!(Test-Path -LiteralPath $pgCtl)) { Write-Host 'Chưa có PostgreSQL cục bộ.'; return }
& $pgCtl status -D $dataRoot *> $null
if ($LASTEXITCODE -eq 0) {
    & $pgCtl stop -D $dataRoot -m fast -w -t 30
    if ($LASTEXITCODE -ne 0) { throw 'Chưa dừng được PostgreSQL.' }
} else { Write-Host 'PostgreSQL cục bộ đã dừng.' }
