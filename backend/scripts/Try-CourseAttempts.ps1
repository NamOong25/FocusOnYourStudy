param(
    [ValidateSet('List','Get')][string]$Mode = 'List',
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$CourseId = [guid]::Empty
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
$parsedBase = $null
if (![Uri]::TryCreate($BaseUrl,[UriKind]::Absolute,[ref]$parsedBase) -or $parsedBase.Scheme -notin @('http','https') -or $parsedBase.UserInfo) { throw 'BaseUrl cần địa chỉ HTTP/HTTPS backend, không kèm thông tin đăng nhập.' }
if ($Mode -eq 'Get' -and $CourseId -eq [guid]::Empty) { throw 'Chế độ Get cần CourseId lấy từ Try-Courses.ps1 -Mode List; không dùng id học kỳ/cấu hình điểm.' }
if ($Mode -eq 'List' -and $CourseId -ne [guid]::Empty) { throw 'Dùng -Mode Get khi muốn xem lịch sử của một CourseId.' }
function Invoke-CourseAttemptsApi([string]$Path,[string]$Method,$Payload,[string]$Token) {
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
    $login = Invoke-CourseAttemptsApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    $path = '/api/v1/course-attempts'
    if ($Mode -eq 'Get') { $path = "/api/v1/courses/$CourseId/attempts" }
    $result = Invoke-CourseAttemptsApi $path 'GET' $null $login.data.accessToken
    $result | ConvertTo-Json -Depth 14
    Write-Host "Lịch sử: $($result.data.summary.groups) nhóm, $($result.data.summary.attempts) lần học; $($result.data.summary.reviewGroups) nhóm cần đối chiếu." -ForegroundColor Cyan
    foreach ($group in $result.data.groups) {
        Write-Host "$($group.code) · $($group.credits) tín chỉ"
        if ($group.needsReview) { Write-Host "Cần đối chiếu: $($group.issues -join ', ')" -ForegroundColor Yellow }
        foreach ($attempt in $group.attempts) {
            Write-Host "  $($attempt.semester.academicYear) · $($attempt.semester.name): $($attempt.relation) · $($attempt.course.name)"
        }
    }
    Write-Host 'Đây là lịch sử ghi nhận trong app; nhãn chỉ dựa trên kết quả trước đó, không xác nhận đăng ký học lại/cải thiện tại trường.'
    Write-Host 'Chưa chọn điểm hoặc tính GPA tích lũy. Giao diện sẽ được nối ở 5C.'
} catch {
    $failure = $_; $problem = Read-ApiProblem $failure
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa đọc được lịch sử tại $BaseUrl. Kiểm tra backend/cổng/CourseId. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần đọc lịch sử học môn chưa hoàn thành.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-CourseAttemptsApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
