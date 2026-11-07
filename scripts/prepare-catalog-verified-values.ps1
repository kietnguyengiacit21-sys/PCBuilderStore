param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
$evidencePath = Join-Path $RepoRoot "seed\catalog-attribute-evidence.csv"
$outputPath = Join-Path $RepoRoot "seed\catalog-verified-attribute-values.csv"

if (-not (Test-Path -LiteralPath $evidencePath -PathType Leaf)) {
    throw "Required catalog evidence file not found: $evidencePath"
}

$acceptedStatuses = @("VERIFIED_EXACT_MODEL", "VERIFIED_EXACT_VARIANT")
$requiredColumns = @(
    "model_code", "attribute_code", "data_type", "value_json",
    "unit", "source_url", "source_locator", "verification_status"
)

$evidence = Import-Csv -LiteralPath $evidencePath
if ($null -eq $evidence -or $evidence.Count -eq 0) {
    throw "Catalog evidence CSV contains no rows."
}
foreach ($column in $requiredColumns) {
    if (-not ($evidence[0].PSObject.Properties.Name -contains $column)) {
        throw "Evidence CSV is missing required column '$column'."
    }
}

$approved = [System.Collections.Generic.Dictionary[string, object]]::new([System.StringComparer]::Ordinal)
$approvedEvidence = @($evidence | Where-Object {
    $_.verification_status -ceq "VERIFIED_EXACT_MODEL" -or
    $_.verification_status -ceq "VERIFIED_EXACT_VARIANT"
})

foreach ($row in $approvedEvidence) {
    if ($row.verification_status -cnotin $acceptedStatuses) {
        throw "Unapproved verification status for $($row.model_code)/$($row.attribute_code)."
    }
    foreach ($field in @("model_code", "attribute_code", "data_type", "value_json", "source_url", "source_locator", "verification_status")) {
        if ([string]::IsNullOrWhiteSpace([string]$row.$field)) {
            throw "Verified evidence is missing '$field' for $($row.model_code)/$($row.attribute_code)."
        }
    }
    if (-not [string]::IsNullOrEmpty([string]$row.unit) -and [string]::IsNullOrWhiteSpace([string]$row.unit)) {
        throw "Invalid unit for $($row.model_code)/$($row.attribute_code)."
    }
    if ($row.attribute_code -cnotmatch '^[a-z][a-z0-9_]*$') {
        throw "Invalid attribute code for $($row.model_code)/$($row.attribute_code)."
    }

    $sourceUri = $null
    if (-not [Uri]::TryCreate([string]$row.source_url, [UriKind]::Absolute, [ref]$sourceUri) -or
        $sourceUri.Scheme -notin @("http", "https") -or
        [string]::IsNullOrWhiteSpace($sourceUri.Host)) {
        throw "Invalid source URL for $($row.model_code)/$($row.attribute_code)."
    }

    try {
        $decoded = ConvertFrom-Json -InputObject $row.value_json -ErrorAction Stop
    }
    catch {
        throw "Invalid JSON value for $($row.model_code)/$($row.attribute_code): $($_.Exception.Message)"
    }

    switch ($row.data_type) {
        "TEXT" {
            if ($decoded -isnot [string]) { throw "TEXT value is not a JSON string: $($row.model_code)/$($row.attribute_code)." }
        }
        "DECIMAL" {
            if ($decoded -isnot [ValueType] -or $decoded -is [bool]) { throw "DECIMAL value is not numeric: $($row.model_code)/$($row.attribute_code)." }
        }
        "INTEGER" {
            if ($decoded -isnot [ValueType] -or $decoded -is [bool] -or [decimal]$decoded -ne [decimal]::Truncate([decimal]$decoded)) {
                throw "INTEGER value is not an integer: $($row.model_code)/$($row.attribute_code)."
            }
        }
        "BOOLEAN" {
            if ($decoded -isnot [bool]) { throw "BOOLEAN value is not true/false: $($row.model_code)/$($row.attribute_code)." }
        }
        "JSON" { }
        default { throw "Unsupported data type '$($row.data_type)' for $($row.model_code)/$($row.attribute_code)." }
    }

    if ($row.data_type -cnotin @("TEXT", "DECIMAL", "INTEGER", "BOOLEAN", "JSON")) {
        throw "Unsupported data type '$($row.data_type)' for $($row.model_code)/$($row.attribute_code)."
    }

    $key = "$($row.model_code)|$($row.attribute_code)"
    $normalized = [ordered]@{
        model_code = $row.model_code
        attribute_code = $row.attribute_code
        data_type = $row.data_type
        value_json = $row.value_json
        unit = [string]$row.unit
        source_url = $row.source_url
        source_locator = $row.source_locator
        verification_status = $row.verification_status
    }
    $signature = ($normalized | ConvertTo-Json -Compress)
    if ($approved.ContainsKey($key) -and $approved[$key].signature -cne $signature) {
        throw "Conflicting approved evidence for $key. Resolve the conflict manually; nothing was written."
    }
    if (-not $approved.ContainsKey($key)) {
        $approved.Add($key, @{ signature = $signature; row = [pscustomobject]$normalized })
    }
}

$orderedRows = @($approved.Values | ForEach-Object { $_.row } | Sort-Object model_code, attribute_code)
$lines = @($orderedRows | ConvertTo-Csv -NoTypeInformation)
$header = '"model_code","attribute_code","data_type","value_json","unit","source_url","source_locator","verification_status"'
if ($lines.Count -eq 0 -or $lines[0] -ne $header) {
    throw "Generated CSV header did not match the SQL import contract."
}

[System.IO.File]::WriteAllLines($outputPath, $lines, [System.Text.UTF8Encoding]::new($false))
Write-Host "Prepared $($orderedRows.Count) exact-model/exact-variant verified attribute values. NEEDS_REVIEW rows were excluded."
