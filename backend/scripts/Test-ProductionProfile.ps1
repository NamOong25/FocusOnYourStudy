# Uses the already-built JAR and local PostgreSQL, always in its own disposable schema.
$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path $PSScriptRoot -Parent
$names = @('DB_URL','DB_USER','DB_PASSWORD','SPRING_PROFILES_ACTIVE','JWT_ISSUER',
    'JWT_PRIVATE_KEY_LOCATION','JWT_PUBLIC_KEY_LOCATION','CORS_ALLOWED_ORIGINS',
    'PASSWORD_RESET_ENABLED','FORWARD_HEADERS_STRATEGY','PRODUCTION_QA_SCHEMA')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$server = $null
$qaFolder = $null
$driver = $null
$ownedSchema = $null
$java = (Get-Command java -ErrorAction Stop).Source

function Stop-OwnedQaServer {
    if (!$script:server) { return }
    $script:server.Refresh()
    if (!$script:server.HasExited) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($script:server.Id)"
        if (!$process -or !$process.CommandLine.Contains($script:ownedSchema)) {
            throw 'Refusing to stop a process outside this QA run.'
        }
        Stop-Process -Id $script:server.Id -Force
        [void] $script:server.WaitForExit(10000)
    }
    $script:server = $null
}

function Start-OwnedQaServer([string]$label) {
    $arguments = @('-jar', ('"' + $script:jarCopy + '"'), '--server.address=127.0.0.1', "--server.port=$script:qaPort",
        "--spring.datasource.url=$script:qaDatabase", "--spring.flyway.schemas=$script:ownedSchema",
        "--spring.flyway.default-schema=$script:ownedSchema")
    $script:server = Start-Process -FilePath $script:java -ArgumentList $arguments -WorkingDirectory $script:backendRoot -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $script:backendRoot "target/production9f1-$label.log") `
        -RedirectStandardError (Join-Path $script:backendRoot "target/production9f1-$label-error.log")
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        $script:server.Refresh()
        if ($script:server.HasExited) { throw "QA backend ended. See target/production9f1-$label.log" }
        try {
            $health = Invoke-RestMethod -Uri "$script:qaBase/api/v1/health" -TimeoutSec 2
            if ($health.data.status -eq 'UP' -and $health.data.database -eq 'UP') { return }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    throw 'QA backend did not become ready.'
}

function Invoke-QaApi([string]$method, [string]$path, $body, [string]$token = '') {
    $arguments = @{ Uri = "$script:qaBase$path"; Method = $method; TimeoutSec = 15; Headers = @{} }
    if ($token) { $arguments.Headers.Authorization = 'Bearer ' + $token }
    if ($null -ne $body) {
        $arguments.ContentType = 'application/json; charset=utf-8'
        $arguments.Body = [Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 10 -Compress))
    }
    try { return Invoke-RestMethod @arguments }
    catch { throw "QA API failed at $method $path. See target/production9f1-*.log" }
}

Push-Location $backendRoot
try {
    $jar = 'target/focus-study-backend-0.0.1-SNAPSHOT.jar'
    if (!(Test-Path -LiteralPath $jar)) { throw 'Build the backend JAR before running this smoke test.' }
    . (Join-Path $PSScriptRoot 'Use-LocalDatabase.ps1')
    $driver = Get-ChildItem -LiteralPath '.local/cache' -Filter 'postgresql-*.jar' | Select-Object -First 1
    if (!$driver) { throw 'Run Setup-LocalDatabase.ps1 to prepare the local PostgreSQL JDBC driver.' }
    $ownedSchema = 'qa_prod9f1_' + [guid]::NewGuid().ToString('N')
    $env:PRODUCTION_QA_SCHEMA = $ownedSchema
    $qaFolder = Join-Path $backendRoot ('.local/' + $ownedSchema)
    [void](New-Item -ItemType Directory -Path $qaFolder)
    & $java (Join-Path $PSScriptRoot 'CreateLocalAuthKeys.java') $qaFolder
    if ($LASTEXITCODE -ne 0) { throw 'Cannot create isolated QA signing keys.' }
    $jarCopy = Join-Path $qaFolder 'app.jar'
    Copy-Item -LiteralPath $jar -Destination $jarCopy
    $env:JWT_PRIVATE_KEY_LOCATION = ([uri](Join-Path $qaFolder 'private.pem')).AbsoluteUri
    $env:JWT_PUBLIC_KEY_LOCATION = ([uri](Join-Path $qaFolder 'public.pem')).AbsoluteUri
    $env:JWT_ISSUER = 'https://api.example.test'
    $env:SPRING_PROFILES_ACTIVE = 'prod'
    $env:CORS_ALLOWED_ORIGINS = 'https://app.example.test'
    $env:PASSWORD_RESET_ENABLED = 'false'
    $env:FORWARD_HEADERS_STRATEGY = 'NONE'
    $separator = if ($env:DB_URL.Contains('?')) { '&' } else { '?' }
    $qaDatabase = $env:DB_URL + $separator + 'currentSchema=' + $ownedSchema
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $qaPort = $listener.LocalEndpoint.Port
    $listener.Stop()
    $qaBase = "http://127.0.0.1:$qaPort"

    Start-OwnedQaServer 'first'
    $email = 'production-restart@example.test'
    $password = 'Synthetic-QA-Only-9F1'
    $null = Invoke-QaApi 'POST' '/api/v1/auth/register' @{ email = $email; password = $password; confirmPassword = $password; fullName = 'Kiem tra production' }
    $login = Invoke-QaApi 'POST' '/api/v1/auth/login' @{ email = $email; password = $password }
    $token = $login.data.accessToken
    $semester = Invoke-QaApi 'POST' '/api/v1/semesters' @{ term = 1; startYear = 2026; status = 'CURRENT' } $token
    Stop-OwnedQaServer
    Start-OwnedQaServer 'restart'
    $profile = Invoke-QaApi 'GET' '/api/v1/users/me' $null $token
    if ($profile.data.email -ne $email) { throw 'Session did not survive restart.' }
    $semesters = Invoke-QaApi 'GET' '/api/v1/semesters' $null $token
    if (@($semesters.data).Count -ne 1 -or $semesters.data[0].id -ne $semester.data.id) { throw 'Data did not survive restart.' }
    $refreshed = Invoke-QaApi 'POST' '/api/v1/auth/refresh' @{ refreshToken = $login.data.refreshToken }
    $null = Invoke-QaApi 'GET' '/api/v1/users/me' $null $refreshed.data.accessToken
    & $java -cp $driver.FullName (Join-Path $PSScriptRoot 'ProductionQaDatabase.java') verify
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL QA verification failed.' }
    Write-Host 'PASS production JAR: health, login, persisted semester, same-key restart and refresh.'
} finally {
    try {
        Stop-OwnedQaServer
        if ($driver -and $ownedSchema -match '^qa_prod9f1_[a-f0-9]{32}$') {
            & $java -cp $driver.FullName (Join-Path $PSScriptRoot 'ProductionQaDatabase.java') drop
            if ($LASTEXITCODE -ne 0) { throw 'Own QA schema cleanup failed.' }
        }
    } finally {
        if ($qaFolder) {
            # Delete only explicit files inside this owned QA directory. No recursive removal.
            foreach ($file in @('private.pem','public.pem','app.jar')) {
                $artifact = Join-Path $qaFolder $file
                if (Test-Path -LiteralPath $artifact) { Remove-Item -LiteralPath $artifact }
            }
            if (Test-Path -LiteralPath $qaFolder) { Remove-Item -LiteralPath $qaFolder }
        }
        foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
        Pop-Location
    }
}
