param(
    [ValidateSet('List', 'Get', 'Occurrences', 'Create', 'Update', 'Delete')][string]$Mode = 'List',
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$ClassScheduleId = [guid]::Empty,
    [guid]$CourseId = [guid]::Empty,
    [guid]$SemesterId = [guid]::Empty,
    [string]$Version = '',
    [ValidateCount(1, 7)][ValidateRange(1, 7)][int[]]$Weekdays = @(1, 3),
    [string]$StartsOn = '',
    [string]$EndsOn = '',
    [string]$StartTime = '07:00',
    [string]$EndTime = '09:00',
    [ValidateLength(1, 100)][string]$TimeZone = 'Asia/Ho_Chi_Minh',
    [ValidateLength(0, 100)][string]$Room = '',
    [ValidateLength(0, 200)][string]$Teacher = '',
    [ValidateRange(0, 10080)][int]$ReminderMinutes = 15,
    [ValidateLength(0, 5000)][string]$Notes = '',
    [string]$From = '',
    [string]$To = ''
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
function Test-LocalDate([string]$Value) {
    $parsed = [datetime]::MinValue
    return [datetime]::TryParseExact($Value, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None, [ref]$parsed)
}
if ($Mode -in @('Create', 'Update')) {
    if ($CourseId -eq [guid]::Empty -or !(Test-LocalDate $StartsOn) -or !(Test-LocalDate $EndsOn) -or $StartTime -notmatch '^([01]\d|2[0-3]):[0-5]\d$' -or $EndTime -notmatch '^([01]\d|2[0-3]):[0-5]\d$') {
        throw 'Create/Update cần CourseId, StartsOn/EndsOn dạng YYYY-MM-DD và StartTime/EndTime dạng HH:mm.'
    }
}
if ($Mode -in @('Get', 'Update', 'Delete') -and $ClassScheduleId -eq [guid]::Empty) { throw 'Cần ClassScheduleId từ List/Get.' }
$parsedVersion = [long]0
if ($Mode -in @('Update', 'Delete') -and ($Version -notmatch '^\d+$' -or ![long]::TryParse($Version, [ref]$parsedVersion))) { throw 'Update/Delete cần Version nguyên không âm mới nhất từ List/Get.' }
foreach ($bound in @($From, $To)) { if ($bound -and !(Test-LocalDate $bound)) { throw 'From/To cần ngày YYYY-MM-DD hợp lệ.' } }
if ($Mode -eq 'Occurrences' -and (!$From -or !$To)) { throw 'Occurrences cần cả From và To, tối đa 92 ngày.' }
function Invoke-ClassApi([string]$Path, [string]$Method, [hashtable]$Payload, [string]$Token) {
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
    $login = Invoke-ClassApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    $payload = @{ courseId = $CourseId.ToString(); weekdays = @($Weekdays); startsOn = $StartsOn; endsOn = $EndsOn; startTime = $StartTime; endTime = $EndTime; timeZone = $TimeZone; room = $Room; teacher = $Teacher; reminderMinutes = $ReminderMinutes; notes = $Notes }
    switch ($Mode) {
        { $_ -in @('List', 'Occurrences') } {
            $query = @()
            if ($CourseId -ne [guid]::Empty) { $query += "courseId=$CourseId" }
            if ($SemesterId -ne [guid]::Empty) { $query += "semesterId=$SemesterId" }
            if ($From) { $query += 'from=' + [Uri]::EscapeDataString($From) }
            if ($To) { $query += 'to=' + [Uri]::EscapeDataString($To) }
            $path = '/api/v1/class-schedules'
            if ($Mode -eq 'Occurrences') { $path += '/occurrences' }
            if ($query.Count) { $path += '?' + ($query -join '&') }
            $result = Invoke-ClassApi $path 'GET' @{} $login.data.accessToken
        }
        'Get' { $result = Invoke-ClassApi "/api/v1/class-schedules/$ClassScheduleId" 'GET' @{} $login.data.accessToken }
        'Create' { $result = Invoke-ClassApi '/api/v1/class-schedules' 'POST' $payload $login.data.accessToken }
        'Update' {
            $payload.version = $parsedVersion
            $result = Invoke-ClassApi "/api/v1/class-schedules/$ClassScheduleId" 'PUT' $payload $login.data.accessToken
        }
        'Delete' {
            [void](Invoke-ClassApi "/api/v1/class-schedules/${ClassScheduleId}?version=$parsedVersion" 'DELETE' @{} $login.data.accessToken)
            Write-Host 'Đã xóa chuỗi lịch. Môn, bài tập và buổi tự học vẫn được giữ.' -ForegroundColor Green
        }
    }
    if ($Mode -ne 'Delete') { $result | ConvertTo-Json -Depth 6 }
    Write-Host 'Lịch học lấy từ PostgreSQL. 1 = thứ Hai, 7 = Chủ nhật. Giao diện thời khóa biểu sẽ nối ở 4F.' -ForegroundColor Cyan
} catch {
    $failure = $_; $problem = Read-ApiProblem $failure
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa gọi được API tại $BaseUrl. Kiểm tra backend/cổng. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần thử lịch học chưa hoàn thành. Kiểm tra List/Get trước khi tự gửi lại thao tác ghi.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-ClassApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
