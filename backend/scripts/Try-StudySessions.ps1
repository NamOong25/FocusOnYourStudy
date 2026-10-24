param(
    [ValidateSet('List', 'Get', 'Create', 'Update', 'Delete')][string]$Mode = 'List',
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$StudySessionId = [guid]::Empty,
    [guid]$CourseId = [guid]::Empty,
    [guid]$SemesterId = [guid]::Empty,
    [guid]$AssignmentId = [guid]::Empty,
    [string]$Version = '',
    [ValidateLength(0, 200)][string]$Title = '',
    [string]$StartsAt = '',
    [ValidateLength(1, 100)][string]$TimeZone = 'Asia/Ho_Chi_Minh',
    [ValidateRange(1, 240)][int]$DurationMinutes = 45,
    [ValidateSet('PLANNED', 'IN_PROGRESS', 'COMPLETED')][string]$Status = 'PLANNED',
    [ValidateSet('', 'PLANNED', 'IN_PROGRESS', 'COMPLETED')][string]$FilterStatus = '',
    [ValidateLength(0, 5000)][string]$Notes = '',
    [string]$From = '',
    [string]$To = ''
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
function Test-OffsetTime([string]$Value) {
    $parsed = [DateTimeOffset]::MinValue
    return $Value -match 'T.*(Z|[+-]\d{2}:\d{2})$' -and [DateTimeOffset]::TryParse($Value, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None, [ref]$parsed)
}
if ($Mode -in @('Create', 'Update')) {
    if ($CourseId -eq [guid]::Empty -or !$Title.Trim() -or !(Test-OffsetTime $StartsAt)) {
        throw 'Create/Update cần CourseId, Title và StartsAt có ngày/giờ/múi giờ, ví dụ 2026-10-30T19:00:00+07:00.'
    }
}
if ($Mode -in @('Get', 'Update', 'Delete') -and $StudySessionId -eq [guid]::Empty) { throw 'Cần StudySessionId từ List/Get.' }
$parsedVersion = [long]0
if ($Mode -in @('Update', 'Delete') -and ($Version -notmatch '^\d+$' -or ![long]::TryParse($Version, [ref]$parsedVersion))) { throw 'Update/Delete cần Version nguyên không âm mới nhất từ List/Get.' }
foreach ($bound in @($From, $To)) { if ($bound -and !(Test-OffsetTime $bound)) { throw 'From/To cần ngày giờ có múi giờ; app không tự đoán ngày hoặc múi giờ.' } }
function Invoke-StudyApi([string]$Path, [string]$Method, [hashtable]$Payload, [string]$Token) {
    $arguments = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = @{}; TimeoutSec = 15 }
    if ($Token) { $arguments.Headers.Authorization = "Bearer $Token" }
    if ($Path.StartsWith('/api/v1/auth/')) { $arguments.Headers['X-Auth-Transport'] = 'body' }
    if ($Method -in @('POST', 'PUT')) {
        $arguments.ContentType = 'application/json; charset=utf-8'
        $arguments.Body = [Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Compress))
    }
    Invoke-RestMethod @arguments
}
$password = $null; $login = $null; $secret = $null
try {
    $email = Read-Host 'Email tài khoản đã đăng ký'
    $secret = Read-Host 'Mật khẩu (nhập ẩn)' -AsSecureString
    $password = [Net.NetworkCredential]::new('', $secret).Password
    $login = Invoke-StudyApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    $link = $null
    if ($AssignmentId -ne [guid]::Empty) { $link = $AssignmentId.ToString() }
    $payload = @{ courseId = $CourseId.ToString(); assignmentId = $link; title = $Title; startsAt = $StartsAt; timeZone = $TimeZone; durationMinutes = $DurationMinutes; status = $Status; notes = $Notes }
    switch ($Mode) {
        'List' {
            $query = @()
            if ($CourseId -ne [guid]::Empty) { $query += "courseId=$CourseId" }
            if ($SemesterId -ne [guid]::Empty) { $query += "semesterId=$SemesterId" }
            if ($AssignmentId -ne [guid]::Empty) { $query += "assignmentId=$AssignmentId" }
            if ($FilterStatus) { $query += "status=$FilterStatus" }
            if ($From) { $query += 'from=' + [Uri]::EscapeDataString($From) }
            if ($To) { $query += 'to=' + [Uri]::EscapeDataString($To) }
            $path = '/api/v1/study-sessions'
            if ($query.Count) { $path += '?' + ($query -join '&') }
            $result = Invoke-StudyApi $path 'GET' @{} $login.data.accessToken
        }
        'Get' { $result = Invoke-StudyApi "/api/v1/study-sessions/$StudySessionId" 'GET' @{} $login.data.accessToken }
        'Create' { $result = Invoke-StudyApi '/api/v1/study-sessions' 'POST' $payload $login.data.accessToken }
        'Update' {
            $payload.version = $parsedVersion
            $result = Invoke-StudyApi "/api/v1/study-sessions/$StudySessionId" 'PUT' $payload $login.data.accessToken
        }
        'Delete' {
            [void](Invoke-StudyApi "/api/v1/study-sessions/${StudySessionId}?version=$parsedVersion" 'DELETE' @{} $login.data.accessToken)
            Write-Host 'Đã xóa buổi tự học. Bài tập, môn và học kỳ vẫn còn.' -ForegroundColor Green
        }
    }
    if ($Mode -ne 'Delete') { $result | ConvertTo-Json -Depth 6 }
    Write-Host 'Buổi tự học lấy từ PostgreSQL. Giao diện tự học sẽ nối API ở đợt 4D.' -ForegroundColor Cyan
} catch {
    $failure = $_; $problem = Read-ApiProblem $failure
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa gọi được API tại $BaseUrl. Kiểm tra backend/cổng. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần thử buổi tự học chưa hoàn thành. Kiểm tra List/Get trước khi tự gửi lại thao tác ghi.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-StudyApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
