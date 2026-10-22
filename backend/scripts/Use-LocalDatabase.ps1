$backendRoot = Split-Path $PSScriptRoot -Parent
$settingsPath = Join-Path $backendRoot '.local\database.json'
if (!(Test-Path -LiteralPath $settingsPath)) {
    throw 'Chưa có database cục bộ. Chạy .\scripts\Setup-LocalDatabase.ps1 trước.'
}
$localDatabase = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
$env:DB_URL = "jdbc:postgresql://127.0.0.1:$($localDatabase.port)/focus_study"
$env:DB_USER = $localDatabase.username
$env:DB_PASSWORD = $localDatabase.password
