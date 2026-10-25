param(
    [ValidateSet('List', 'Get', 'Create', 'Update', 'Delete')][string]$Mode = 'List',
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$ExamId = [guid]::Empty,
    [guid]$CourseId = [guid]::Empty,
    [guid]$SemesterId = [guid]::Empty,
    [string]$Version = '',
    [ValidateSet('MIDTERM', 'FINAL', 'OTHER')][string]$Kind = 'MIDTERM',
    [ValidateSet('WRITTEN', 'MULTIPLE_CHOICE', 'PRACTICAL', 'ORAL', 'ONLINE')][string]$Format = 'WRITTEN',
    [ValidateSet('', 'MIDTERM', 'FINAL', 'OTHER')][string]$FilterKind = '',
    [ValidateSet('', 'WRITTEN', 'MULTIPLE_CHOICE', 'PRACTICAL', 'ORAL', 'ONLINE')][string]$FilterFormat = '',
    [string]$StartsAt = '',
    [string]$EndsAt = '',
    [ValidateLength(1, 100)][string]$TimeZone = 'Asia/Ho_Chi_Minh',
    [ValidateLength(0, 100)][string]$Room = '',
    [switch]$NoReminder,
    [int[]]$ReminderMinutes = @(1440, 180),
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
    if ($CourseId -eq [guid]::Empty -or !(Test-OffsetTime $StartsAt) -or !(Test-OffsetTime $EndsAt)) { throw 'Create/Update cần CourseId, StartsAt và EndsAt có offset, ví dụ 2026-11-10T08:00:00+07:00.' }
    if (!$NoReminder -and ($ReminderMinutes.Count -lt 1 -or $ReminderMinutes.Count -gt 10 -or @($ReminderMinutes | Select-Object -Unique).Count -ne $ReminderMinutes.Count -or @($ReminderMinutes | Where-Object { $_ -lt 0 -or $_ -gt 10080 }).Count)) { throw 'Chọn 1-10 mốc nhắc không trùng, từ 0 đến 10080 phút.' }
    if ($NoReminder -and $PSBoundParameters.ContainsKey('ReminderMinutes') -and $ReminderMinutes.Count) { throw 'NoReminder không đi kèm các mốc ReminderMinutes.' }
}
if ($Mode -in @('Get', 'Update', 'Delete') -and $ExamId -eq [guid]::Empty) { throw 'Cần ExamId từ List/Get.' }
$parsedVersion = [long]0
if ($Mode -in @('Update', 'Delete') -and ($Version -notmatch '^\d+$' -or ![long]::TryParse($Version, [ref]$parsedVersion))) { throw 'Update/Delete cần Version nguyên không âm mới nhất từ List/Get.' }
foreach ($bound in @($From, $To)) { if ($bound -and !(Test-OffsetTime $bound)) { throw 'From/To cần ngày giờ có offset.' } }
function Invoke-ExamApi([string]$Path, [string]$Method, [hashtable]$Payload, [string]$Token) {
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
    $login = Invoke-ExamApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    $points = @($ReminderMinutes)
    if ($NoReminder) { $points = @() }
    $payload = @{ courseId = $CourseId.ToString(); kind = $Kind; format = $Format; startsAt = $StartsAt; endsAt = $EndsAt; timeZone = $TimeZone; room = $Room; reminder = !$NoReminder; reminderMinutes = $points; notes = $Notes }
    switch ($Mode) {
        'List' {
            $query = @()
            if ($CourseId -ne [guid]::Empty) { $query += "courseId=$CourseId" }
            if ($SemesterId -ne [guid]::Empty) { $query += "semesterId=$SemesterId" }
            if ($FilterKind) { $query += "kind=$FilterKind" }
            if ($FilterFormat) { $query += "format=$FilterFormat" }
            if ($From) { $query += 'from=' + [Uri]::EscapeDataString($From) }
            if ($To) { $query += 'to=' + [Uri]::EscapeDataString($To) }
            $path = '/api/v1/exams'
            if ($query.Count) { $path += '?' + ($query -join '&') }
            $result = Invoke-ExamApi $path 'GET' @{} $login.data.accessToken
        }
        'Get' { $result = Invoke-ExamApi "/api/v1/exams/$ExamId" 'GET' @{} $login.data.accessToken }
        'Create' { $result = Invoke-ExamApi '/api/v1/exams' 'POST' $payload $login.data.accessToken }
        'Update' { $payload.version = $parsedVersion; $result = Invoke-ExamApi "/api/v1/exams/$ExamId" 'PUT' $payload $login.data.accessToken }
        'Delete' {
            [void](Invoke-ExamApi "/api/v1/exams/${ExamId}?version=$parsedVersion" 'DELETE' @{} $login.data.accessToken)
            Write-Host 'Đã xóa lịch thi. Môn, bài tập, lịch học và tự học vẫn còn.' -ForegroundColor Green
        }
    }
    if ($Mode -ne 'Delete') { $result | ConvertTo-Json -Depth 6 }
    Write-Host 'Lịch thi lấy từ PostgreSQL. UI nối ở 4H.2; kiểm tra trùng lịch ở 4H.1B.' -ForegroundColor Cyan
} catch {
    $failure = $_; $problem = Read-ApiProblem $failure
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa gọi được API tại $BaseUrl. Kiểm tra backend/cổng. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần thử lịch thi chưa hoàn thành. Kiểm tra List/Get trước khi tự gửi lại thao tác ghi.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-ExamApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
