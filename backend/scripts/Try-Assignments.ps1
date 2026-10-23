param(
    [ValidateSet('List', 'Get', 'Create', 'Update', 'Delete')][string]$Mode = 'List',
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$AssignmentId = [guid]::Empty,
    [guid]$CourseId = [guid]::Empty,
    [guid]$SemesterId = [guid]::Empty,
    [string]$Version = '',
    [ValidateLength(0, 200)][string]$Title = '',
    [string]$DueAt = '',
    [ValidateSet('MEDIUM', 'HIGH')][string]$Priority = 'MEDIUM',
    [ValidateSet('TODO', 'IN_PROGRESS', 'COMPLETED')][string]$Status = 'TODO',
    [ValidateSet('', 'TODO', 'IN_PROGRESS', 'COMPLETED')][string]$FilterStatus = '',
    [ValidateLength(0, 5000)][string]$Notes = ''
)
$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
if ($Mode -in @('Create', 'Update')) {
    if ($CourseId -eq [guid]::Empty -or !$Title.Trim() -or !$DueAt.Trim()) { throw 'Create/Update cần CourseId, Title và DueAt. Lấy ID môn bằng Try-Courses.ps1 -Mode List.' }
    $parsedDeadline = [DateTimeOffset]::MinValue
    if ($DueAt -notmatch '(Z|[+-]\d{2}:\d{2})$' -or ![DateTimeOffset]::TryParse($DueAt, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None, [ref]$parsedDeadline)) {
        throw 'DueAt cần ngày/giờ và múi giờ, ví dụ 2026-10-30T23:59:00+07:00. Không nhập riêng ngày hoặc giờ.'
    }
}
if ($Mode -in @('Get', 'Update', 'Delete') -and $AssignmentId -eq [guid]::Empty) { throw 'Cần AssignmentId từ List/Get.' }
$parsedVersion = [long]0
if ($Mode -in @('Update', 'Delete') -and ($Version -notmatch '^\d+$' -or ![long]::TryParse($Version, [ref]$parsedVersion))) { throw 'Update/Delete cần Version nguyên không âm mới nhất từ List/Get.' }
function Invoke-AssignmentApi([string]$Path, [string]$Method, [hashtable]$Payload, [string]$Token) {
    $arguments = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = @{}; TimeoutSec = 15 }
    if ($Token) { $arguments.Headers.Authorization = "Bearer $Token" }
    if ($Path.StartsWith('/api/v1/auth/')) { $arguments.Headers['X-Auth-Transport'] = 'body' }
    if ($Method -in @('POST', 'PUT')) {
        $arguments.ContentType = 'application/json; charset=utf-8'
        $arguments.Body = [Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Compress))
    }
    Invoke-RestMethod @arguments
}
$password = $null; $login = $null; $secret = $null
try {
    $email = Read-Host 'Email tài khoản đã đăng ký'
    $secret = Read-Host 'Mật khẩu (nhập ẩn)' -AsSecureString
    $password = [Net.NetworkCredential]::new('', $secret).Password
    $login = Invoke-AssignmentApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    $payload = @{ courseId = $CourseId.ToString(); title = $Title; dueAt = $DueAt; priority = $Priority; status = $Status; notes = $Notes }
    switch ($Mode) {
        'List' {
            $query = @()
            if ($CourseId -ne [guid]::Empty) { $query += "courseId=$CourseId" }
            if ($SemesterId -ne [guid]::Empty) { $query += "semesterId=$SemesterId" }
            if ($FilterStatus) { $query += "status=$FilterStatus" }
            $path = '/api/v1/assignments'
            if ($query.Count) { $path += '?' + ($query -join '&') }
            $result = Invoke-AssignmentApi $path 'GET' @{} $login.data.accessToken
        }
        'Get' { $result = Invoke-AssignmentApi "/api/v1/assignments/$AssignmentId" 'GET' @{} $login.data.accessToken }
        'Create' { $result = Invoke-AssignmentApi '/api/v1/assignments' 'POST' $payload $login.data.accessToken }
        'Update' {
            $payload.version = $parsedVersion
            $result = Invoke-AssignmentApi "/api/v1/assignments/$AssignmentId" 'PUT' $payload $login.data.accessToken
        }
        'Delete' {
            [void](Invoke-AssignmentApi "/api/v1/assignments/${AssignmentId}?version=$parsedVersion" 'DELETE' @{} $login.data.accessToken)
            Write-Host 'Đã xóa bài tập. Môn học và học kỳ vẫn còn.' -ForegroundColor Green
        }
    }
    if ($Mode -ne 'Delete') { $result | ConvertTo-Json -Depth 6 }
    Write-Host 'Dữ liệu bài tập lấy từ PostgreSQL. Giao diện bài tập sẽ nối API ở đợt 4B.' -ForegroundColor Cyan
} catch {
    $failure = $_; $problem = $null
    try { $problem = $failure.ErrorDetails.Message | ConvertFrom-Json } catch { }
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa gọi được API tại $BaseUrl. Kiểm tra backend/cổng. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần thử bài tập chưa hoàn thành. Không tự gửi lại thao tác ghi nếu chưa kiểm tra kết quả từ List/Get.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-AssignmentApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
