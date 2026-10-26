param(
    [ValidateSet('Get','Export','Update')][string]$Mode = 'Get',
    [string]$BaseUrl = 'http://localhost:8080',
    [guid]$ConfigurationId = [guid]::Empty,
    [string]$InputFile = '',
    [string]$OutputFile = ''
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Read-ApiProblem.ps1')
$BaseUrl = $BaseUrl.TrimEnd('/')
$parsedBase = $null
if (![Uri]::TryCreate($BaseUrl,[UriKind]::Absolute,[ref]$parsedBase) -or $parsedBase.Scheme -notin @('http','https') -or $parsedBase.UserInfo) { throw 'BaseUrl cần địa chỉ HTTP/HTTPS backend, không kèm thông tin đăng nhập.' }
if ($ConfigurationId -eq [guid]::Empty) { throw 'Cần ConfigurationId từ Try-GradeConfigurations.ps1 -Mode List.' }
$payload = $null
if ($Mode -eq 'Update') {
    if (!$InputFile -or !(Test-Path -LiteralPath $InputFile -PathType Leaf)) { throw 'Update cần InputFile tạo từ Mode Export, rồi sửa score/remainderScore trong bản sao đó.' }
    $payload = Get-Content -LiteralPath $InputFile -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($null -eq $payload -or $payload -isnot [pscustomobject]) { throw 'InputFile cần một object JSON.' }
    $names = @($payload.PSObject.Properties.Name)
    if ('version' -notin $names -or 'parts' -notin $names -or @($names | Where-Object { $_ -notin @('version','parts') }).Count) { throw 'File chỉ có version và parts; dùng Export, không chép toàn bộ response Get.' }
    if (($payload.version -isnot [int] -and $payload.version -isnot [long]) -or $payload.version -lt 0) { throw 'version trong file phải là số nguyên không âm lấy từ Export/Get.' }
    if ($payload.parts -isnot [Array] -or $payload.parts.Count -gt 10) { throw 'parts phải là mảng 0–10 cột khớp đầy đủ cấu hình.' }
    foreach ($column in $payload.parts) {
        if ($null -eq $column -or $column -isnot [pscustomobject]) { throw 'Mỗi cột cần object có id, score và remainderScore.' }
        $keys = @($column.PSObject.Properties.Name)
        if (@($keys | Where-Object { $_ -notin @('id','score','remainderScore') }).Count -or 'id' -notin $keys -or 'score' -notin $keys -or 'remainderScore' -notin $keys) { throw 'Mỗi cột chỉ có id, score và remainderScore; không bỏ trường điểm, dùng null nếu chưa nhập hoặc muốn xóa.' }
    }
}
if ($Mode -eq 'Export') {
    if (!$OutputFile) { throw 'Export cần OutputFile, ví dụ .local/diem-test.json.' }
    $OutputFile = [IO.Path]::GetFullPath($OutputFile)
    if (Test-Path -LiteralPath $OutputFile) { throw 'File đích đã tồn tại. Dùng tên mới để giữ bản điểm đang sửa; Export không ghi đè file.' }
    if (!(Test-Path -LiteralPath (Split-Path $OutputFile -Parent) -PathType Container)) { throw 'Thư mục chứa OutputFile chưa tồn tại.' }
}
function Invoke-GradeScoresApi([string]$Path,[string]$Method,$Payload,[string]$Token) {
    $arguments = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = @{}; TimeoutSec = 15 }
    if ($Token) { $arguments.Headers.Authorization = "Bearer $Token" }
    if ($Path.StartsWith('/api/v1/auth/')) { $arguments.Headers['X-Auth-Transport'] = 'body' }
    if ($Method -in @('POST','PUT')) {
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
    $login = Invoke-GradeScoresApi '/api/v1/auth/login' 'POST' @{ email = $email; password = $password }
    $password = $null
    $path = "/api/v1/grade-configurations/$ConfigurationId/scores"
    if ($Mode -eq 'Update') { $result = Invoke-GradeScoresApi $path 'PUT' $payload $login.data.accessToken }
    else { $result = Invoke-GradeScoresApi $path 'GET' $null $login.data.accessToken }
    if ($Mode -eq 'Export') {
        # Keep existing values and the version from this same snapshot. Never
        # fetch a fresh version automatically when submitting a possibly stale file.
        $parts = @($result.data.parts | ForEach-Object { @{ id = $_.id; score = $_.score; remainderScore = $_.remainderScore } })
        $export = @{ version = $result.data.version; parts = $parts } | ConvertTo-Json -Depth 12
        $stream = [IO.File]::Open($OutputFile,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
        try {
            $bytes = [Text.Encoding]::UTF8.GetBytes($export)
            $stream.Write($bytes,0,$bytes.Length)
        } finally { $stream.Dispose() }
        Write-Host "Đã xuất bộ cột, điểm hiện tại và version vào $OutputFile. Sửa bản này rồi dùng Update." -ForegroundColor Green
    } else { $result | ConvertTo-Json -Depth 12 }
    Write-Host 'null là chưa nhập/xóa điểm; 0 là điểm thật. 5A.2A chưa tính tổng kết/GPA và chưa nối màn Điểm.' -ForegroundColor Cyan
} catch {
    $failure = $_; $problem = Read-ApiProblem $failure
    if ($problem.code) {
        Write-Host "$($problem.code): $($problem.detail)" -ForegroundColor Red
        foreach ($item in $problem.errors) { Write-Host "  $($item.field): $($item.message)" }
    } else { Write-Host "Chưa hoàn thành tại $BaseUrl. Kiểm tra backend/cổng/file. Mã lỗi: $($failure.FullyQualifiedErrorId)" -ForegroundColor Red }
    throw 'Nếu lưu mất phản hồi hoặc version cũ, dùng Get đối chiếu trước; không tự gửi lại hoặc tự thay version bằng bản mới.'
} finally {
    if ($login -and $login.data.refreshToken) {
        try { [void](Invoke-GradeScoresApi '/api/v1/auth/logout' 'POST' @{ refreshToken = $login.data.refreshToken }) } catch { }
    }
    $password = $null; $login = $null
    if ($secret) { $secret.Dispose() }
}
