$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $repositoryRoot 'backend-java'
$mavenWrapper = Join-Path $backendDirectory 'mvnw.cmd'
$catalogCsv = Join-Path $repositoryRoot 'catalog-import-150-products.csv'
$evidenceCsv = Join-Path $repositoryRoot 'catalog-attribute-evidence-v10.csv'
$ledgerCsv = Join-Path $backendDirectory 'src/main/resources/catalog-internal/catalog-attribute-internal-ledger.csv'
$logDirectory = Join-Path $repositoryRoot 'logs'
$logPath = Join-Path $logDirectory 'catalog-import-v10.log'

foreach ($path in @($mavenWrapper, $catalogCsv, $evidenceCsv, $ledgerCsv)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Missing required file: $path"
    }
}

Write-Host 'Importing catalog v10 into local PostgreSQL database pc_builder_store_dev.'
Write-Host 'This uses the existing 35-table schema and keeps the current database; it does not reset it.'
$securePassword = Read-Host 'PostgreSQL password for user postgres' -AsSecureString
$passwordPointer = [IntPtr]::Zero
$plainPassword = $null
$exitCode = 1

try {
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    Set-Content -LiteralPath $logPath -Value "Catalog v10 import started at $(Get-Date -Format o)" -Encoding UTF8
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:5432/pc_builder_store_dev'
    $env:SPRING_DATASOURCE_USERNAME = 'postgres'
    $env:SPRING_DATASOURCE_PASSWORD = $plainPassword
    $env:SPRING_APPLICATION_JSON = '{"spring":{"main":{"web-application-type":"none"}},"catalog":{"import":{"enabled":true,"opt-in":"LOCAL_DEV_ONLY","apply":true,"csv":"../catalog-import-150-products.csv","evidence-csv":"../catalog-attribute-evidence-v10.csv"}}}'

    Push-Location -LiteralPath $backendDirectory
    try {
        $processOutput = & $mavenWrapper spring-boot:run 2>&1
        $exitCode = $LASTEXITCODE
        $processOutput | ForEach-Object {
            $line = $_.ToString()
            if ($plainPassword) {
                $line = $line.Replace($plainPassword, '[REDACTED]')
            }
            Write-Host $line
            Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
        }
    } finally {
        Pop-Location
    }
} finally {
    Remove-Item Env:\SPRING_DATASOURCE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:\SPRING_DATASOURCE_USERNAME -ErrorAction SilentlyContinue
    Remove-Item Env:\SPRING_DATASOURCE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:\SPRING_APPLICATION_JSON -ErrorAction SilentlyContinue
    $plainPassword = $null
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    if ($null -ne $securePassword) { $securePassword.Dispose() }
}

if ($exitCode -ne 0) {
    throw "Catalog import process ended with exit code $exitCode. Inspect the sanitized log at $logPath."
}

if (-not (Select-String -LiteralPath $logPath -SimpleMatch 'Development catalog import committed' -Quiet)) {
    throw "Catalog import process exited without the commit confirmation. Inspect the sanitized log at $logPath."
}

Write-Host "Catalog v10 import completed. Output saved to $logPath."
