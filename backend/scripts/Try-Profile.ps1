param(
    [ValidateSet('Get', 'Update')][string]$Mode = 'Get',
    [string]$BaseUrl = 'http://localhost:8080',
    [ValidateLength(0, 60)][string]$FullName = '',
    [ValidateLength(0, 100)][string]$School = '',
    [ValidateLength(0, 100)][string]$Major = '',
    [Nullable[long]]$Version
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
$serverUri = $null
if (![uri]::TryCreate($BaseUrl, [UriKind]::Absolute, [ref]$serverUri) -or $serverUri.Scheme -notin @('http', 'https') -or $serverUri.UserInfo -or $serverUri.Query -or $serverUri.Fragment) {
    throw 'BaseUrl cần là địa chỉ HTTP/HTTPS hợp lệ, không chứa mật khẩu, query hoặc fragment.'
}
if ($Mode -eq 'Update' -and (!$FullName.Trim() -or $null -eq $Version -or $Version -lt 0 -or $Version -gt 9007199254740991)) {
    throw 'Update cần FullName và Version từ lần Get đã xem. School/Major để trống sẽ xóa nội dung hai ô đó.'
}
function Invoke-ProfileApi([string]$Path, [string]$Method, [hashtable]$Payload, [string]$Token) {
    $arguments = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = @{ 'X-Auth-Transport' = 'body' }; TimeoutSec = 15; UseBasicParsing = $true }
    if ($Token) { $arguments.Headers.Authorization = "Bearer $Token" }
    if ($Method -in @('POST', 'PUT')) {
        $arguments.ContentType = 'application/json; charset=utf-8'
        $arguments.Body = [Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Compress))
    }
    $response = Invoke-WebRequest @arguments
    if ([int]$response.StatusCode -eq 204) { return $null }
    # Windows PowerShell 5.1 may otherwise decode JSON without charset as ANSI.
    $stream = $response.RawContentStream
    if ($stream.CanSeek) { $stream.Position = 0 }
    $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::UTF8)
    try { return ($reader.ReadToEnd() | ConvertFrom-Json) } finally { $reader.Dispose() }
}
$password = $null; $login = $null; $secret = $null
try {
    $email = Read-Host 'Email tài khoản đã đăng ký'
    $secret = Read-Host 'Mật khẩu (nhập ẩn)' -AsSecureString
    $password = [Net.NetworkCredential]::new('', $secret).Password
    $login = Invoke-ProfileApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    if ($Mode -eq 'Get') {
        $result = Invoke-ProfileApi '/api/v1/users/me' 'GET' @{} $login.data.accessToken
    } else {
        $result = Invoke-ProfileApi '/api/v1/users/me' 'PUT' @{ fullName = $FullName; school = $School; major = $Major; version = [long]$Version } $login.data.accessToken
    }
    $result | ConvertTo-Json -Depth 6
    if ($Mode -eq 'Update') { Write-Host 'Đã lưu hồ sơ vào PostgreSQL. Chạy Get để đọc lại; giao diện lưu hồ sơ sẽ nối ở 9A.2.' -ForegroundColor Green }
    else { Write-Host 'Hồ sơ lấy từ PostgreSQL. Dùng version của bản đã xem khi Update; không tự tăng version.' -ForegroundColor Cyan }
} catch {
    $problem = Read-ApiProblem $_
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) {
            if ($item.field -in @('fullName', 'school', 'major', 'version')) { Write-Host "  $($item.field): $($item.message)" }
        }
    } else { Write-Host 'Chưa xác nhận được kết quả. Kiểm tra backend/kết nối rồi dùng Get đối chiếu; không tự gửi Update lại.' -ForegroundColor Red }
    throw 'Lần thử hồ sơ chưa hoàn thành. Xem thông báo phía trên.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-ProfileApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) }
        catch { Write-Warning 'Chưa xác nhận được đăng xuất phiên thử; không thay kết quả đọc/lưu hồ sơ phía trên.' }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
