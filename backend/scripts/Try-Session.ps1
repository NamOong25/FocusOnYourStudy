param(
    [string]$BaseUrl = 'http://localhost:8080',
    [switch]$SimulateReplay,
    [switch]$PauseForRestart
)
$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')

function Invoke-SessionApi([string]$Path, [string]$Method, [hashtable]$Payload, [string]$AccessToken) {
    $arguments = @{
        Uri = "$BaseUrl$Path"; Method = $Method; UseBasicParsing = $true
        Headers = @{ 'X-Auth-Transport' = 'body' }
    }
    if ($AccessToken) { $arguments.Headers.Authorization = "Bearer $AccessToken" }
    if ($Method -eq 'POST') {
        $arguments.ContentType = 'application/json; charset=utf-8'
        $arguments.Body = [Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Compress))
    }
    $content = $null
    try {
        $response = Invoke-WebRequest @arguments
        $status = [int]$response.StatusCode
        $content = $response.Content
        if ($content -is [byte[]]) { $content = [Text.Encoding]::UTF8.GetString($content) }
    } catch {
        $failure = $_
        $response = $failure.Exception.Response
        if (!$response) { throw "Không gọi được API tại $BaseUrl. Kiểm tra terminal backend và cổng đang chạy." }
        $status = [int]$response.StatusCode
        $content = $failure.ErrorDetails.Message
        if (!$content) {
            if ($response.PSObject.Methods['GetResponseStream']) {
                $reader = [IO.StreamReader]::new($response.GetResponseStream(), [Text.Encoding]::UTF8)
                try { $content = $reader.ReadToEnd() } finally { $reader.Dispose() }
            } else { $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() }
        }
    }
    $body = $null
    if ($content) {
        try { $body = $content | ConvertFrom-Json } catch { throw 'API chưa trả JSON hợp lệ. Kiểm tra địa chỉ backend.' }
    }
    [PSCustomObject]@{ Status = $status; Body = $body }
}

function Assert-ApiStatus($Response, [int]$Expected, [string]$Code) {
    if ($Response.Status -ne $Expected -or ($Code -and $Response.Body.code -ne $Code)) {
        throw "Mong đợi HTTP $Expected $Code nhưng nhận HTTP $($Response.Status) $($Response.Body.code). $($Response.Body.detail)"
    }
}

$password = $null
$currentRefresh = $null
$oldRefresh = $null
$pair = $null
try {
    $email = Read-Host 'Email tài khoản đã đăng ký'
    $secret = Read-Host 'Mật khẩu (nhập ẩn)' -AsSecureString
    $password = [Net.NetworkCredential]::new('', $secret).Password
    $login = Invoke-SessionApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    Assert-ApiStatus $login 200
    $password = $null
    $pair = $login.Body.data
    $currentRefresh = $pair.refreshToken
    $profile = Invoke-SessionApi '/api/v1/users/me' 'GET' @{} $pair.accessToken
    Assert-ApiStatus $profile 200
    Write-Host "[PASS] 1. Đăng nhập và đọc hồ sơ: $($profile.Body.data.fullName) — $($profile.Body.data.email)" -ForegroundColor Green

    if ($PauseForRestart) {
        Write-Host 'Giữ terminal này. Tại terminal backend: Ctrl+C rồi chạy lại .\scripts\Run-Local.ps1.' -ForegroundColor Cyan
        [void](Read-Host 'Đợi backend khởi động xong rồi nhấn Enter tại đây')
    }
    $oldRefresh = $currentRefresh
    $next = Invoke-SessionApi '/api/v1/auth/refresh' 'POST' @{ refreshToken = $currentRefresh }
    Assert-ApiStatus $next 200
    if ($next.Body.data.refreshToken -eq $oldRefresh) { throw 'Refresh token chưa được thay mới.' }
    $pair = $next.Body.data
    $currentRefresh = $pair.refreshToken
    $after = Invoke-SessionApi '/api/v1/users/me' 'GET' @{} $pair.accessToken
    Assert-ApiStatus $after 200
    if ($after.Body.data.id -ne $profile.Body.data.id) { throw 'Hồ sơ sau refresh chưa khớp tài khoản ban đầu.' }
    Write-Host '[PASS] 2. Làm mới phiên không cần nhập lại mật khẩu; hồ sơ vẫn đúng tài khoản.' -ForegroundColor Green

    if ($SimulateReplay) {
        $replay = Invoke-SessionApi '/api/v1/auth/refresh' 'POST' @{ refreshToken = $oldRefresh }
        Assert-ApiStatus $replay 401 'REFRESH_TOKEN_REUSED'
        Write-Host '[PASS] 3. Token cũ được dùng lại: backend phát hiện và thu hồi phiên.' -ForegroundColor Green
    } else {
        $logout = Invoke-SessionApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $currentRefresh }
        Assert-ApiStatus $logout 204
        Write-Host '[PASS] 3. Đăng xuất thành công.' -ForegroundColor Green
    }
    $blockedProfile = Invoke-SessionApi '/api/v1/users/me' 'GET' @{} $pair.accessToken
    Assert-ApiStatus $blockedProfile 401 'INVALID_ACCESS_TOKEN'
    $blockedRefresh = Invoke-SessionApi '/api/v1/auth/refresh' 'POST' @{ refreshToken = $currentRefresh }
    Assert-ApiStatus $blockedRefresh 401 'INVALID_REFRESH_TOKEN'
    Write-Host '[PASS] 4. Access token và refresh token của phiên đã thu hồi đều bị từ chối.' -ForegroundColor Green
    Write-Host 'Đợt 2B hoạt động đúng. Tài khoản vẫn còn; có thể đăng nhập lại. Không in hoặc lưu token ra file.' -ForegroundColor Cyan
} finally {
    # Also close this test session if a check fails or the user interrupts the test.
    if ($currentRefresh) {
        try { [void](Invoke-SessionApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $currentRefresh }) } catch { }
    }
    $password = $null; $currentRefresh = $null; $oldRefresh = $null
    $pair = $null; $login = $null; $next = $null
    if ($secret) { $secret.Dispose() }
}
