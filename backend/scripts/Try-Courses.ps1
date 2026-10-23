param(
    [ValidateSet('List', 'Get', 'Create', 'Update', 'Delete')][string]$Mode = 'List',
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$SemesterId = [guid]::Empty,
    [guid]$CourseId = [guid]::Empty,
    [Nullable[long]]$Version,
    [ValidateLength(0, 64)][string]$Code = '',
    [ValidateLength(0, 200)][string]$Name = '',
    [ValidateRange(1, 30)][int]$Credits = 3,
    [ValidateLength(0, 200)][string]$Teacher = '',
    [ValidateLength(0, 100)][string]$Room = '',
    [ValidateSet('STUDYING', 'COMPLETED', 'PLANNED')][string]$Status = 'STUDYING',
    [ValidateSet('lavender', 'mint', 'peach', 'blue')][string]$Color = 'lavender',
    [ValidateLength(0, 5000)][string]$Description = ''
)
$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
if ($Mode -in @('Create', 'Update') -and ($SemesterId -eq [guid]::Empty -or !$Code.Trim() -or !$Name.Trim())) { throw 'Create/Update cần SemesterId, Code và Name. Lấy ID học kỳ bằng Try-Semesters.ps1 -Mode List.' }
if ($Mode -in @('Get', 'Update', 'Delete') -and $CourseId -eq [guid]::Empty) { throw 'Cần CourseId từ danh sách môn học.' }
if ($Mode -in @('Update', 'Delete') -and ($null -eq $Version -or $Version -lt 0)) { throw 'Update/Delete cần Version mới nhất từ List/Get.' }
function Invoke-CourseApi([string]$Path, [string]$Method, [hashtable]$Payload, [string]$Token) {
    $arguments = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = @{}; TimeoutSec = 15 }
    if ($Token) { $arguments.Headers.Authorization = "Bearer $Token" }
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
    $login = Invoke-CourseApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    $payload = @{ semesterId = $SemesterId.ToString(); code = $Code; name = $Name; credits = $Credits; teacher = $Teacher; room = $Room; status = $Status; color = $Color; description = $Description }
    switch ($Mode) {
        'List' {
            $path = '/api/v1/courses'
            if ($SemesterId -ne [guid]::Empty) { $path += "?semesterId=$SemesterId" }
            $result = Invoke-CourseApi $path 'GET' @{} $login.data.accessToken
        }
        'Get' { $result = Invoke-CourseApi "/api/v1/courses/$CourseId" 'GET' @{} $login.data.accessToken }
        'Create' { $result = Invoke-CourseApi '/api/v1/courses' 'POST' $payload $login.data.accessToken }
        'Update' {
            $payload.version = [long]$Version
            $result = Invoke-CourseApi "/api/v1/courses/$CourseId" 'PUT' $payload $login.data.accessToken
        }
        'Delete' {
            [void](Invoke-CourseApi "/api/v1/courses/${CourseId}?version=$Version" 'DELETE' @{} $login.data.accessToken)
            Write-Host 'Đã xóa môn học. Học kỳ và các môn khác vẫn còn.' -ForegroundColor Green
        }
    }
    if ($Mode -ne 'Delete') { $result | ConvertTo-Json -Depth 6 }
    Write-Host 'Dữ liệu môn học lấy từ PostgreSQL; giao diện môn đã nối API ở đợt 3C.2.' -ForegroundColor Cyan
} catch {
    $failure = $_; $problem = $null
    try { $problem = $failure.ErrorDetails.Message | ConvertFrom-Json } catch { }
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa gọi được API tại $BaseUrl. Kiểm tra backend/cổng. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần thử môn học chưa hoàn thành. Xem thông báo phía trên; không cần xóa database.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-CourseApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
