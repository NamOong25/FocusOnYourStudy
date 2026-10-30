param(
    [string]$BaseUrl = 'http://localhost:8080',
    [ValidateSet('Query','MarkRead')][string]$Mode = 'Query',
    [ValidateSet('ASSIGNMENT','EXAM','CLASS')][string]$Kind = 'ASSIGNMENT',
    [guid]$SourceId = [guid]::Empty,
    [string]$OccurrenceDate
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
$parsedBase = $null
if (![Uri]::TryCreate($BaseUrl,[UriKind]::Absolute,[ref]$parsedBase) -or $parsedBase.Scheme -notin @('http','https') -or $parsedBase.UserInfo -or $parsedBase.Query -or $parsedBase.Fragment) {
    throw 'BaseUrl cần địa chỉ HTTP/HTTPS backend, không kèm thông tin đăng nhập, query hoặc fragment.'
}
if ($SourceId -eq [guid]::Empty) { throw 'Cần -SourceId là UUID bài tập, lịch thi hoặc chuỗi lịch học đã lưu.' }
if ($Kind -eq 'CLASS') {
    $day = [datetime]::MinValue
    if (![datetime]::TryParseExact($OccurrenceDate,'yyyy-MM-dd',[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::None,[ref]$day) -or $day.Year -lt 1900 -or $day.Year -gt 2099) {
        throw 'CLASS cần -OccurrenceDate YYYY-MM-DD hợp lệ trong năm 1900–2099.'
    }
} elseif ($PSBoundParameters.ContainsKey('OccurrenceDate')) { throw 'Chỉ CLASS mới nhận OccurrenceDate.' }
function Invoke-NotificationStateApi([string]$Path,[string]$Method,$Payload,[string]$Token) {
    $arguments = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = @{}; TimeoutSec = 15; ContentType = 'application/json; charset=utf-8' }
    if ($Token) { $arguments.Headers.Authorization = "Bearer $Token" }
    if ($Path.StartsWith('/api/v1/auth/')) { $arguments.Headers['X-Auth-Transport'] = 'body' }
    $arguments.Body = [Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Depth 8 -Compress))
    $response = Invoke-WebRequest @arguments -UseBasicParsing
    if ($response.StatusCode -eq 204 -or $response.RawContentStream.Length -eq 0) { return }
    [Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()) | ConvertFrom-Json
}
$login = $null; $password = $null; $secret = $null
try {
    $email = Read-Host 'Email tài khoản đã đăng ký'
    $secret = Read-Host 'Mật khẩu (nhập ẩn)' -AsSecureString
    $password = [Net.NetworkCredential]::new('',$secret).Password
    $login = Invoke-NotificationStateApi '/api/v1/auth/login' 'POST' @{email=$email;password=$password}
    $password = $null
    $target = @{kind=$Kind;sourceId=$SourceId.ToString()}
    if ($Kind -eq 'CLASS') { $target.occurrenceDate = $OccurrenceDate }
    $query = Invoke-NotificationStateApi '/api/v1/notification-read-states/query' 'POST' @{targets=@($target)} $login.data.accessToken
    $state = @($query.data.items)[0]
    if ($Mode -eq 'MarkRead') {
        if (!$state.available) { throw 'Lời nhắc không còn khả dụng; không đánh dấu đã đọc.' }
        # Submit only the revision we just observed. Never retry a conflict with
        # a new revision without asking the caller to read the updated content.
        $result = Invoke-NotificationStateApi '/api/v1/notification-read-states' 'PUT' @{items=@(@{target=$state.target;revision=$state.revision})} $login.data.accessToken
        $state = @($result.data.items)[0]
    }
    if (!$state.available) { Write-Host 'Lời nhắc không còn khả dụng (không có, không thuộc tài khoản, đã xong/hủy/hết giờ hoặc đã tắt nhắc).' }
    elseif ($state.read) { Write-Host "Đã đọc · $($state.readAt)" -ForegroundColor Green }
    else { Write-Host 'Chưa đọc' -ForegroundColor Cyan }
    $state | ConvertTo-Json -Depth 6
    Write-Host 'Trạng thái lấy từ PostgreSQL. Giao diện chuông/thông báo sẽ nối ở 7B.2.'
} catch {
    $failure = $_; $problem = Read-ApiProblem $failure
    if ($problem.code) { Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red }
    elseif ($failure.Exception.Message -like '*không còn khả dụng*') { Write-Host $failure.Exception.Message -ForegroundColor Red }
    else { Write-Host "Chưa xử lý được trạng thái thông báo. Kiểm tra backend/cổng/tham số. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần thử chưa hoàn thành. Lỗi không được xem là đã đọc thành công.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-NotificationStateApi '/api/v1/auth/logout' 'POST' @{refreshToken=$login.data.refreshToken}) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
