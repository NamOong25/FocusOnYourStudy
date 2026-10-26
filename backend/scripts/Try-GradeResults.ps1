param(
    [ValidateSet('Get')][string]$Mode = 'Get',
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$ConfigurationId = [guid]::Empty
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
$parsedBase = $null
if (![Uri]::TryCreate($BaseUrl,[UriKind]::Absolute,[ref]$parsedBase) -or $parsedBase.Scheme -notin @('http','https') -or $parsedBase.UserInfo) { throw 'BaseUrl cần địa chỉ HTTP/HTTPS backend, không kèm thông tin đăng nhập.' }
if ($ConfigurationId -eq [guid]::Empty) { throw 'Cần ConfigurationId từ Try-GradeConfigurations.ps1 -Mode List.' }
function Invoke-GradeResultApi([string]$Path,[string]$Method,$Payload,[string]$Token) {
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
    $login = Invoke-GradeResultApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    $result = Invoke-GradeResultApi "/api/v1/grade-configurations/$ConfigurationId/result" 'GET' $null $login.data.accessToken
    $result | ConvertTo-Json -Depth 12
    $label = switch ($result.data.result.status) {
        'INCOMPLETE_CONFIGURATION' { 'Chưa đủ nhóm cột điểm' }
        'INCOMPLETE_SCORES' { 'Chưa đủ điểm' }
        'EXAM_BLOCKED' { 'Giữa kỳ 0: không đủ điều kiện thi theo điểm đã nhập' }
        'FAILED' { 'Không đạt: cần xử lý học lại' }
        'PASSED' { 'Đạt môn theo điểm đã nhập' }
    }
    Write-Host "Kết quả: $label" -ForegroundColor Cyan
    Write-Host 'Điểm hệ 4 ở đây thuộc một môn, chưa phải GPA học kỳ. Profile IUH_2023_REPORTED_V1; màn Điểm nối ở 5C.'
} catch {
    $failure = $_; $problem = Read-ApiProblem $failure
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa đọc được kết quả tại $BaseUrl. Kiểm tra backend/cổng/ConfigurationId. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần đọc kết quả môn chưa hoàn thành.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-GradeResultApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
