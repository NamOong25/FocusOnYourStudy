param(
    [ValidateSet('List', 'Get', 'Cancel', 'Change', 'Restore')][string]$Mode = 'List',
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$ClassScheduleId = [guid]::Empty,
    [string]$Date = '',
    [string]$ScheduleVersion = '',
    [AllowEmptyString()][string]$StartTime,
    [AllowEmptyString()][string]$EndTime,
    [AllowEmptyString()][ValidateLength(0, 100)][string]$Room,
    [AllowEmptyString()][ValidateLength(0, 200)][string]$Teacher,
    [ValidateLength(0, 1000)][string]$Reason = ''
)
$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
if ($ClassScheduleId -eq [guid]::Empty) { throw 'Cần ClassScheduleId từ danh sách chuỗi lịch.' }
if ($Mode -ne 'List') {
    $parsedDate = [datetime]::MinValue
    if (![datetime]::TryParseExact($Date, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None, [ref]$parsedDate)) { throw 'Date cần là YYYY-MM-DD hợp lệ, theo ngày của chuỗi.' }
}
$parsedVersion = [long]0
if ($Mode -in @('Cancel', 'Change', 'Restore') -and ($ScheduleVersion -notmatch '^\d+$' -or ![long]::TryParse($ScheduleVersion, [ref]$parsedVersion))) { throw 'Cần ScheduleVersion mới nhất từ Get chuỗi hoặc kết quả ngoại lệ, không tự cộng/đoán phiên bản.' }
foreach ($key in @('StartTime', 'EndTime')) { if ($PSBoundParameters.ContainsKey($key) -and $PSBoundParameters[$key] -notmatch '^([01]\d|2[0-3]):[0-5]\d$') { throw "$key cần là HH:mm; bỏ tham số để dùng giờ của chuỗi." } }
if ($Mode -eq 'Cancel' -and @('StartTime','EndTime','Room','Teacher' | Where-Object { $PSBoundParameters.ContainsKey($_) }).Count) { throw 'Buổi nghỉ không có giờ/phòng/giảng viên thay thế. Bỏ các tham số đó.' }
function Invoke-ExceptionApi([string]$Path, [string]$Method, [hashtable]$Payload, [string]$Token) {
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
    $login = Invoke-ExceptionApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    $root = "/api/v1/class-schedules/$ClassScheduleId/exceptions"
    $path = $root + '/' + [Uri]::EscapeDataString($Date)
    switch ($Mode) {
        'List' { $result = Invoke-ExceptionApi $root 'GET' @{} $login.data.accessToken }
        'Get' { $result = Invoke-ExceptionApi $path 'GET' @{} $login.data.accessToken }
        { $_ -in @('Cancel', 'Change') } {
            $payload = @{ kind = 'CANCELLED'; scheduleVersion = $parsedVersion; reason = $Reason }
            if ($Mode -eq 'Change') {
                $payload.kind = 'CHANGED'
                foreach ($pair in @(@('StartTime','startTime'),@('EndTime','endTime'),@('Room','room'),@('Teacher','teacher'))) { if ($PSBoundParameters.ContainsKey($pair[0])) { $payload[$pair[1]] = $PSBoundParameters[$pair[0]] } }
            }
            $result = Invoke-ExceptionApi $path 'PUT' $payload $login.data.accessToken
        }
        'Restore' {
            [void](Invoke-ExceptionApi ($path + "?scheduleVersion=$parsedVersion") 'DELETE' @{} $login.data.accessToken)
            Write-Host 'Đã khôi phục buổi về lịch gốc hiện tại. Đọc lại chuỗi để lấy version mới trước khi sửa tiếp.' -ForegroundColor Green
        }
    }
    if ($Mode -ne 'Restore') { $result | ConvertTo-Json -Depth 6 }
    Write-Host 'Ngoại lệ lấy từ PostgreSQL. Các buổi khác vẫn giữ nguyên; kiểm tra trùng giờ sẽ có ở 4E.2B.' -ForegroundColor Cyan
} catch {
    $failure = $_; $problem = $null
    try { $problem = $failure.ErrorDetails.Message | ConvertFrom-Json } catch { }
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa gọi được API tại $BaseUrl. Kiểm tra backend/cổng. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần thử ngoại lệ chưa hoàn thành. Đọc lại chuỗi/ngoại lệ trước khi tự gửi lại thao tác ghi.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-ExceptionApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
