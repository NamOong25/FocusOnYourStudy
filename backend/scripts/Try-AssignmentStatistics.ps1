param(
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$SemesterId = [guid]::Empty,
    [guid]$CourseId = [guid]::Empty,
    [string]$TimeZone
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
$parsedBase = $null
if (![Uri]::TryCreate($BaseUrl,[UriKind]::Absolute,[ref]$parsedBase) -or $parsedBase.Scheme -notin @('http','https') -or $parsedBase.UserInfo -or $parsedBase.Query -or $parsedBase.Fragment) {
    throw 'BaseUrl cần địa chỉ HTTP/HTTPS backend, không kèm thông tin đăng nhập, query hoặc fragment.'
}
if ($SemesterId -eq [guid]::Empty) { throw 'Cần -SemesterId của học kỳ muốn xem. Lấy id bằng scripts/Try-Semesters.ps1 -Mode List.' }
if ($PSBoundParameters.ContainsKey('CourseId') -and $CourseId -eq [guid]::Empty) { throw 'CourseId cần UUID môn học hợp lệ hoặc bỏ tham số để xem cả học kỳ.' }
function Invoke-AssignmentStatisticsApi([string]$Path,[string]$Method,$Payload,[string]$Token) {
    $arguments = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = @{}; TimeoutSec = 15 }
    if ($Token) { $arguments.Headers.Authorization = "Bearer $Token" }
    if ($Path.StartsWith('/api/v1/auth/')) { $arguments.Headers['X-Auth-Transport'] = 'body' }
    if ($Method -eq 'POST') {
        $arguments.ContentType = 'application/json; charset=utf-8'
        $arguments.Body = [Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Compress))
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
    $login = Invoke-AssignmentStatisticsApi '/api/v1/auth/login' 'POST' @{email=$email;password=$password}
    $password = $null
    $query = 'semesterId=' + $SemesterId.ToString()
    if ($CourseId -ne [guid]::Empty) { $query += '&courseId=' + $CourseId.ToString() }
    if ($PSBoundParameters.ContainsKey('TimeZone')) { $query += '&timeZone=' + [Uri]::EscapeDataString($TimeZone) }
    $result = Invoke-AssignmentStatisticsApi ('/api/v1/assignment-statistics?' + $query) 'GET' $null $login.data.accessToken
    $result | ConvertTo-Json -Depth 8
    Write-Host "Bài tập: $($result.data.completedAssignments)/$($result.data.totalAssignments) hoàn thành · $($result.data.completionPercent)%." -ForegroundColor Cyan
    Write-Host "Chưa làm: $($result.data.todoAssignments) · Đang làm: $($result.data.inProgressAssignments) · Quá hạn: $($result.data.overdueAssignments) · Sắp hạn: $($result.data.dueSoonAssignments)."
    Write-Host "Tính tại: $($result.data.asOf) · $($result.data.timeZone) · Sắp hạn đến (bao gồm): $($result.data.dueSoonThrough)."
    Write-Host 'Thống kê đọc PostgreSQL, không sửa bài tập. Màn Thống kê sẽ nối ở 7A.2.'
} catch {
    $failure = $_; $problem = Read-ApiProblem $failure
    if ($problem.code) { Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red }
    else { Write-Host "Chưa đọc được thống kê. Kiểm tra backend/cổng/tham số. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần thử thống kê bài tập chưa hoàn thành. Lỗi không được xem là dữ liệu trống.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-AssignmentStatisticsApi '/api/v1/auth/logout' 'POST' @{refreshToken=$login.data.refreshToken}) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
