param(
    [ValidateSet('List', 'Get', 'Create', 'Update', 'Delete')][string]$Mode = 'List',
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$CourseId = [guid]::Empty,
    [guid]$SemesterId = [guid]::Empty,
    [guid]$ConfigurationId = [guid]::Empty,
    [string]$InputFile = '',
    [string]$Version = ''
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
$parsedBase = $null
if (![Uri]::TryCreate($BaseUrl, [UriKind]::Absolute, [ref]$parsedBase) -or $parsedBase.Scheme -notin @('http', 'https') -or $parsedBase.UserInfo) { throw 'BaseUrl cần địa chỉ HTTP/HTTPS của backend, không kèm thông tin đăng nhập.' }
if ($Mode -eq 'Create' -and $CourseId -eq [guid]::Empty) { throw 'Create cần CourseId của môn đã lưu.' }
if ($Mode -eq 'Get' -and $CourseId -eq [guid]::Empty -and $ConfigurationId -eq [guid]::Empty) { throw 'Get cần ConfigurationId hoặc CourseId.' }
if ($Mode -in @('Update', 'Delete') -and $ConfigurationId -eq [guid]::Empty) { throw 'Update/Delete cần ConfigurationId từ List/Get.' }
$parsedVersion = [long]0
if ($Mode -in @('Update', 'Delete') -and ($Version -notmatch '^\d+$' -or ![long]::TryParse($Version, [ref]$parsedVersion))) { throw 'Update/Delete cần Version nguyên không âm mới nhất từ Get.' }
$payload = $null
if ($Mode -in @('Create', 'Update')) {
    if (!$InputFile -or !(Test-Path -LiteralPath $InputFile -PathType Leaf)) { throw 'Create/Update cần InputFile JSON. Sao chép một file mẫu từ api/samples/grade-configurations rồi sửa bản sao.' }
    $payload = Get-Content -LiteralPath $InputFile -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($null -eq $payload -or $payload -is [Array] -or $payload -isnot [pscustomobject]) { throw 'InputFile cần một object JSON.' }
    $names = @($payload.PSObject.Properties.Name)
    if (@($names | Where-Object { $_ -notin @('assessment','parts') }).Count -or 'assessment' -notin $names -or 'parts' -notin $names) { throw 'File chỉ chứa assessment và parts; không gửi điểm, trọng số, id tài khoản hay version trong file.' }
    if ($payload.assessment -notin @('THEORY','PRACTICAL') -or $payload.parts -isnot [Array] -or $payload.parts.Count -gt 10) { throw 'assessment là THEORY/PRACTICAL; parts là mảng 0–10 cột.' }
    foreach ($column in $payload.parts) {
        if ($null -eq $column -or $column -isnot [pscustomobject] -or @($column.PSObject.Properties.Name | Where-Object { $_ -notin @('id','name','kind','project') }).Count) { throw 'Mỗi cột chỉ có id, name, kind và project nếu là BTL; không gửi score hoặc weight.' }
        if ($column.project -and @($column.project.PSObject.Properties.Name | Where-Object { $_ -notin @('target','share') }).Count) { throw 'project chỉ có target và share; chưa gửi điểm phần còn lại ở đợt 5A.1.' }
    }
    if ($Mode -eq 'Update') { $payload | Add-Member -NotePropertyName version -NotePropertyValue $parsedVersion }
}
function Invoke-GradeConfigurationApi([string]$Path, [string]$Method, $Payload, [string]$Token) {
    $arguments = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = @{}; TimeoutSec = 15 }
    if ($Token) { $arguments.Headers.Authorization = "Bearer $Token" }
    if ($Path.StartsWith('/api/v1/auth/')) { $arguments.Headers['X-Auth-Transport'] = 'body' }
    if ($Method -in @('POST','PUT')) {
        $arguments.ContentType = 'application/json; charset=utf-8'
        $arguments.Body = [Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Depth 12 -Compress))
    }
    # Windows PowerShell 5.1 otherwise decodes JSON without a charset using
    # Latin-1. The API sends UTF-8 JSON; decode its bytes explicitly.
    $response = Invoke-WebRequest @arguments -UseBasicParsing
    if ($response.StatusCode -eq 204 -or $response.RawContentStream.Length -eq 0) { return }
    [Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()) | ConvertFrom-Json
}
$password = $null; $login = $null; $secret = $null
try {
    $email = Read-Host 'Email tài khoản đã đăng ký'
    $secret = Read-Host 'Mật khẩu (nhập ẩn)' -AsSecureString
    $password = [Net.NetworkCredential]::new('', $secret).Password
    $login = Invoke-GradeConfigurationApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    switch ($Mode) {
        'List' {
            $query = @()
            if ($CourseId -ne [guid]::Empty) { $query += "courseId=$CourseId" }
            if ($SemesterId -ne [guid]::Empty) { $query += "semesterId=$SemesterId" }
            $path = '/api/v1/grade-configurations'
            if ($query.Count) { $path += '?' + ($query -join '&') }
            $result = Invoke-GradeConfigurationApi $path 'GET' $null $login.data.accessToken
        }
        'Get' {
            $path = "/api/v1/courses/$CourseId/grade-configuration"
            if ($ConfigurationId -ne [guid]::Empty) { $path = "/api/v1/grade-configurations/$ConfigurationId" }
            $result = Invoke-GradeConfigurationApi $path 'GET' $null $login.data.accessToken
        }
        'Create' { $result = Invoke-GradeConfigurationApi "/api/v1/courses/$CourseId/grade-configuration" 'POST' $payload $login.data.accessToken }
        'Update' { $result = Invoke-GradeConfigurationApi "/api/v1/grade-configurations/$ConfigurationId" 'PUT' $payload $login.data.accessToken }
        'Delete' {
            [void](Invoke-GradeConfigurationApi "/api/v1/grade-configurations/${ConfigurationId}?version=$parsedVersion" 'DELETE' $null $login.data.accessToken)
            Write-Host 'Đã xóa cấu hình và các cột của cấu hình; môn, bài tập và lịch vẫn còn.' -ForegroundColor Green
        }
    }
    if ($Mode -ne 'Delete') { $result | ConvertTo-Json -Depth 12 }
    Write-Host 'Đây là cấu hình cột lưu tại PostgreSQL. Đợt 5A.1 chưa lưu điểm số/GPA và chưa nối màn Điểm của app.' -ForegroundColor Cyan
} catch {
    $failure = $_; $problem = Read-ApiProblem $failure
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa gọi được API tại $BaseUrl. Kiểm tra backend/cổng. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Lần thử cấu hình điểm chưa hoàn thành. Nếu mất phản hồi lúc ghi, dùng List/Get đối chiếu trước; không tự gửi lại.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-GradeConfigurationApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
