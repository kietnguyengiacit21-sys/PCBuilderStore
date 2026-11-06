$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$sqlFile = Join-Path $repoRoot "scripts\enrich-catalog-dev.sql"
$definitionsFile = Join-Path $repoRoot "backend-java\src\main\resources\catalog-attribute-definitions.csv"
$valuesFile = Join-Path $repoRoot "seed\catalog-verified-attribute-values.csv"

foreach ($requiredPath in @($sqlFile, $definitionsFile, $valuesFile)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required catalog enrichment file not found: $requiredPath"
    }
}

$psqlCandidates = @(
    (Join-Path $env:ProgramFiles "PostgreSQL\18\bin\psql.exe"),
    (Join-Path $env:ProgramFiles "PostgreSQL\17\bin\psql.exe"),
    (Join-Path $env:ProgramFiles "PostgreSQL\16\bin\psql.exe")
)
$psql = $psqlCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $psql) {
    throw "PostgreSQL psql.exe was not found. Install the PostgreSQL client or add psql.exe to PATH."
}

Write-Host "Applying approved catalog definitions to pc_builder_store_dev on ::1 only."
Write-Host "The script cannot modify products, offers, prices, stock, users, or the database schema."

& $psql -X -w -v ON_ERROR_STOP=1 -v "repo_root=$repoRoot" `
    -h "::1" -p 5432 -U postgres -d pc_builder_store_dev -f $sqlFile
if ($LASTEXITCODE -ne 0) {
    throw "Catalog enrichment SQL failed with exit code $LASTEXITCODE."
}

Write-Host "Catalog enrichment completed successfully."
