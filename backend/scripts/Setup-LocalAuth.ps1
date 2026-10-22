$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path $PSScriptRoot -Parent
$authFolder = Join-Path $backendRoot '.local\auth'
& java (Join-Path $PSScriptRoot 'CreateLocalAuthKeys.java') $authFolder
if ($LASTEXITCODE -ne 0) { throw 'Không chuẩn bị được khóa JWT cục bộ. Không xóa/đổi khóa đang có khi chưa xác định nguyên nhân.' }
