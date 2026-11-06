$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$productsPath = Join-Path $repoRoot "seed\catalog-150-products.csv"
$definitionsPath = Join-Path $repoRoot "backend-java\src\main\resources\catalog-attribute-definitions.csv"
$outputPath = Join-Path $repoRoot "seed\catalog-attribute-evidence.csv"

foreach ($requiredPath in @($productsPath, $definitionsPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required catalog evidence input not found: $requiredPath"
    }
}

$products = Import-Csv -LiteralPath $productsPath
$definitions = Import-Csv -LiteralPath $definitionsPath
if ($products.Count -ne 150) {
    throw "Expected 150 catalog models; found $($products.Count)."
}

$rows = foreach ($product in $products) {
    foreach ($definition in $definitions | Where-Object product_type -eq $product.product_type_code) {
        [pscustomobject][ordered]@{
            model_code = $product.model_code
            product_type = $product.product_type_code
            attribute_code = $definition.code
            data_type = $definition.data_type
            unit = $definition.unit
            value_json = ""
            source_url = ""
            source_locator = ""
            verification_status = "NEEDS_REVIEW"
            review_note = "No exact-variant source for this individual field value has been verified."
        }
    }
}

$csvLines = $rows | ConvertTo-Csv -NoTypeInformation
[System.IO.File]::WriteAllLines($outputPath, $csvLines, [System.Text.UTF8Encoding]::new($false))
Write-Host "Created $($rows.Count) unresolved model/attribute evidence rows at seed\catalog-attribute-evidence.csv."
