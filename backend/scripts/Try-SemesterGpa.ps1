param(
    [ValidateSet('Get')][string]$Mode = 'Get',
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$SemesterId = [guid]::Empty
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
$parsedBase = $null
if (![Uri]::TryCreate($BaseUrl,[UriKind]::Absolute,[ref]$parsedBase) -or $parsedBase.Scheme -notin @('http','https') -or $parsedBase.UserInfo) { throw 'BaseUrl cần địa chỉ HTTP/HTTPS backend, không kèm thông tin đăng nhập.' }
if ($SemesterId -eq [guid]::Empty) { throw 'Cần SemesterId lấy từ Try-Semesters.ps1 -Mode List; không dùng id môn hoặc cấu hình điểm.' }
function Invoke-SemesterGpaApi([string]$Path,[string]$Method,$Payload,[string]$Token) {
    $arguments = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = @{}; TimeoutSec = 15 }
    if ($Token) { $arguments.Headers.Authorization = "Bearer $Token" }
    if ($Path.StartsWith('/api/v1/auth/')) { $arguments.Headers['X-Auth-Transport'] = 'body' }
    if ($Method -eq 'POST') {
        $arguments.ContentType = 'application/json; charset=utf-8'
        $arguments.Body = [Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Depth 12 -Compress))
    }
    $response = Invoke-WebRequest @arguments -UseBasicParsing
    if ($response.StatusCode -eq 204 -or $response.RawContentStream.Length -eq 0) { return }
    [Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()) | ConvertFrom-Json
}
$password = $null; $login = $null; $secret = $null
try {
    $email = Read-Host 'Email tài khoản đã đăng ký'
    $secret = Read-Host 'Mật khẩu (nhập ẩn)' -AsSecureString
    $password = [Net.NetworkCredential]::new('',$secret).Password
    $login = Invoke-SemesterGpaApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    $result = Invoke-SemesterGpaApi "/api/v1/semesters/$SemesterId/gpa" 'GET' $null $login.data.accessToken
    $result | ConvertTo-Json -Depth 12
    if ($null -eq $result.data.summary.gpa) { Write-Host 'GPA học kỳ: chưa có kết quả đủ điểm để tính.' -ForegroundColor Cyan }
    else {
        $display = ([decimal]$result.data.summary.gpa).ToString('0.00',[Globalization.CultureInfo]::InvariantCulture)
        Write-Host "GPA học kỳ: $display / 4" -ForegroundColor Cyan
    }
    Write-Host "Tín chỉ tính GPA: $($result.data.summary.calculatedCredits); đã đạt: $($result.data.summary.earnedCredits); chưa được tính: $($result.data.summary.excludedCredits)."
    if ($result.data.summary.state -eq 'PARTIAL') { Write-Host 'GPA hiện tại mới dựa trên các môn đã đủ kết quả; xem exclusionReason của những môn còn lại.' -ForegroundColor Yellow }
    Write-Host 'Đây là GPA học kỳ đang chọn. GPA tích lũy/học lại ở 5B.2; nối Dashboard ở 5C.'
} catch {
    $failure = $_; $problem = Read-ApiProblem $failure
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa đọc được GPA tại $BaseUrl. Kiểm tra backend/cổng/SemesterId. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần đọc GPA học kỳ chưa hoàn thành.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-SemesterGpaApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
