param(
    [ValidateSet('Get')][string]$Mode = 'Get',
    [string]$BaseUrl = 'http://localhost:8080'
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
$parsedBase = $null
if (![Uri]::TryCreate($BaseUrl,[UriKind]::Absolute,[ref]$parsedBase) -or $parsedBase.Scheme -notin @('http','https') -or $parsedBase.UserInfo) { throw 'BaseUrl cần địa chỉ HTTP/HTTPS backend, không kèm thông tin đăng nhập.' }
function Invoke-CumulativeGpaApi([string]$Path,[string]$Method,$Payload,[string]$Token) {
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
    $login = Invoke-CumulativeGpaApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    $result = Invoke-CumulativeGpaApi '/api/v1/gpa/cumulative' 'GET' $null $login.data.accessToken
    $result | ConvertTo-Json -Depth 18
    if ($null -eq $result.data.summary.gpa) { Write-Host 'Chưa có nhóm môn đủ kết quả để tính GPA tích lũy trong app.' -ForegroundColor Cyan }
    else {
        $display = ([decimal]$result.data.summary.gpa).ToString('0.00',[Globalization.CultureInfo]::InvariantCulture)
        Write-Host "GPA tích lũy trong app: $display / 4" -ForegroundColor Cyan
    }
    Write-Host "Tín chỉ tính GPA: $($result.data.summary.calculatedCredits); đã đạt: $($result.data.summary.earnedCredits); chưa đạt: $($result.data.summary.failedCredits)."
    Write-Host "Đã chọn $($result.data.summary.calculatedGroups)/$($result.data.summary.registeredGroups) nhóm; $($result.data.summary.recordedAttempts) lần học được giữ trong lịch sử."
    if ($result.data.summary.state -eq 'PARTIAL') { Write-Host "Kết quả hiện có còn thiếu: $($result.data.summary.excludedGroups) nhóm chưa tính, $($result.data.summary.pendingAttempts) lần học chưa đủ kết quả. Xem history/decisions." -ForegroundColor Yellow }
    foreach ($group in $result.data.groups) {
        Write-Host "$($group.history.code) · $($group.history.credits) tín chỉ · $($group.reason) · CourseId được chọn: $($group.selectedCourseId)"
    }
    Write-Host 'Quy tắc app: lấy tổng kết đạt cao nhất; chưa có lần đạt thì giữ F hoàn chỉnh gần nhất. Mỗi nhóm tính tín chỉ một lần.'
    Write-Host 'Đây là chính sách người dùng chọn trong app; chưa xác nhận GPA tích lũy chính thức của trường. Nối màn Điểm/Dashboard ở 5C.'
} catch {
    $failure = $_; $problem = Read-ApiProblem $failure
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa đọc được GPA tích lũy tại $BaseUrl. Kiểm tra backend/cổng. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần đọc GPA tích lũy trong app chưa hoàn thành.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-CumulativeGpaApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
