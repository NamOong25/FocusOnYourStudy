param([string]$BaseUrl = 'http://localhost:8080')
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
$serverUri = $null
if (![uri]::TryCreate($BaseUrl, [UriKind]::Absolute, [ref]$serverUri) -or $serverUri.Scheme -notin @('http', 'https') -or $serverUri.UserInfo -or $serverUri.Query -or $serverUri.Fragment) {
    throw 'BaseUrl cần là địa chỉ HTTP/HTTPS hợp lệ, không chứa mật khẩu, query hoặc fragment.'
}
function Invoke-PasswordApi([string]$Path, [string]$Method, [hashtable]$Payload, [string]$Token) {
    $arguments = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = @{ 'X-Auth-Transport' = 'body' }; TimeoutSec = 20; UseBasicParsing = $true
        ContentType = 'application/json; charset=utf-8'; Body = [Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Compress)) }
    if ($Token) { $arguments.Headers.Authorization = "Bearer $Token" }
    $response = Invoke-WebRequest @arguments
    if ([int]$response.StatusCode -eq 204) { return $null }
    $stream = $response.RawContentStream
    if ($stream.CanSeek) { $stream.Position = 0 }
    $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::UTF8)
    try { return ($reader.ReadToEnd() | ConvertFrom-Json) } finally { $reader.Dispose() }
}
$current = $null; $next = $null; $confirm = $null; $login = $null
$currentSecret = $null; $nextSecret = $null; $confirmSecret = $null; $sent = $false
try {
    Write-Host 'Thao tác này đổi mật khẩu thật và đăng xuất mọi phiên của tài khoản. Nên dùng tài khoản thử riêng.' -ForegroundColor Yellow
    $email = Read-Host 'Email tài khoản đã đăng ký'
    $currentSecret = Read-Host 'Mật khẩu hiện tại (nhập ẩn)' -AsSecureString
    $nextSecret = Read-Host 'Mật khẩu mới (nhập ẩn)' -AsSecureString
    $confirmSecret = Read-Host 'Nhập lại mật khẩu mới (nhập ẩn)' -AsSecureString
    $current = [Net.NetworkCredential]::new('', $currentSecret).Password
    $next = [Net.NetworkCredential]::new('', $nextSecret).Password
    $confirm = [Net.NetworkCredential]::new('', $confirmSecret).Password
    if ([string]::IsNullOrWhiteSpace($next) -or $next.Length -lt 8 -or $next.Length -gt 128) { throw 'LOCAL_PASSWORD_LENGTH' }
    if ($next -cne $confirm) { throw 'LOCAL_PASSWORD_CONFIRMATION' }
    if ($next -ceq $current) { throw 'LOCAL_PASSWORD_UNCHANGED' }
    $login = Invoke-PasswordApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $current }
    $sent = $true
    [void](Invoke-PasswordApi '/api/v1/users/me/password' 'PUT' @{ currentPassword = $current; newPassword = $next } $login.data.accessToken)
    Write-Host 'Đã đổi mật khẩu và thu hồi mọi phiên đăng nhập. Đăng nhập lại bằng mật khẩu mới; dữ liệu học tập vẫn giữ nguyên.' -ForegroundColor Green
} catch {
    $localCode = $_.Exception.Message
    if ($localCode -eq 'LOCAL_PASSWORD_LENGTH') { Write-Host 'Mật khẩu mới cần từ 8 đến 128 ký tự và không chỉ gồm khoảng trắng.' -ForegroundColor Red }
    elseif ($localCode -eq 'LOCAL_PASSWORD_CONFIRMATION') { Write-Host 'Hai lần nhập mật khẩu mới chưa khớp.' -ForegroundColor Red }
    elseif ($localCode -eq 'LOCAL_PASSWORD_UNCHANGED') { Write-Host 'Mật khẩu mới cần khác mật khẩu hiện tại.' -ForegroundColor Red }
    else {
        $problem = Read-ApiProblem $_
        if ($problem.code) { Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red }
        else { Write-Host 'Chưa xác nhận được kết quả. Kiểm tra backend/kết nối.' -ForegroundColor Red }
        if ($sent) { Write-Host 'Không tự gửi lại đổi mật khẩu. Nếu mất phản hồi, thử đăng nhập bằng mật khẩu mới để kiểm tra trước.' -ForegroundColor Yellow }
    }
    throw 'Lần thử đổi mật khẩu chưa hoàn thành. Xem thông báo phía trên.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-PasswordApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) }
        catch { Write-Warning 'Chưa xác nhận đóng phiên thử riêng. Không thay kết quả đổi mật khẩu phía trên.' }
    }
    $current = $null; $next = $null; $confirm = $null; $login = $null
    foreach ($secret in @($currentSecret, $nextSecret, $confirmSecret)) { if ($secret) { $secret.Dispose() } }
}
