# CATALOG V11 — AGENT IMPLEMENTATION BRIEF

## Objective

Bring PC Builder Store product detail data presentation closer to the technical-information depth of PCMarket. The v11 handoff extends the current catalog dictionary and adds manufacturer-sourced, typed technical values for the Accessory subtypes (MONITOR, MOUSE, KEYBOARD, HEADSET). It also makes the already-configured PC reference BOM fields available to customers with an explicit "Cấu hình tham khảo" label.

**Do not run a destructive migration, reset the DB, or re-import the entire 150-product catalog.** The current 35-table schema is designed for dynamic attributes; use the enrichment delta only.

## Files in this package

| File | Purpose |
|---|---|
| `catalog-v11-attribute-definitions-additions.csv` | 72 new Accessory attribute definitions to merge into the existing registry |
| `catalog-v11-verified-attribute-values.csv` | 153 verified per-SKU attribute values / corrections (delta only) |
| `catalog-attribute-evidence-v11.csv` | Full merged evidence file: v10 evidence plus v11 verified rows |
| `catalog-public-attribute-visibility-v11.csv` | Full merged visibility policy (includes v10 policy plus v11 changes) |
| `catalog-attribute-internal-ledger-v11.csv` | Full runtime ledger replacement for the classpath resource |
| `catalog-import-150-products-v11-wide.csv` | Full 150-SKU CSV with the new 72 columns; 150 rows × 272 columns. Reference/future-import file only; do not bulk-import it for this task |
| `catalog-v11-gap-audit-150-skus.csv` | SKU-by-SKU data-coverage audit |
| `catalog-v11-coverage-summary.csv` | Coverage totals grouped by product type |
| `DATABASE-CAPACITY-ASSESSMENT.md` | Schema capacity explanation |

## Required implementation

### 1. Merge the attribute registry

Append the 72 rows from `catalog-v11-attribute-definitions-additions.csv` to:

`backend-java/src/main/resources/catalog-attribute-definitions.csv`

Do not replace the existing 176 definitions. Final registry size should be 248 definitions. The expanded wide CSV has 24 base columns + 248 attribute columns = 272 columns.

The new definitions use the existing data types only: `TEXT`, `INTEGER`, `DECIMAL`, `BOOLEAN`, `JSON`. Structured values (ports, dimensions, polling profiles, platform lists) use JSON/JSONB. `mouse_max_acceleration_g` and `mouse_max_speed_ips` are TEXT because source specifications are inequalities such as `>40 G` and `>888 IPS`; do not coerce these into exact numeric claims.

### 2. Apply the attribute value delta only

Use `catalog-v11-verified-attribute-values.csv` as the delta input. Implement or reuse a dedicated **attribute-only** upsert path:

- Insert/update the matching `product_attribute_definitions` rows by `(product_type_id, attribute_code)`.
- Insert/update only the listed `product_attribute_values` rows by `(product_id, attribute_definition_id)`.
- Put values in the correct typed column (`value_text`, `value_integer`, `value_decimal`, `value_boolean`, or `value_json`).
- Update the per-model verification metadata in `product_attribute_definitions.validation_json -> verificationByModel`, reusing the existing logic/SQL in `CatalogCsvImporter` where possible.
- Use `ON CONFLICT` / idempotent upserts.
- Do not touch `products`, `product_offers`, images, order data, stock, or unrelated attribute values.
- Do not execute the full v11 wide CSV through the normal full importer for this task; the current importer also upserts product and DEMO offer data. Use the 153-row value delta only.

The v11 delta includes these explicit corrections:
- AOC 24G2SP typical brightness: 250 → 300 nits, plus 30+ other verified display fields.
- Logitech G PRO X Superlight 2: max DPI 32,000 → 44,000; max polling 2,000 → 8,000 Hz.
- Additional detailed data for ASUS VG27AQ1A, G102, G502 HERO, DeathAdder Essential, BlackWidow V3, AULA F75, Keychron K8 Pro, and HyperX Cloud III.

### 3. Replace the runtime visibility ledger

Back up and inspect the current local file first. Compare its `(product_type, model_code, attribute_code)` keys and timestamps/statuses with `catalog-attribute-internal-ledger-v11.csv`. If it is the same V10 baseline, replace its content with the V11 ledger. If the local file contains newer, local-only rows/changes, merge those rows into the V11 ledger without dropping them, then validate that every key is unique.

The runtime destination is:

`backend-java/src/main/resources/catalog-internal/catalog-attribute-internal-ledger.csv`

Use `catalog-attribute-internal-ledger-v11.csv` from this package as the V10-based complete replacement/merge baseline.

`CatalogInternalLedger` currently allows a field only when `public_visibility == PUBLIC_ALLOWLIST`. The full v11 ledger updates only attributes that have matching evidence and explicit allowlist policy. It does not make every unverified value public.

For all 10 PC records, v11 allowlists only:
- `configuration_items`
- `configuration_summary`

It deliberately keeps `bom_status`, `system_dimensions_mm`, and verification/evidence workflow metadata private. The PC component list is a shop-curated reference build from the catalog, not an OEM-certified BOM; always label it **“Cấu hình tham khảo”** / demo reference. Do not present it as manufacturer-certified.

### 4. Fix API metadata so the frontend can group every field

The repository already has a flexible `specifications` JSON object and a SQL aggregate over `product_attribute_values`. Do not hardcode a fixed 7-field monitor response or add one DTO field per technical attribute.

However, the public attribute-definition DTO currently omits subtype information. Extend:

- `PublicCatalogAttributeDefinition.java`
- the `CatalogService` mapping that creates public definitions
- relevant controller response/tests

to return at least:
`productType`, `code`, `label`, `dataType`, `unit`, `subtype`.

Use the metadata from `AttributeDefinitionRegistry` for subtype. Keep `verificationByModel`, `sourceUrl`, internal scope, review notes, ledger values, confidence and internal workflow fields out of customer responses.

Trace and preserve this data flow:

`product_attribute_values` → `CatalogRepository` dynamic specification aggregate → `CatalogService` public allowlist filter → product detail API → frontend.

The API must return every present, public-allowlisted specification for the requested SKU. It must not omit fields simply because the frontend's previous fixed list did not know their codes.

### 5. Fix frontend rendering generically

Inspect the current product detail rendering, especially:
- `frontend/src/v2/CatalogScreens.tsx`
- `frontend/src/v2/product-information.tsx`
- `frontend/src/v2/storefront-components.tsx`
- `frontend/src/catalog-api.ts`

Do not replace existing layouts wholesale. Add a generic data-driven renderer:

- Join `product.specifications` with the public attribute-definition response by `code`.
- Render every present public field, not just a hardcoded allowlist in React.
- Use Vietnamese labels and units from definitions.
- Hide empty/null values only.
- Group Accessory specs by `subtype`: MONITOR, MOUSE, KEYBOARD, HEADSET.
- For monitor, use readable groups such as Hiển thị, Chất lượng hình ảnh, Đồng bộ/HDR, Cổng kết nối, Công thái học, Nguồn & kích thước.
- For mice, group Cảm biến & hiệu năng, Nút & kết nối, Kích thước & nguồn.
- For keyboards, group Bố cục & switch, Kết nối & polling, Pin, Kích thước.
- For headsets, group Âm thanh, Micro, Kết nối & tương thích, Kích thước.
- For CPU/GPU/board/RAM/storage/PSU/case/cooler, render all fields returned by the API; do not discard valid public fields.
- Render JSON values readably (e.g., separate connection ports, display-resolution-by-input, dimensions) rather than exposing raw JSON text.
- Render `configuration_items` as an actual component table/list with component type, product name and model code. Render `configuration_summary` as a short summary. Show the "Cấu hình tham khảo (DEMO)" notice.
- Do not expose `bom_status`, `system_dimensions_mm`, verification sources or internal ledger metadata.

### 6. Verification required

After applying the delta, verify actual HTTP responses and pages for:
- `24G2SP` AOC monitor
- `VG27AQ1A` ASUS monitor
- `910-006630` Logitech G PRO X Superlight 2
- `727A8AA` HyperX Cloud III
- at least one CPU and one GPU
- `PBC-PC-GAME-006` and `PBC-PC-CREATOR-008`

For each test capture:
- count of non-empty public specs in database
- count returned by product detail API
- count shown on screen
- exact missing codes, if any

Also compare the frontend response with `catalog-v11-gap-audit-150-skus.csv`. Do not claim all 150 are complete unless the SKU-level counts demonstrate it.

### 7. Guardrails

- Backup before DB updates.
- Do not reset the database or change the 35-table schema.
- Do not re-import all 150 products or touch DEMO offers.
- Do not fabricate specs or verify values from similar products/variants.
- Do not expose private review metadata.
- Do not spend this task on images, favicon, price, stock or the anonymous `/api/auth/me` 401; they are separate issues.
- Do not commit/push unless explicitly requested.

## Expected final result

The storefront detail API must provide all public specs present in PostgreSQL. The frontend must render them generically in the correct subtype/category groups. AOC 24G2SP and ASUS VG27AQ1A must show detailed monitor specs; mouse/keyboard/headset pages must show their verified specific specs; PC pages must show the curated component list with a clearly marked reference/demo label.

Report actual DB/API/UI counts, tests, changed files, and any remaining missing fields by SKU.
