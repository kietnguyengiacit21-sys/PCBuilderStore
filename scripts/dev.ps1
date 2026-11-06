param(
    [switch]$BackendChild
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $repositoryRoot 'backend-java'
$frontendDirectory = Join-Path $repositoryRoot 'frontend'
$mavenWrapper = Join-Path $backendDirectory 'mvnw.cmd'
$frontendPackage = Join-Path $frontendDirectory 'package.json'
$dataSourceUrl = 'jdbc:postgresql://[::1]:5432/pc_builder_store_dev?ApplicationName=pcbs-demo-dev'

if ($BackendChild) {
    if ($env:SPRING_DATASOURCE_URL -ne $dataSourceUrl -or
        $env:SPRING_DATASOURCE_USERNAME -ne 'postgres' -or
        [string]::IsNullOrWhiteSpace($env:SPRING_DATASOURCE_PASSWORD)) {
        Write-Error 'Backend child is missing the required local pc_builder_store_dev datasource settings.'
        exit 1
    }

    Set-Location -LiteralPath $backendDirectory
    & $mavenWrapper spring-boot:run
    exit $LASTEXITCODE
}

$backendProcess = $null
$frontendProcess = $null
$cancelHandler = $null
$script:shutdownRequested = $false
$exitCode = 0

function Get-ListeningProcessIds([int]$Port) {
    if (-not (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)) {
        throw 'Cannot check listening ports: Get-NetTCPConnection is unavailable.'
    }

    return @(
        Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
    )
}

function Get-DescendantProcessIds([int]$RootProcessId) {
    $processes = @(Get-CimInstance Win32_Process -Property ProcessId, ParentProcessId)
    $pending = New-Object 'System.Collections.Generic.Queue[int]'
    $descendants = New-Object 'System.Collections.Generic.List[int]'
    $visited = New-Object 'System.Collections.Generic.HashSet[int]'
    $pending.Enqueue($RootProcessId)
    $null = $visited.Add($RootProcessId)

    while ($pending.Count -gt 0) {
        $parentId = $pending.Dequeue()
        foreach ($process in $processes) {
            $processId = [int]$process.ProcessId
            if ([int]$process.ParentProcessId -eq $parentId -and $visited.Add($processId)) {
                $descendants.Add($processId)
                $pending.Enqueue($processId)
            }
        }
    }

    return $descendants.ToArray()
}

function Stop-LaunchedProcessTree([System.Diagnostics.Process]$RootProcess, [string]$Label) {
    if ($null -eq $RootProcess) {
        return
    }

    try {
        $processIds = @(Get-DescendantProcessIds -RootProcessId $RootProcess.Id)
        for ($index = $processIds.Count - 1; $index -ge 0; $index--) {
            Stop-Process -Id $processIds[$index] -Force -ErrorAction SilentlyContinue
        }
        Stop-Process -Id $RootProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped launcher-owned $Label process tree."
    } catch {
        Write-Warning "Could not fully stop the launcher-owned $Label process tree: $($_.Exception.Message)"
    }
}

if (-not (Test-Path -LiteralPath $mavenWrapper -PathType Leaf)) {
    Write-Error "Spring Boot Maven wrapper not found: $mavenWrapper"
    exit 1
}
if (-not (Test-Path -LiteralPath $frontendPackage -PathType Leaf)) {
    Write-Error "Frontend workspace not found: $frontendDirectory"
    exit 1
}
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Error 'Java is not on PATH. Install/select Java 21 and try again.'
    exit 1
}
$previousErrorActionPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = 'Continue'
    $javaVersion = (& java -version 2>&1 | Out-String)
} finally {
    $ErrorActionPreference = $previousErrorActionPreference
}
if ($javaVersion -notmatch 'version "21([.]|")') {
    Write-Error 'Java 21 is required. Select a Java 21 runtime and try again.'
    exit 1
}
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
    Write-Error 'npm.cmd is not on PATH. Install Node.js 20.19+ and try again.'
    exit 1
}

foreach ($port in @(8080, 5173)) {
    $owners = @(Get-ListeningProcessIds -Port $port)
    if ($owners.Count -gt 0) {
        $ownerList = ($owners | ForEach-Object { "PID $_" }) -join ', '
        $service = if ($port -eq 8080) { 'Java backend' } else { 'Vite frontend' }
        Write-Error "Port $port is already occupied ($ownerList). $service was not started; stop the intended existing server yourself, then retry."
        exit 1
    }
}

$cancelHandler = [ConsoleCancelEventHandler]{
    param($sender, $eventArgs)
    $eventArgs.Cancel = $true
    $script:shutdownRequested = $true
}
[Console]::add_CancelKeyPress($cancelHandler)

try {
    Write-Host 'Starting PC Builder Store development services.'
    Write-Host 'Database target: pc_builder_store_dev on PostgreSQL at ::1:5432.'
    $securePassword = Read-Host 'PostgreSQL password for local development (input hidden)' -AsSecureString
    $passwordPointer = [IntPtr]::Zero

    try {
        $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
        $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
        $env:SPRING_DATASOURCE_URL = $dataSourceUrl
        $env:SPRING_DATASOURCE_USERNAME = 'postgres'
        $env:SPRING_DATASOURCE_PASSWORD = $plainPassword
        $backendArguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -BackendChild' -f $PSCommandPath

        Write-Host 'Launching Spring Boot in a separate PowerShell window...'
        $backendProcess = Start-Process `
            -FilePath (Join-Path $PSHOME 'powershell.exe') `
            -ArgumentList $backendArguments `
            -WorkingDirectory $backendDirectory `
            -PassThru
    } finally {
        Remove-Item Env:\SPRING_DATASOURCE_PASSWORD -ErrorAction SilentlyContinue
        Remove-Item Env:\SPRING_DATASOURCE_URL -ErrorAction SilentlyContinue
        Remove-Item Env:\SPRING_DATASOURCE_USERNAME -ErrorAction SilentlyContinue
        $plainPassword = $null
        if ($passwordPointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
        }
        if ($null -ne $securePassword) {
            $securePassword.Dispose()
        }
    }

    $backendReady = $false
    for ($attempt = 0; $attempt -lt 120 -and -not $script:shutdownRequested; $attempt++) {
        if ($backendProcess.HasExited) {
            throw 'Spring Boot exited before becoming healthy. Review the separate backend PowerShell window.'
        }
        try {
            $health = Invoke-RestMethod -Uri 'http://[::1]:8080/api/health/db' -TimeoutSec 2
            if ($health.status -eq 'ok') {
                $backendReady = $true
                break
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    if (-not $backendReady -and -not $script:shutdownRequested) {
        throw 'Spring Boot did not pass /api/health/db within 120 seconds. Review the backend window.'
    }

    if ($backendReady -and -not $script:shutdownRequested) {
        Write-Host 'Backend health check passed.'
        Write-Host 'Launching frontend with npm run dev --workspace=frontend...'
        $frontendProcess = Start-Process `
            -FilePath $npmCommand.Source `
            -ArgumentList @('run', 'dev', '--workspace=frontend') `
            -WorkingDirectory $repositoryRoot `
            -NoNewWindow `
            -PassThru

        $frontendReady = $false
        for ($attempt = 0; $attempt -lt 45 -and -not $script:shutdownRequested; $attempt++) {
            if ($frontendProcess.HasExited) {
                throw 'Frontend npm process exited before Vite became available.'
            }
            try {
                $null = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -TimeoutSec 2 -UseBasicParsing
                $frontendReady = $true
                break
            } catch {
                Start-Sleep -Seconds 1
            }
        }
        if (-not $frontendReady -and -not $script:shutdownRequested) {
            throw 'Vite did not become available at http://127.0.0.1:5173/ within 45 seconds.'
        }

        if ($frontendReady) {
            Write-Host 'Frontend is ready at http://127.0.0.1:5173/'
            Write-Host 'Press Ctrl+C here to stop both launcher-owned services.'
            while (-not $script:shutdownRequested) {
                if ($backendProcess.HasExited) {
                    throw 'The launcher-owned Spring Boot process exited unexpectedly.'
                }
                if ($frontendProcess.HasExited) {
                    throw 'The launcher-owned frontend process exited unexpectedly.'
                }
                $null = $frontendProcess.WaitForExit(500)
            }
        }
    }
} catch {
    Write-Host "Development launcher error: $($_.Exception.Message)" -ForegroundColor Red
    $exitCode = 1
} finally {
    Remove-Item Env:\SPRING_DATASOURCE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:\SPRING_DATASOURCE_USERNAME -ErrorAction SilentlyContinue
    Remove-Item Env:\SPRING_DATASOURCE_PASSWORD -ErrorAction SilentlyContinue
    if ($null -ne $cancelHandler) {
        [Console]::remove_CancelKeyPress($cancelHandler)
    }
    Stop-LaunchedProcessTree -RootProcess $frontendProcess -Label 'frontend'
    Stop-LaunchedProcessTree -RootProcess $backendProcess -Label 'backend'
}

exit $exitCode
