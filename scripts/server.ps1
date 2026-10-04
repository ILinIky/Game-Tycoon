param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Start', 'Stop')]
    [string]$Action
)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimePath = Join-Path $projectRoot '.studio-zero'
$pidPath = Join-Path $runtimePath 'server.pid'
$vitePath = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$url = 'http://127.0.0.1:5180/'

function Test-GameProcess($ProcessInfo) {
    if (-not $ProcessInfo -or $ProcessInfo.Name -ne 'node.exe') { return $false }
    $command = ([string]$ProcessInfo.CommandLine).Replace('/', '\')
    return $command.IndexOf($projectRoot + '\', [StringComparison]::OrdinalIgnoreCase) -ge 0 `
        -and $command -match 'vite[\\].*vite\.js' `
        -and $command -match '--port\s+5180(?:\s|$)'
}

function Find-GameServer {
    if (Test-Path -LiteralPath $pidPath) {
        $storedPid = 0
        if ([int]::TryParse((Get-Content -LiteralPath $pidPath -Raw).Trim(), [ref]$storedPid)) {
            $candidate = Get-CimInstance Win32_Process -Filter "ProcessId = $storedPid"
            if (Test-GameProcess $candidate) { return $candidate }
        }
    }
    # Also recognize a server launched from the terminal, before these BAT files existed.
    return Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
        Where-Object { Test-GameProcess $_ } |
        Select-Object -First 1
}

try {
    $server = Find-GameServer
    if ($Action -eq 'Stop') {
        if ($server) {
            Stop-Process -Id $server.ProcessId -ErrorAction Stop
            Write-Host 'Studio Zero wurde gestoppt.'
        } else {
            Write-Host 'Studio Zero ist bereits gestoppt.'
        }
        if (Test-Path -LiteralPath $pidPath) { Remove-Item -LiteralPath $pidPath }
        exit 0
    }

    if ($server) {
        Write-Host "Studio Zero laeuft bereits: $url"
        Start-Process -FilePath $url -WindowStyle Hidden
        exit 0
    }

    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $nodeCommand) { throw 'Node.js fehlt. Bitte zuerst Node.js installieren.' }
    if (-not (Test-Path -LiteralPath $vitePath)) {
        throw 'Abhaengigkeiten fehlen. Im Projektordner zuerst npm install ausfuehren.'
    }
    New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
    $outLog = Join-Path $runtimePath 'server.log'
    $errorLog = Join-Path $runtimePath 'server-error.log'
    $arguments = '"' + $vitePath + '" --host 127.0.0.1 --port 5180 --strictPort'
    $started = Start-Process -FilePath $nodeCommand.Source -ArgumentList $arguments `
        -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $outLog -RedirectStandardError $errorLog
    Set-Content -LiteralPath $pidPath -Value $started.Id -Encoding ASCII

    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        $started.Refresh()
        if ($started.HasExited) {
            $details = if (Test-Path -LiteralPath $errorLog) { Get-Content -LiteralPath $errorLog -Raw } else { '' }
            throw "Der Server konnte nicht starten. Ist Port 5180 belegt? $details"
        }
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1
            if ($response.StatusCode -eq 200 -and $response.Content -match 'Studio Zero') {
                $ready = $true
                break
            }
        } catch { }
        Start-Sleep -Milliseconds 250
    }
    if (-not $ready) {
        # Kill only the process this invocation created; never an unrelated listener.
        $started.Refresh()
        if (-not $started.HasExited) { Stop-Process -Id $started.Id }
        throw "Start hat zu lange gedauert. Details stehen in $runtimePath."
    }
    Write-Host "Studio Zero gestartet: $url"
    Start-Process -FilePath $url -WindowStyle Hidden
    exit 0
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
