param(
    [ValidateSet('List', 'Create', 'Update', 'Delete')][string]$Mode = 'List',
    [string]$BaseUrl = 'http://localhost:8080',
    [ValidateRange(1, 3)][int]$Term = 1,
    [ValidateRange(1900, 2099)][int]$StartYear = (Get-Date).Year,
    [ValidateSet('CURRENT', 'UPCOMING', 'COMPLETED')][string]$Status = 'UPCOMING',
    [ValidateLength(0, 2000)][string]$Note = '',
    [guid]$SemesterId = [guid]::Empty,
    [Nullable[long]]$Version
)
$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
if ($Mode -in @('Update', 'Delete') -and ($SemesterId -eq [guid]::Empty -or $null -eq $Version -or $Version -lt 0)) {
    throw 'Update/Delete cần SemesterId và Version mới nhất từ lệnh List.'
}
function Invoke-SemesterApi([string]$Path, [string]$Method, [hashtable]$Payload, [string]$Token) {
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
    $login = Invoke-SemesterApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    $payload = @{ term = $Term; startYear = $StartYear; status = $Status; note = $Note }
    switch ($Mode) {
        'List' { $result = Invoke-SemesterApi '/api/v1/semesters' 'GET' @{} $login.data.accessToken }
        'Create' { $result = Invoke-SemesterApi '/api/v1/semesters' 'POST' $payload $login.data.accessToken }
        'Update' {
            $payload.version = [long]$Version
            $result = Invoke-SemesterApi "/api/v1/semesters/$SemesterId" 'PUT' $payload $login.data.accessToken
        }
        'Delete' {
            [void](Invoke-SemesterApi "/api/v1/semesters/${SemesterId}?version=$Version" 'DELETE' @{} $login.data.accessToken)
            Write-Host 'Đã xóa học kỳ trống. Các học kỳ khác được giữ nguyên.' -ForegroundColor Green
        }
    }
    if ($Mode -ne 'Delete') { $result | ConvertTo-Json -Depth 6 }
    Write-Host 'Dữ liệu phía trên lấy từ PostgreSQL. Giao diện app sẽ được nối ở đợt 3C.' -ForegroundColor Cyan
} catch {
    $failure = $_
    $problem = $null
    try { $problem = $failure.ErrorDetails.Message | ConvertFrom-Json } catch { }
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa gọi được API tại $BaseUrl. Kiểm tra backend và cổng đang chạy. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần thử học kỳ chưa hoàn thành. Xem thông báo phía trên; không cần xóa database.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-SemesterApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
