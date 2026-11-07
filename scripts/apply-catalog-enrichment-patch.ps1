$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$requiredPaths = @(
    'scripts\enrich-catalog-dev.sql',
    'scripts\enrich-catalog-dev.ps1',
    'scripts\prepare-catalog-verified-values.ps1',
    'backend-java\src\main\resources\catalog-attribute-definitions.csv',
    'seed\catalog-attribute-evidence.csv',
    'seed\catalog-verified-attribute-values.csv',
    'frontend\src\CatalogPage.tsx',
    'frontend\src\product-specifications.ts'
)
foreach ($relativePath in $requiredPaths) {
    $path = Join-Path $repoRoot $relativePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Missing required file: $relativePath. Extract all ZIP contents into the repository root first."
    }
}

function Read-NormalizedText([string]$Path) {
    $content = [System.IO.File]::ReadAllText($Path)
    $newline = if ($content.Contains("`r`n")) { "`r`n" } else { "`n" }
    return @{ Content = $content.Replace("`r`n", "`n"); Newline = $newline }
}

function Replace-ExactlyOnce {
    param(
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][string]$Old,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$New,
        [Parameter(Mandatory = $true)][string]$Description
    )
    $first = $Content.IndexOf($Old, [System.StringComparison]::Ordinal)
    if ($first -lt 0) {
        throw "Patch anchor not found: $Description. No project files have been changed."
    }
    $last = $Content.LastIndexOf($Old, [System.StringComparison]::Ordinal)
    if ($first -ne $last) {
        throw "Patch anchor is not unique: $Description. No project files have been changed."
    }
    return $Content.Substring(0, $first) + $New + $Content.Substring($first + $Old.Length)
}

function Write-NormalizedText([string]$Path, [string]$Content, [string]$Newline) {
    $final = $Content.Replace("`n", $Newline)
    [System.IO.File]::WriteAllText($Path, $final, [System.Text.UTF8Encoding]::new($false))
}

# Read all target files and prepare every change in memory first. If any anchor
# differs, the installer stops before writing any project file.
$sqlPath = Join-Path $repoRoot 'scripts\enrich-catalog-dev.sql'
$runnerPath = Join-Path $repoRoot 'scripts\enrich-catalog-dev.ps1'
$pagePath = Join-Path $repoRoot 'frontend\src\CatalogPage.tsx'
$sqlState = Read-NormalizedText $sqlPath
$runnerState = Read-NormalizedText $runnerPath
$pageState = Read-NormalizedText $pagePath
$sql = $sqlState.Content
$runner = $runnerState.Content
$page = $pageState.Content

# SQL: the dictionary is 12 columns wide; persist its form metadata in the
# existing validation_json JSONB field, without changing the schema.
$old = @'
    subtype text,
    PRIMARY KEY (product_type, code)
'@
$new = @'
    subtype text,
    input_mode text,
    options text,
    specification_scope text,
    PRIMARY KEY (product_type, code)
'@
$sql = Replace-ExactlyOnce -Content $sql -Old $old -New $new -Description 'SQL definition staging columns'

$old = @'
\copy catalog_attribute_definition_stage (product_type, code, label_vi, label_en, data_type, unit, filterable, build_critical, subtype) FROM 'backend-java/src/main/resources/catalog-attribute-definitions.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
'@
$new = @'
\copy catalog_attribute_definition_stage (product_type, code, label_vi, label_en, data_type, unit, filterable, build_critical, subtype, input_mode, options, specification_scope) FROM 'backend-java/src/main/resources/catalog-attribute-definitions.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')
'@
$sql = Replace-ExactlyOnce -Content $sql -Old $old -New $new -Description 'SQL definition CSV COPY columns'

$old = @'
           OR code !~ '^[a-z][a-z0-9_]*$'
           OR (product_type = 'ACCESSORY' AND subtype NOT IN ('MOUSE', 'KEYBOARD', 'MONITOR', 'HEADSET') AND code <> 'accessory_type')
'@
$new = @'
           OR code !~ '^[a-z][a-z0-9_]*$'
           OR COALESCE(input_mode, '') NOT IN ('', 'TEXT', 'TEXTAREA', 'NUMBER', 'BOOLEAN', 'SELECT', 'JSON_ARRAY')
           OR (input_mode = 'SELECT' AND COALESCE(btrim(options), '') = '')
           OR (input_mode = 'JSON_ARRAY' AND data_type <> 'JSON')
           OR (input_mode = 'BOOLEAN' AND data_type <> 'BOOLEAN')
           OR (input_mode = 'NUMBER' AND data_type NOT IN ('DECIMAL', 'INTEGER'))
           OR (product_type = 'ACCESSORY' AND subtype NOT IN ('MOUSE', 'KEYBOARD', 'MONITOR', 'HEADSET') AND code <> 'accessory_type')
'@
$sql = Replace-ExactlyOnce -Content $sql -Old $old -New $new -Description 'SQL definition metadata validation'

$old = @'
    (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, staged.code, staged.label_vi, staged.data_type, NULLIF(staged.unit, ''),
       staged.filterable, staged.build_critical
'@
$new = @'
    (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical, validation_json)
SELECT pt.product_type_id, staged.code, staged.label_vi, staged.data_type, NULLIF(staged.unit, ''),
       staged.filterable, staged.build_critical,
       jsonb_strip_nulls(jsonb_build_object(
           'inputMode', NULLIF(staged.input_mode, ''),
           'options', CASE WHEN NULLIF(staged.options, '') IS NULL THEN NULL ELSE to_jsonb(string_to_array(staged.options, '|')) END,
           'subtype', NULLIF(staged.subtype, ''),
           'specificationScope', NULLIF(staged.specification_scope, '')
       ))
'@
$sql = Replace-ExactlyOnce -Content $sql -Old $old -New $new -Description 'SQL attribute metadata insert'

$old = @'
    is_build_critical = EXCLUDED.is_build_critical;
'@
$new = @'
    is_build_critical = EXCLUDED.is_build_critical,
    validation_json = COALESCE(product_attribute_definitions.validation_json, '{}'::jsonb) || EXCLUDED.validation_json;
'@
$sql = Replace-ExactlyOnce -Content $sql -Old $old -New $new -Description 'SQL attribute metadata upsert'

# Generate the approved-values CSV before psql is invoked. Only rows with an
# exact model/variant verification status are eligible for import.
$old = @'
foreach ($requiredPath in @($sqlFile, $definitionsFile, $valuesFile)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required catalog enrichment file not found: $requiredPath"
    }
}
'@
$new = @'
foreach ($requiredPath in @($sqlFile, $definitionsFile, $valuesFile)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required catalog enrichment file not found: $requiredPath"
    }
}

$prepareValuesScript = Join-Path $PSScriptRoot "prepare-catalog-verified-values.ps1"
& $prepareValuesScript -RepoRoot $repoRoot
'@
$runner = Replace-ExactlyOnce -Content $runner -Old $old -New $new -Description 'verified evidence preparation hook'

# Frontend: use the per-type Vietnamese attribute dictionary for labels,
# units, grouped details and comparison rows.
$old = @'
import type {
  CatalogFacets,
  CatalogProduct,
  CatalogProductFilters,
  CatalogProductPage,
} from "./catalog-api";
'@
$new = @'
import type {
  CatalogFacets,
  CatalogProduct,
  CatalogProductFilters,
  CatalogProductPage,
} from "./catalog-api";
import {
  comparisonValuesDiffer,
  formatSpecificationValue,
  getProductHighlights,
  getSpecificationLabel,
  groupComparisonSpecifications,
  groupSpecifications,
} from "./product-specifications";
'@
$page = Replace-ExactlyOnce -Content $page -Old $old -New $new -Description 'frontend specification helper imports'

$old = @'
function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map(displayValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatAttribute(code: string): string {
  return code
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

'@
$old = $old.TrimEnd([char[]]"`r`n")
$page = Replace-ExactlyOnce -Content $page -Old $old -New '' -Description 'remove raw specification formatting helpers'

$old = @'
}) {
  const offer = product.offers[0];
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  return (
    <article className="flex flex-col overflow-hidden rounded border border-surface-container-high bg-surface-container-low">
'@
$new = @'
}) {
  const offer = product.offers[0];
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  const highlights = getProductHighlights(product.productType, product.specifications);
  return (
    <article className="flex flex-col overflow-hidden rounded border border-surface-container-high bg-surface-container-low">
'@
$page = Replace-ExactlyOnce -Content $page -Old $old -New $new -Description 'product card highlights data'

$old = @'
        {product.shortDescription && (
          <p className="mt-3 line-clamp-2 text-body-sm text-on-surface-variant">{product.shortDescription}</p>
        )}
        <div className="mt-auto pt-space-md">
'@
$new = @'
        {product.shortDescription && (
          <p className="mt-3 line-clamp-2 text-body-sm text-on-surface-variant">{product.shortDescription}</p>
        )}
        {highlights.length > 0 && (
          <ul className="mt-3 grid grid-cols-2 gap-x-space-md gap-y-1 border-t border-surface-container-high pt-space-sm">
            {highlights.map((item) => (
              <li key={item.code} className="min-w-0 text-body-xs text-on-surface-variant">
                <span className="block truncate">{item.label}</span>
                <span className="block truncate font-semibold text-on-surface">{item.value}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-space-md">
'@
$page = Replace-ExactlyOnce -Content $page -Old $old -New $new -Description 'product card specification highlights UI'

$old = @'
  const offer = product.offers[0];
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  return (
    <div className="mx-auto w-full max-w-7xl px-margin pb-space-3xl lg:px-margin-desktop">
'@
$new = @'
  const offer = product.offers[0];
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  const specificationGroups = groupSpecifications(product.productType, product.specifications);
  return (
    <div className="mx-auto w-full max-w-7xl px-margin pb-space-3xl lg:px-margin-desktop">
'@
$page = Replace-ExactlyOnce -Content $page -Old $old -New $new -Description 'product detail grouped specifications data'

$old = @'
      <section className="mt-space-2xl" aria-labelledby="specifications-title">
        <h2 id="specifications-title" className="font-headline-lg text-on-surface">Thông số kỹ thuật</h2>
        {Object.keys(product.specifications).length === 0 ? (
          <p className="mt-space-md text-body-sm text-on-surface-variant">Chưa có thông số kỹ thuật.</p>
        ) : (
          <dl className="mt-space-md grid gap-px overflow-hidden rounded border border-surface-container-high bg-surface-container-high sm:grid-cols-2">
            {Object.entries(product.specifications).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-space-md bg-surface-container-low p-space-md">
                <dt className="text-body-sm text-on-surface-variant">{formatAttribute(key)}</dt>
                <dd className="text-right text-body-sm text-on-surface">{displayValue(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
'@
$new = @'
      <section className="mt-space-2xl" aria-labelledby="specifications-title">
        <div className="flex flex-wrap items-end justify-between gap-space-sm">
          <div>
            <h2 id="specifications-title" className="font-headline-lg text-on-surface">Thông số kỹ thuật</h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">Thông số theo đúng model và phiên bản sản phẩm có dữ liệu.</p>
          </div>
          <span className="font-tech-code-sm text-body-xs text-on-surface-variant">{Object.keys(product.specifications).length} thông số</span>
        </div>
        {specificationGroups.length === 0 ? (
          <p className="mt-space-md rounded border border-surface-container-high bg-surface-container-low p-space-md text-body-sm text-on-surface-variant">Chưa có thông số kỹ thuật được xác minh cho sản phẩm này.</p>
        ) : (
          <div className="mt-space-lg space-y-space-xl">
            {specificationGroups.map((group) => (
              <section key={group.title} className="overflow-hidden rounded border border-surface-container-high">
                <h3 className="bg-surface-container-high px-space-md py-3 font-headline-sm text-on-surface">{group.title}</h3>
                <dl className="grid gap-px bg-surface-container-high sm:grid-cols-2">
                  {group.entries.map((entry) => (
                    <div key={entry.code} className="flex items-start justify-between gap-space-md bg-surface-container-low px-space-md py-3">
                      <dt className="text-body-sm text-on-surface-variant">{entry.label}</dt>
                      <dd className="max-w-[58%] text-right text-body-sm font-medium text-on-surface">{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        )}
      </section>
'@
$page = Replace-ExactlyOnce -Content $page -Old $old -New $new -Description 'product detail grouped specification UI'

$old = '  const specificationKeys = [...new Set(products.flatMap((product) => Object.keys(product.specifications)))].sort();'
$new = '  const specificationGroups = groupComparisonSpecifications(products);'
$page = Replace-ExactlyOnce -Content $page -Old $old -New $new -Description 'comparison grouped specification data'

$old = @'
              {specificationKeys.map((key) => (
                <tr key={key} className="border-b border-surface-container-high">
                  <th className="bg-surface-container-low p-space-md text-on-surface-variant">{formatAttribute(key)}</th>
                  {products.map((product) => <td key={product.modelCode} className="p-space-md">{displayValue(product.specifications[key])}</td>)}
                </tr>
              ))}
'@
$new = @'
              {specificationGroups.flatMap((group) => [
                <tr key={`group:${group.title}`} className="bg-surface-container-high">
                  <th colSpan={products.length + 1} className="px-space-md py-3 font-headline-sm text-on-surface">{group.title}</th>
                </tr>,
                ...group.codes.map((code) => {
                  const differs = comparisonValuesDiffer(products, code);
                  const labelProduct = products.find((product) => Object.prototype.hasOwnProperty.call(product.specifications, code)) ?? products[0];
                  return (
                    <tr key={`${group.title}:${code}`} className="border-b border-surface-container-high">
                      <th className="bg-surface-container-low p-space-md text-on-surface-variant">{getSpecificationLabel(labelProduct.productType, code)}</th>
                      {products.map((product) => (
                        <td
                          key={product.modelCode}
                          className={`p-space-md ${differs ? "bg-primary/5 font-semibold text-primary" : ""}`}
                        >
                          {formatSpecificationValue(product.productType, code, product.specifications[code])}
                        </td>
                      ))}
                    </tr>
                  );
                }),
              ])}
'@
$page = Replace-ExactlyOnce -Content $page -Old $old -New $new -Description 'comparison grouped and difference-highlighted rows'

# Prepare backups only after every patch anchor has been found exactly once.
$backupDirectory = Join-Path $env:TEMP ('PCBuilderStore-catalog-patch-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
foreach ($path in @($sqlPath, $runnerPath, $pagePath)) {
    Copy-Item -LiteralPath $path -Destination (Join-Path $backupDirectory ([IO.Path]::GetFileName($path)))
}

Write-NormalizedText -Path $sqlPath -Content $sql -Newline $sqlState.Newline
Write-NormalizedText -Path $runnerPath -Content $runner -Newline $runnerState.Newline
Write-NormalizedText -Path $pagePath -Content $page -Newline $pageState.Newline

Write-Host 'Catalog enrichment patch applied successfully.'
Write-Host 'No database connection, SQL execution, Git commit, or Git push was performed.'
Write-Host "Backups of modified files: $backupDirectory"
Write-Host 'Next: run .\scripts\prepare-catalog-verified-values.ps1 and review the generated CSV.'
