# Windows PowerShell 5.1 can leave ErrorDetails empty for an HTTP error.
# Read the structured ProblemDetail without printing the raw response or credentials.
function Read-ApiProblem([Management.Automation.ErrorRecord]$Failure) {
    try {
        $problem = $Failure.ErrorDetails.Message | ConvertFrom-Json
        if ($problem.code) { return $problem }
    } catch { }
    $reader = $null
    try {
        $response = $Failure.Exception.Response
        if ($null -eq $response) { return $null }
        if ($response.PSObject.Methods['GetResponseStream']) {
            $stream = $response.GetResponseStream()
            if ($stream.CanSeek) { $stream.Position = 0 }
            $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::UTF8)
            $raw = $reader.ReadToEnd()
        } else {
            $raw = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        }
        $problem = $raw | ConvertFrom-Json
        if ($problem.code) { return $problem }
    } catch { } finally { if ($reader) { $reader.Dispose() } }
    return $null
}
