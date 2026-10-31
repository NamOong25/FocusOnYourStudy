param(
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$CourseId = [guid]::Empty,
    [guid]$AssignmentId = [guid]::Empty,
    [guid]$ExamId = [guid]::Empty,
    [string]$Goal = 'Ôn tập môn học',
    [string]$FromDate = (Get-Date).ToString('yyyy-MM-dd'),
    [string]$ToDate = (Get-Date).AddDays(6).ToString('yyyy-MM-dd'),
    [string]$TimeZone = 'Asia/Ho_Chi_Minh',
    [string]$AvailableStart = '19:00',
    [string]$AvailableEnd = '21:00',
    [int[]]$Weekdays = @(1,2,3,4,5,6,7),
    [ValidateRange(1,1440)][int]$TotalMinutes = 180,
    [ValidateRange(15,240)][int]$SessionMinutes = 45,
    [ValidateRange(0,60)][int]$BreakMinutes = 10
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
$parsedBase = $null
if (![Uri]::TryCreate($BaseUrl,[UriKind]::Absolute,[ref]$parsedBase) -or $parsedBase.Scheme -notin @('http','https') -or $parsedBase.UserInfo -or $parsedBase.Query -or $parsedBase.Fragment) {
    throw 'BaseUrl cần HTTP/HTTPS backend, không kèm tài khoản, query hoặc fragment.'
}
if ($CourseId -eq [guid]::Empty) { throw 'Cần -CourseId môn học của tài khoản. Lấy id bằng scripts/Try-Courses.ps1 -Mode List.' }
if ($AssignmentId -ne [guid]::Empty -and $ExamId -ne [guid]::Empty) { throw 'Chỉ chọn AssignmentId hoặc ExamId; bỏ cả hai để tự học độc lập.' }
function Invoke-PlanApi([string]$Path,[string]$Method,$Payload,[string]$Token) {
    $arguments = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = @{}; TimeoutSec = 15 }
    if ($Token) { $arguments.Headers.Authorization = "Bearer $Token" }
    if ($Path.StartsWith('/api/v1/auth/')) { $arguments.Headers['X-Auth-Transport'] = 'body' }
    if ($Method -eq 'POST') {
        $arguments.ContentType = 'application/json; charset=utf-8'
        $arguments.Body = [Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Depth 6 -Compress))
    }
    $response = Invoke-WebRequest @arguments -UseBasicParsing
    if ($response.StatusCode -eq 204 -or $response.RawContentStream.Length -eq 0) { return }
    [Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()) | ConvertFrom-Json
}
$login = $null; $password = $null; $secret = $null
try {
    $email = Read-Host 'Email tài khoản đã đăng ký'
    $secret = Read-Host 'Mật khẩu (nhập ẩn)' -AsSecureString
    $password = [Net.NetworkCredential]::new('',$secret).Password
    $login = Invoke-PlanApi '/api/v1/auth/login' 'POST' @{email=$email;password=$password}
    $password = $null
    $inputPlan = @{courseId=$CourseId.ToString();goal=$Goal;fromDate=$FromDate;toDate=$ToDate;timeZone=$TimeZone;availableStart=$AvailableStart;availableEnd=$AvailableEnd;weekdays=@($Weekdays);totalMinutes=$TotalMinutes;sessionMinutes=$SessionMinutes;breakMinutes=$BreakMinutes}
    if ($AssignmentId -ne [guid]::Empty) { $inputPlan.assignmentId = $AssignmentId.ToString() }
    if ($ExamId -ne [guid]::Empty) { $inputPlan.examId = $ExamId.ToString() }
    $result = Invoke-PlanApi '/api/v1/study-plans/preview' 'POST' $inputPlan $login.data.accessToken
    $result | ConvertTo-Json -Depth 9
    Write-Host "Xếp được $($result.data.scheduledMinutes)/$($result.data.requestedMinutes) phút; còn thiếu $($result.data.unscheduledMinutes) phút." -ForegroundColor Cyan
    Write-Host 'Đây là đề xuất theo quy tắc từ dữ liệu PostgreSQL, chưa lưu buổi học và chưa gọi dịch vụ AI. Giao diện đã xem/chỉnh ở 8A.2. Lưu nhóm chỉ khi duyệt riêng qua API 8A.3A.'
} catch {
    $failure = $_; $problem = Read-ApiProblem $failure
    if ($problem.code) { Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red }
    else { Write-Host "Chưa tạo được đề xuất. Kiểm tra backend/cổng/tham số. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần thử đề xuất chưa hoàn thành. Lỗi không được xem là kế hoạch trống.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-PlanApi '/api/v1/auth/logout' 'POST' @{refreshToken=$login.data.refreshToken}) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
