# PC Builder Store — Catalog seed v2 QA report

## Output
- Catalog rows: 150
- Unique model codes: 150
- Product types: 10
- Brand records: 41
- Category records: 10
- PostgreSQL seed: `pc_builder_store_seed_150_products_postgres.sql`
- CSV staging: `pc_builder_store_catalog_150_products_reviewed.csv`

## Rows by product type
- ACCESSORY: 10
- CASE: 15
- COOLER: 15
- CPU: 15
- GPU: 15
- MOTHERBOARD: 15
- PC: 10
- PSU: 15
- RAM: 20
- STORAGE: 20

## Import behavior
- Uses the existing schema tables only: `product_types`, `categories`, `brands`, `products`, `product_offers`, `product_attribute_definitions`, `product_attribute_values`.
- Does not add or alter any of the 35 tables.
- Uses model code and offer code as stable keys; safe to re-run (UPSERT).
- Creates product models separately from sellable offers, matching the schema's catalog model.
- Product specs are stored in the existing typed EAV structure, not left only in a JSON staging column.
- No `product_images` records are created because the source CSV has 150 blank image URLs. This avoids broken or unauthorized image links.
- No product relationship or compatibility confirmation rows are created. Missing/partial specs must not be treated as certified compatibility.

## Data caveats
- Prices and stock are demo values for exercising catalog/cart/checkout flows, not current retailer quotes.
- Market reference URLs are category/landing pages, not verified per-SKU listings.
- Manufacturer links are reference URLs and may be category landing pages for some models.
- Product model/SKU/spec accuracy still requires review before public/commercial use.
- Prebuilt PC rows are demo catalog entries; their BOM is not mapped to component stock. Do not use them for component-based availability calculations.
- CSV's `data_verification_status` remains `PARTIAL_REVIEW_REQUIRED`.

## Before running against Neon
1. Apply the approved PostgreSQL migration to a disposable/staging Neon database.
2. Confirm physical PostgreSQL column/table names match the ported migration.
3. Run this seed only against staging first.
4. Check row counts, foreign keys, unique constraints, and the API's product list/detail/filter endpoints.
5. Do not use the demo stock values as actual fulfillment stock.
