param(
    [ValidateSet('Active','Get','Start','Pause','Resume')][string]$Mode = 'Active',
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$CourseId = [guid]::Empty,
    [guid]$ClientRequestId = [guid]::Empty,
    [guid]$AssignmentId = [guid]::Empty,
    [guid]$StudySessionId = [guid]::Empty,
    [guid]$SessionId = [guid]::Empty,
    [Nullable[long]]$Version,
    [string]$TimeZone = 'Asia/Ho_Chi_Minh'
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
$parsedBase = $null
if (![Uri]::TryCreate($BaseUrl,[UriKind]::Absolute,[ref]$parsedBase) -or $parsedBase.Scheme -notin @('http','https') -or $parsedBase.UserInfo) { throw 'BaseUrl cần địa chỉ HTTP/HTTPS backend, không kèm thông tin đăng nhập.' }
if ($Mode -eq 'Start' -and ($CourseId -eq [guid]::Empty -or $ClientRequestId -eq [guid]::Empty)) { throw 'Start cần -CourseId và -ClientRequestId. Giữ cùng ClientRequestId nếu cần đối chiếu/gửi lại đúng yêu cầu bắt đầu.' }
if ($Mode -eq 'Get' -and $SessionId -eq [guid]::Empty) { throw 'Get cần -SessionId.' }
if ($PSBoundParameters.ContainsKey('Version') -and ($null -eq $Version -or $Version -lt 0)) { throw 'Version phải là số nguyên không âm.' }
function Invoke-PomodoroApi([string]$Path,[string]$Method,$Payload,[string]$Token) {
    $arguments = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = @{}; TimeoutSec = 15 }
    if ($Token) { $arguments.Headers.Authorization = "Bearer $Token" }
    if ($Path.StartsWith('/api/v1/auth/')) { $arguments.Headers['X-Auth-Transport'] = 'body' }
    if ($Method -eq 'POST') {
        $arguments.ContentType = 'application/json; charset=utf-8'
        $arguments.Body = [Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Depth 8 -Compress))
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
    $login = Invoke-PomodoroApi '/api/v1/auth/login' 'POST' @{email=$email;password=$password}
    $password = $null
    $path = '/api/v1/pomodoro-sessions'
    if ($Mode -eq 'Start') {
        $inputBody = @{clientRequestId=$ClientRequestId.ToString();courseId=$CourseId.ToString();timeZone=$TimeZone}
        if ($AssignmentId -ne [guid]::Empty) { $inputBody.assignmentId = $AssignmentId.ToString() }
        if ($StudySessionId -ne [guid]::Empty) { $inputBody.studySessionId = $StudySessionId.ToString() }
        $result = Invoke-PomodoroApi $path 'POST' $inputBody $login.data.accessToken
    } elseif ($Mode -eq 'Get') {
        $result = Invoke-PomodoroApi "$path/$SessionId" 'GET' $null $login.data.accessToken
    } elseif ($Mode -eq 'Active') {
        $result = Invoke-PomodoroApi "$path/active" 'GET' $null $login.data.accessToken
    } else {
        # Read once, then send exactly one versioned command. Never retry a write automatically.
        $readPath = if ($SessionId -eq [guid]::Empty) { "$path/active" } else { "$path/$SessionId" }
        $current = Invoke-PomodoroApi $readPath 'GET' $null $login.data.accessToken
        if (!$current.data) { throw 'Chưa có phiên Pomodoro đang hoạt động.' }
        $expected = if ($PSBoundParameters.ContainsKey('Version')) { $Version } else { $current.data.version }
        $action = $Mode.ToLowerInvariant()
        $result = Invoke-PomodoroApi "$path/$($current.data.id)/$action" 'POST' @{version=$expected} $login.data.accessToken
    }
    $result | ConvertTo-Json -Depth 12
    if (!$result.data) { Write-Host 'Chưa có phiên Pomodoro đang hoạt động.' -ForegroundColor Cyan }
    else {
        Write-Host "Trạng thái: $($result.data.status) · Còn $($result.data.remainingSeconds) giây · Version $($result.data.version)." -ForegroundColor Cyan
        if ($result.data.timeUp) { Write-Host 'Đã đủ 25 phút. Hoàn tất/hủy và lịch sử sẽ làm ở 6A.2; hiện vẫn giữ phiên này.' -ForegroundColor Yellow }
    }
    Write-Host 'Dữ liệu lấy từ PostgreSQL. Giao diện Pomodoro chưa nối API trong 6A.1.'
} catch {
    $failure = $_; $problem = Read-ApiProblem $failure
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa hoàn thành thao tác Pomodoro. Kiểm tra backend/cổng/tham số. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Không tự gửi lại thao tác ghi. Dùng -Mode Active hoặc Get để đối chiếu trước.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-PomodoroApi '/api/v1/auth/logout' 'POST' @{refreshToken=$login.data.refreshToken}) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
