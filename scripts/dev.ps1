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

function Get-PgPassPassword {
    $pgpassPath = Join-Path $env:APPDATA 'postgresql\pgpass.conf'
    if (-not (Test-Path -LiteralPath $pgpassPath -PathType Leaf)) {
        return $null
    }

    foreach ($line in [IO.File]::ReadAllLines($pgpassPath)) {
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) {
            continue
        }

        $fields = New-Object 'System.Collections.Generic.List[string]'
        $field = New-Object System.Text.StringBuilder
        $escaped = $false
        foreach ($character in $line.ToCharArray()) {
            if ($escaped) {
                [void]$field.Append($character)
                $escaped = $false
                continue
            }
            if ($character -eq [char]92) {
                $escaped = $true
                continue
            }
            if ($character -eq ':') {
                $fields.Add($field.ToString())
                [void]$field.Clear()
                continue
            }
            [void]$field.Append($character)
        }
        $fields.Add($field.ToString())

        $hostMatches = @('*', 'localhost', '127.0.0.1', '::1', '[::1]') -contains $fields[0]
        if ($fields.Count -eq 5 -and $hostMatches -and $fields[1] -eq '5432' -and $fields[2] -eq 'pc_builder_store_dev' -and $fields[3] -eq 'postgres' -and -not [string]::IsNullOrEmpty($fields[4])) {
            return $fields[4]
        }
    }

    return $null
}

if ($BackendChild) {
    if ($env:SPRING_DATASOURCE_URL -ne $dataSourceUrl -or
        $env:SPRING_DATASOURCE_USERNAME -ne 'postgres' -or
        [string]::IsNullOrWhiteSpace($env:SPRING_DATASOURCE_PASSWORD) -or
        $env:SERVER_PORT -ne '8081') {
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
$backendReady = $false
$frontendReady = $false

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

$backendOwners = @(Get-ListeningProcessIds -Port 8081)
if ($backendOwners.Count -gt 0) {
    try {
        $backendIdentity = Invoke-RestMethod -Uri 'http://127.0.0.1:8081/api/health' -TimeoutSec 2
        $backendDatabaseHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:8081/api/health/db' -TimeoutSec 2
        $backendReady = $backendIdentity.status -eq 'ok' -and
            $backendIdentity.service -eq 'pc-builder-store-api' -and
            $backendDatabaseHealth.status -eq 'ok'
    } catch {
        $backendReady = $false
    }
    if (-not $backendReady) {
        Write-Error 'Port 8081 is occupied by a service that could not be verified as the healthy PCBuilderStore backend. No process was stopped.'
        exit 1
    }
    Write-Host 'Reusing the healthy PCBuilderStore backend already running on port 8081.'
}

$frontendOwners = @(Get-ListeningProcessIds -Port 5173)
if ($frontendOwners.Count -gt 0) {
    try {
        $frontendResponse = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -TimeoutSec 2 -UseBasicParsing
        $frontendContent = [string]$frontendResponse.Content
        $frontendReady = $frontendResponse.StatusCode -eq 200 -and
            $frontendContent -match '<title>\s*PC Builder Store\s*</title>' -and
            $frontendContent -match '/@vite/client'
    } catch {
        $frontendReady = $false
    }
    if (-not $frontendReady) {
        Write-Error 'Port 5173 is occupied by a service that could not be verified as the PCBuilderStore Vite frontend. No process was stopped.'
        exit 1
    }
    Write-Host 'Reusing the PCBuilderStore Vite frontend already running on port 5173.'
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
    $plainPassword = [Environment]::GetEnvironmentVariable('SPRING_DATASOURCE_PASSWORD')
    if ([string]::IsNullOrWhiteSpace($plainPassword)) {
        $plainPassword = Get-PgPassPassword
    }
    $securePassword = $null
    $passwordPointer = [IntPtr]::Zero

    try {
        if ([string]::IsNullOrWhiteSpace($plainPassword)) {
            $securePassword = Read-Host 'PostgreSQL password for local development (input hidden)' -AsSecureString
            $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
            $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
        }
        if (-not $backendReady) {
            $env:SPRING_DATASOURCE_URL = $dataSourceUrl
            $env:SPRING_DATASOURCE_USERNAME = 'postgres'
            $env:SPRING_DATASOURCE_PASSWORD = $plainPassword
            $env:SERVER_PORT = '8081'
            $backendArguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -BackendChild' -f $PSCommandPath

            Write-Host 'Launching Spring Boot in a separate PowerShell window on port 8081...'
            $backendProcess = Start-Process `
                -FilePath (Join-Path $PSHOME 'powershell.exe') `
                -ArgumentList $backendArguments `
                -WorkingDirectory $backendDirectory `
                -PassThru
        }
    } finally {
        Remove-Item Env:\SPRING_DATASOURCE_PASSWORD -ErrorAction SilentlyContinue
        Remove-Item Env:\SPRING_DATASOURCE_URL -ErrorAction SilentlyContinue
        Remove-Item Env:\SPRING_DATASOURCE_USERNAME -ErrorAction SilentlyContinue
        Remove-Item Env:\SERVER_PORT -ErrorAction SilentlyContinue
        $plainPassword = $null
        if ($passwordPointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
        }
        if ($null -ne $securePassword) {
            $securePassword.Dispose()
        }
    }

    if (-not $backendReady) {
        for ($attempt = 0; $attempt -lt 120 -and -not $script:shutdownRequested; $attempt++) {
            if ($backendProcess.HasExited) {
                throw 'Spring Boot exited before becoming healthy. Review the separate backend PowerShell window.'
            }
            try {
                $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8081/api/health/db' -TimeoutSec 2
                if ($health.status -eq 'ok') {
                    $backendReady = $true
                    break
                }
            } catch {
                Start-Sleep -Seconds 1
            }
        }
        if (-not $backendReady -and -not $script:shutdownRequested) {
            throw 'Spring Boot did not pass /api/health/db on port 8081 within 120 seconds. Review the backend window.'
        }
    }

    if ($backendReady -and -not $script:shutdownRequested) {
        Write-Host 'Backend health check passed.'
        if (-not $frontendReady) {
            $env:API_PROXY_TARGET = 'http://localhost:8081'
            try {
                Write-Host 'Launching frontend with npm run dev --workspace=frontend on port 5173...'
                $frontendProcess = Start-Process `
                    -FilePath $npmCommand.Source `
                    -ArgumentList @('run', 'dev', '--workspace=frontend', '--', '--port', '5173', '--strictPort') `
                    -WorkingDirectory $repositoryRoot `
                    -NoNewWindow `
                    -PassThru
            } finally {
                Remove-Item Env:\API_PROXY_TARGET -ErrorAction SilentlyContinue
            }

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
        }

        if ($frontendReady) {
            Write-Host 'Frontend is ready at http://127.0.0.1:5173/'
            Write-Host 'Press Ctrl+C here to stop only services started by this launcher.'
            while (-not $script:shutdownRequested) {
                if ($null -ne $backendProcess -and $backendProcess.HasExited) {
                    throw 'The launcher-owned Spring Boot process exited unexpectedly.'
                }
                if ($null -ne $frontendProcess -and $frontendProcess.HasExited) {
                    throw 'The launcher-owned frontend process exited unexpectedly.'
                }
                if ($null -ne $frontendProcess) {
                    $null = $frontendProcess.WaitForExit(500)
                } else {
                    Start-Sleep -Milliseconds 500
                }
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
