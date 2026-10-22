param(
    [ValidateSet('Register', 'Login')][string]$Mode = 'Register',
    [string]$BaseUrl = 'http://localhost:8080'
)
$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')

function Invoke-AuthJson([string]$Path, [hashtable]$Payload) {
    $bytes = [Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Compress))
    Invoke-RestMethod -Uri "$BaseUrl$Path" -Method Post -ContentType 'application/json; charset=utf-8' -Body $bytes
}

$password = $null
$confirmation = $null
$login = $null
try {
    $email = Read-Host 'Email'
    if ($Mode -eq 'Register') { $fullName = Read-Host 'Họ và tên' }
    $secret = Read-Host 'Mật khẩu (nhập ẩn)' -AsSecureString
    $password = [Net.NetworkCredential]::new('', $secret).Password
    if ($Mode -eq 'Register') {
        $confirmSecret = Read-Host 'Nhập lại mật khẩu (nhập ẩn)' -AsSecureString
        $confirmation = [Net.NetworkCredential]::new('', $confirmSecret).Password
        $registered = Invoke-AuthJson '/api/v1/auth/register' @{
            email = $email; fullName = $fullName; password = $password; confirmPassword = $confirmation
        }
        Write-Host 'Đăng ký thành công. Tài khoản đã được lưu trong PostgreSQL.' -ForegroundColor Green
    }
    $login = Invoke-AuthJson '/api/v1/auth/login' @{ email = $email; password = $password }
    Write-Host "Đăng nhập thành công. Access token có hạn $($login.data.expiresIn) giây (không in token)." -ForegroundColor Green
    $profile = Invoke-RestMethod -Uri "$BaseUrl/api/v1/users/me" -Headers @{ Authorization = "Bearer $($login.data.accessToken)" }
    Write-Host 'Hồ sơ do API trả về:' -ForegroundColor Cyan
    $profile.data | Select-Object id, email, fullName, school, major, timeZone | Format-List
    Write-Host 'Có thể chạy lại với -Mode Login sau khi khởi động lại backend để kiểm tra tài khoản vẫn còn.'
} catch {
    $failure = $_
    $problem = $null
    try { $problem = $failure.ErrorDetails.Message | ConvertFrom-Json } catch { }
    if ($problem.code) {
        Write-Host "Chưa thành công: $($problem.code) — $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else {
        Write-Host "Không gọi được API tại $BaseUrl. Kiểm tra terminal backend và cổng đang chạy." -ForegroundColor Red
    }
    throw 'Lần thử API chưa hoàn thành. Xem thông báo phía trên; không cần xóa database.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-AuthJson '/api/v1/auth/logout' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $confirmation = $null; $login = $null
    $registered = $null; $bytes = $null
    if ($secret) { $secret.Dispose() }
    if ($confirmSecret) { $confirmSecret.Dispose() }
}
