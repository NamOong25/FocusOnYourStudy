$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path $PSScriptRoot -Parent
$projectRoot = Split-Path $backendRoot -Parent
$names = @('DB_URL','DB_USER','DB_PASSWORD','JAVA_HOME','PATH','STUDY_PLAN_QA_BASE','STUDY_PLAN_QA_SCHEMA')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$server = $null
$jarCopy = $null
$driver = $null
$result = 1
Push-Location $backendRoot
try {
    if (!(Test-Path -LiteralPath 'target/focus-study-backend-0.0.1-SNAPSHOT.jar')) {
        throw 'Chay scripts/Test-Local.ps1 de kiem thu va dong goi backend truoc.'
    }
    if (Test-Path -LiteralPath 'C:/Program Files/Java/jdk-21/bin/java.exe') {
        $env:JAVA_HOME = 'C:/Program Files/Java/jdk-21'
        $env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
    }
    & (Join-Path $PSScriptRoot 'Setup-LocalDatabase.ps1')
    & (Join-Path $PSScriptRoot 'Setup-LocalAuth.ps1')
    . (Join-Path $PSScriptRoot 'Use-LocalDatabase.ps1')
    $driver = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE '.m2/repository/org/postgresql/postgresql') -Filter 'postgresql-*.jar' -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (!$driver) { throw 'PostgreSQL JDBC driver not found.' }
    $env:STUDY_PLAN_QA_SCHEMA = 'qa_planflow8a3c_' + [guid]::NewGuid().ToString('N')
    # A separate ephemeral port; never restart or borrow the user's port 8080.
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $qaPort = $listener.LocalEndpoint.Port
    $listener.Stop()
    $env:STUDY_PLAN_QA_BASE = "http://127.0.0.1:$qaPort"
    $jarCopy = Join-Path $backendRoot ('.local/' + $env:STUDY_PLAN_QA_SCHEMA + '.jar')
    Copy-Item -LiteralPath 'target/focus-study-backend-0.0.1-SNAPSHOT.jar' -Destination $jarCopy
    $argsList = @('-jar', ('"' + $jarCopy + '"'), '--server.address=127.0.0.1', "--server.port=$qaPort",
        "--spring.datasource.url=$($env:DB_URL)?currentSchema=$($env:STUDY_PLAN_QA_SCHEMA)",
        "--spring.flyway.schemas=$($env:STUDY_PLAN_QA_SCHEMA)", "--spring.flyway.default-schema=$($env:STUDY_PLAN_QA_SCHEMA)",
        '--app.auth.rate-limit.register-per-minute=1000', '--app.auth.rate-limit.login-per-minute=1000')
    $server = Start-Process -FilePath (Get-Command java).Source -ArgumentList $argsList -WorkingDirectory $backendRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput '.local/planflow8a3c-backend.log' -RedirectStandardError '.local/planflow8a3c-backend-error.log'
    $ready = $false
    for ($i = 0; $i -lt 90; $i++) {
        $server.Refresh()
        if ($server.HasExited) { throw 'QA backend stopped. See backend/.local/planflow8a3c-backend.log' }
        try {
            $health = Invoke-RestMethod -Uri "$env:STUDY_PLAN_QA_BASE/api/v1/health" -TimeoutSec 2
            if ($health.data.status -eq 'UP' -and $health.data.database -eq 'UP') { $ready = $true; break }
        } catch { }
        Start-Sleep -Milliseconds 1000
    }
    if (!$ready) { throw 'QA backend did not become ready.' }
    & node --test (Join-Path $projectRoot 'frontend/tests/integration/study-plan-flow.test.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'Plan flow integration tests failed.' }
    & java -cp $driver.FullName (Join-Path $PSScriptRoot 'StudyPlanQaDatabase.java') verify
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL verification failed.' }
    $result = 0
} finally {
    if ($server) {
        $server.Refresh()
        if (!$server.HasExited) {
            $running = Get-CimInstance Win32_Process -Filter "ProcessId=$($server.Id)"
            if (!$running -or !$running.CommandLine.Contains($env:STUDY_PLAN_QA_SCHEMA)) {
                throw 'Refusing to stop a process outside this QA run.'
            }
            Stop-Process -Id $server.Id -Force
            $server.WaitForExit(10000) | Out-Null
        }
    }
    if ($driver -and $env:STUDY_PLAN_QA_SCHEMA -match '^qa_planflow8a3c_[a-f0-9]{32}$') {
        & java -cp $driver.FullName (Join-Path $PSScriptRoot 'StudyPlanQaDatabase.java') drop
        if ($LASTEXITCODE -ne 0) { $result = 1; Write-Warning 'Own QA schema cleanup failed; inspect the QA log.' }
    }
    if ($jarCopy -and (Test-Path -LiteralPath $jarCopy)) { Remove-Item -LiteralPath $jarCopy }
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    Pop-Location
}
if ($result -ne 0) { throw 'Plan flow QA did not finish successfully.' }
