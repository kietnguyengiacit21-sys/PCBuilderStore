PC BUILDER STORE — CATALOG ENRICHMENT PATCH

Applies on branch migration/java-spring-boot after commit 127d202 (the current pushed state checked on 2026-11-06).

WHAT THIS PATCH DOES
1. Adds frontend/src/product-specifications.ts. It reads the 176-row Vietnamese attribute dictionary already in the project, formats units and structured JSON values, groups detail-page specifications by hardware topic, adds product-card highlights, and groups comparison rows with difference highlighting.
2. Fixes scripts/enrich-catalog-dev.sql. The definitions CSV has 12 columns, but the previous SQL staging/COPY contract only had 9. The patch adds the missing 3 metadata columns and stores input mode, options, subtype and specification scope in the existing product_attribute_definitions.validation_json JSONB column. It does not add tables or alter the 35-table schema.
3. Adds scripts/prepare-catalog-verified-values.ps1. It creates seed/catalog-verified-attribute-values.csv from rows explicitly marked VERIFIED_EXACT_MODEL or VERIFIED_EXACT_VARIANT, validates JSON/type/source fields, merges approved existing entries, and refuses conflicts. NEEDS_REVIEW rows are never imported.
4. Makes scripts/enrich-catalog-dev.ps1 run that preparation before calling psql. Its local-only database guard is preserved.

APPLY
- Extract the ZIP contents directly into the root of your existing PCBuilderStore_Frontend_Preview working tree (merge/overwrite the scripts and frontend folders; do not copy the containing download folder as a nested directory).
- Open PowerShell at the repository root.
- Run: .\scripts\apply-catalog-enrichment-patch.ps1
- Review: git diff --check; git diff --stat; git status --short
- Review the generated CSV after running: .\scripts\prepare-catalog-verified-values.ps1

DATABASE SAFETY
The patch installer does not connect to PostgreSQL. It does not run migrations, DDL, seed imports, or any DB writes. The enrichment runner remains restricted to database pc_builder_store_dev on IPv6 loopback ::1, requires exactly 35 public base tables, and refuses other targets. Only run .\scripts\enrich-catalog-dev.ps1 after personally confirming that pc_builder_store_dev is your disposable local development database.

CURRENT EVIDENCE LIMIT
The evidence ledger currently contains 2,685 product/attribute rows across 150 products. 57 are verified exact-variant values (all GPUs in the current ledger); 2,628 remain NEEDS_REVIEW. This patch makes those 57 importable, but it does NOT pretend the other 2,628 values have been researched or verified. The 57 values refer to three exact ASUS GPU variants; don't extrapolate them to MSI/Gigabyte/Zotac/Radeon board variants unless the evidence is explicitly scoped to GPU_SILICON and the attribute is shared at silicon level.

IMPORTANT
- Prices and stock in catalog-150-products.csv remain DEMO values.
- Product images remain absent where image URLs are absent; no random images are introduced.
- The UI displays only values actually returned by the API. Missing data stays as — / is omitted; no fabricated specs.
- The API returns plain spec values; the frontend uses the local dictionary CSV for labels, units and grouping.
- No Git commit or push is included. Review and commit locally when satisfied.
