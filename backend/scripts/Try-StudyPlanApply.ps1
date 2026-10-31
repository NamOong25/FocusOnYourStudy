param(
    [ValidateSet('Prepare','Apply','Get')][string]$Mode = 'Prepare',
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$RequestFile = (Join-Path (Split-Path $PSScriptRoot -Parent) '.local\study-plan-apply.json'),
    [guid]$ClientRequestId = [guid]::Empty,
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
$uri = $null
if (![Uri]::TryCreate($BaseUrl,[UriKind]::Absolute,[ref]$uri) -or $uri.Scheme -notin @('http','https') -or $uri.UserInfo -or $uri.Query -or $uri.Fragment) { throw 'BaseUrl cần HTTP/HTTPS backend, không có tài khoản/query/fragment.' }
$payload = $null
if ($Mode -eq 'Prepare') {
    if ($CourseId -eq [guid]::Empty) { throw 'Prepare cần CourseId UUID; lấy id bằng Try-Courses.ps1 -Mode List.' }
    if ($AssignmentId -ne [guid]::Empty -and $ExamId -ne [guid]::Empty) { throw 'Chỉ chọn bài tập hoặc kỳ thi.' }
    if (Test-Path -LiteralPath $RequestFile) { throw 'Tệp yêu cầu đã có. Giữ tệp/mã cũ để Get hoặc Apply; dùng tên tệp khác nếu muốn chuẩn bị kế hoạch mới.' }
} elseif ($Mode -eq 'Apply' -or $ClientRequestId -eq [guid]::Empty) {
    $file = Get-Item -LiteralPath $RequestFile
    if ($file.PSIsContainer -or $file.Length -gt 1048576) { throw 'Cần tệp JSON yêu cầu, tối đa 1 MB.' }
    $payload = Get-Content -LiteralPath $RequestFile -Encoding UTF8 -Raw | ConvertFrom-Json
    if (!$payload.clientRequestId) { throw 'Tệp thiếu clientRequestId. Không tự tạo mã mới cho lần lưu chưa xác định kết quả.' }
    $ClientRequestId = [guid]$payload.clientRequestId
}
function Invoke-ApplyApi([string]$Path,[string]$Method,$InputBody,[string]$Token) {
    $arguments = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = @{}; TimeoutSec = 20; MaximumRedirection = 0 }
    if ($Token) { $arguments.Headers.Authorization = "Bearer $Token" }
    if ($Path.StartsWith('/api/v1/auth/')) { $arguments.Headers['X-Auth-Transport'] = 'body' }
    if ($Method -eq 'POST') { $arguments.ContentType = 'application/json; charset=utf-8'; $arguments.Body = [Text.Encoding]::UTF8.GetBytes(($InputBody | ConvertTo-Json -Depth 12 -Compress)) }
    $response = Invoke-WebRequest @arguments -UseBasicParsing
    if ($response.StatusCode -eq 204 -or $response.RawContentStream.Length -eq 0) { return }
    [Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()) | ConvertFrom-Json
}
$login = $null; $password = $null; $secret = $null
try {
    $email = Read-Host 'Email tài khoản đã đăng ký'
    $secret = Read-Host 'Mật khẩu (nhập ẩn)' -AsSecureString
    $password = [Net.NetworkCredential]::new('',$secret).Password
    $login = Invoke-ApplyApi '/api/v1/auth/login' 'POST' @{email=$email;password=$password}
    $password = $null
    if ($Mode -eq 'Prepare') {
        $conditions = @{courseId=$CourseId.ToString();goal=$Goal;fromDate=$FromDate;toDate=$ToDate;timeZone=$TimeZone;availableStart=$AvailableStart;availableEnd=$AvailableEnd;weekdays=@($Weekdays);totalMinutes=$TotalMinutes;sessionMinutes=$SessionMinutes;breakMinutes=$BreakMinutes}
        if ($AssignmentId -ne [guid]::Empty) { $conditions.assignmentId = $AssignmentId.ToString() }
        if ($ExamId -ne [guid]::Empty) { $conditions.examId = $ExamId.ToString() }
        $preview = Invoke-ApplyApi '/api/v1/study-plans/preview' 'POST' $conditions $login.data.accessToken
        if (!$preview.data.sessions.Count) { throw 'Chưa có buổi nào để lưu. Đổi điều kiện đề xuất; không tạo tệp yêu cầu rỗng.' }
        $rows = @($preview.data.sessions | ForEach-Object { @{index=$_.index;title=$_.title;startsAt=$_.startsAt;durationMinutes=$_.durationMinutes} })
        $payload = @{clientRequestId=([guid]::NewGuid()).ToString();conditions=$conditions;courseVersion=$preview.data.courseVersion;targetVersion=$preview.data.target.version;sessions=$rows}
        $payload | ConvertTo-Json -Depth 12 | Out-File -LiteralPath $RequestFile -Encoding utf8 -NoClobber
        $payload | ConvertTo-Json -Depth 12
        Write-Host "Đã chuẩn bị $($rows.Count) buổi tại $RequestFile. CHƯA LƯU vào lịch." -ForegroundColor Cyan
        Write-Host 'Xem/chỉnh tệp: bỏ dòng buổi không chọn, giữ index và mã yêu cầu; rồi chạy riêng -Mode Apply. Không có token/mật khẩu trong tệp.'
    } elseif ($Mode -eq 'Apply') {
        $result = Invoke-ApplyApi '/api/v1/study-plans/apply' 'POST' $payload $login.data.accessToken
        $result | ConvertTo-Json -Depth 12
        Write-Host "Biên nhận: đã lưu $($result.data.savedMinutes) phút, còn thiếu $($result.data.remainingMinutes) phút so với yêu cầu. Đây là ảnh chụp kết quả lúc lưu; xem danh sách Tự học để đọc trạng thái mới nhất." -ForegroundColor Cyan
        Write-Host 'Gửi lại đúng tệp dùng cùng mã sẽ trả biên nhận cũ, không tạo thêm buổi.'
    } else {
        $result = Invoke-ApplyApi ("/api/v1/study-plans/applications/"+$ClientRequestId.ToString()) 'GET' $null $login.data.accessToken
        $result | ConvertTo-Json -Depth 12
        Write-Host 'Đã đọc biên nhận cũ; không ghi thêm buổi học.' -ForegroundColor Cyan
    }
} catch {
    $problem = Read-ApiProblem $_
    if ($problem.code) { Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red }
    else { Write-Host 'Chưa hoàn tất yêu cầu. Kiểm tra backend/cổng/tệp JSON; kết quả chưa xác định không được xem là chưa lưu.' -ForegroundColor Red }
    Write-Host 'Nếu đã gửi Apply: giữ nguyên tệp và clientRequestId, chạy -Mode Get để đối chiếu. Không tự đổi mã hoặc tự gửi lại sau lỗi.'
    throw 'Lần thử chưa hoàn thành. Không xóa database hoặc tệp yêu cầu để xử lý lỗi.'
} finally {
    if ($login -and $login.data.refreshToken) { try { [void](Invoke-ApplyApi '/api/v1/auth/logout' 'POST' @{refreshToken=$login.data.refreshToken}) } catch { } }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
