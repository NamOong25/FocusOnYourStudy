param([ValidateRange(1024, 65535)][int]$Port = 55432)
$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path $PSScriptRoot -Parent
$localRoot = Join-Path $backendRoot '.local'
$binRoot = Join-Path $localRoot 'postgres-17.11.0'
$dataRoot = Join-Path $localRoot 'data'
$settingsPath = Join-Path $localRoot 'database.json'
$archiveRoot = Join-Path $localRoot 'cache'
New-Item -ItemType Directory -Path $localRoot, $archiveRoot -Force | Out-Null

if (!(Test-Path -LiteralPath (Join-Path $binRoot 'bin\postgres.exe'))) {
    $url = 'https://repo.maven.apache.org/maven2/io/zonky/test/postgres/embedded-postgres-binaries-windows-amd64/17.11.0/embedded-postgres-binaries-windows-amd64-17.11.0.jar'
    $expectedHash = '98040fae18dd9633ff95932125b0cecf0a45a1a9312e216e2a33ad03a31d4251'
    $archive = Join-Path $archiveRoot 'postgres-17.11.0.jar'
    if (!(Test-Path -LiteralPath $archive)) {
        Write-Host 'Đang tải PostgreSQL portable 17.11.0 từ Maven Central...'
        Invoke-WebRequest -Uri $url -OutFile $archive -UseBasicParsing
    }
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) {
        throw 'Checksum PostgreSQL không khớp. Không giải nén hoặc chạy file này.'
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($archive)
    try {
        $entry = $zip.GetEntry('postgres-windows-x86_64.txz')
        if (!$entry) { throw 'Gói PostgreSQL không có archive Windows mong đợi.' }
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $archiveRoot 'postgres.txz'), $true)
    } finally { $zip.Dispose() }
    New-Item -ItemType Directory -Path $binRoot -Force | Out-Null
    & tar.exe -xf (Join-Path $archiveRoot 'postgres.txz') -C $binRoot
    if ($LASTEXITCODE -ne 0) { throw 'Không giải nén được PostgreSQL. Máy cần tar.exe hỗ trợ xz (Windows 10/11).' }
}

if (Test-Path -LiteralPath $settingsPath) {
    $settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
    if (!$PSBoundParameters.ContainsKey('Port')) { $Port = [int]$settings.port }
    if ($settings.port -ne $Port) { throw "Database đã được cấu hình cổng $($settings.port). Dùng -Port $($settings.port)." }
} else {
    if (Test-Path -LiteralPath (Join-Path $dataRoot 'PG_VERSION')) { throw 'Có data nhưng thiếu thông tin kết nối; không ghi đè data.' }
    $settings = [pscustomobject]@{ port = $Port; username = 'focus_study'; password = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')) }
    $settings | ConvertTo-Json | Set-Content -LiteralPath $settingsPath -Encoding UTF8
}

if (!(Test-Path -LiteralPath (Join-Path $dataRoot 'PG_VERSION'))) {
    $passwordFile = Join-Path $localRoot 'init-password.txt'
    try {
        [IO.File]::WriteAllText($passwordFile, $settings.password, [Text.UTF8Encoding]::new($false))
        & (Join-Path $binRoot 'bin\initdb.exe') -D $dataRoot -U $settings.username -A scram-sha-256 --encoding=UTF8 --locale=C "--pwfile=$passwordFile"
        if ($LASTEXITCODE -ne 0) { throw 'initdb không thành công; kiểm tra thông báo phía trên.' }
    } finally { if (Test-Path -LiteralPath $passwordFile) { Remove-Item -LiteralPath $passwordFile } }
    @("listen_addresses = '127.0.0.1'", "port = $Port", "timezone = 'Asia/Ho_Chi_Minh'", "log_timezone = 'UTC'") |
        Add-Content -LiteralPath (Join-Path $dataRoot 'postgresql.conf') -Encoding UTF8
}

& (Join-Path $binRoot 'bin\pg_ctl.exe') status -D $dataRoot *> $null
if ($LASTEXITCODE -ne 0) {
    $arguments = "start -D `"$dataRoot`" -l `"$(Join-Path $localRoot 'postgresql.log')`" -w -t 30"
    $started = Start-Process -FilePath (Join-Path $binRoot 'bin\pg_ctl.exe') -ArgumentList $arguments -WindowStyle Hidden -PassThru
    # Start-Process -Wait would wait for the long-lived PostgreSQL child too.
    if (!$started.WaitForExit(35000)) { throw 'pg_ctl chưa trả kết quả trong 35 giây. Kiểm tra .local/postgresql.log.' }
    if ($started.ExitCode -ne 0) { throw "Không khởi động được PostgreSQL. Xem $localRoot\postgresql.log; có thể cổng $Port đang bận." }
}

$driver = Join-Path $archiveRoot 'postgresql-42.7.13.jar'
if (!(Test-Path -LiteralPath $driver)) {
    Invoke-WebRequest 'https://repo.maven.apache.org/maven2/org/postgresql/postgresql/42.7.13/postgresql-42.7.13.jar' -OutFile $driver -UseBasicParsing
}
if ((Get-FileHash -LiteralPath $driver -Algorithm SHA256).Hash.ToLowerInvariant() -ne '6e0e4cc2d8cae902084f8a2b18728b073a6fd9d1f87c9d8bff8f298c18185b93') {
    throw 'Checksum driver JDBC không khớp. Không chạy driver này.'
}
. (Join-Path $PSScriptRoot 'Use-LocalDatabase.ps1')
& java -cp $driver (Join-Path $PSScriptRoot 'CreateLocalDatabase.java') $Port
if ($LASTEXITCODE -ne 0) { throw 'Không xác minh hoặc tạo được database focus_study.' }
Write-Host "PostgreSQL sẵn sàng tại 127.0.0.1:$Port / focus_study. Thông tin kết nối nằm trong .local (Git bỏ qua)."
