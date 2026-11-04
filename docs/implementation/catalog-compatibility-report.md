# Catalog seed compatibility review

## Result before import

No catalog data has been imported and no database was contacted. The supplied files are in repository `seed/`, not `database/seed/`; the SQL filename is `seed/catalog-seed.sql.sql` rather than `catalog-seed.sql`.

The CSV was parsed locally: 150 rows, 150 distinct model codes, 10 product types, 41 distinct brand names and 10 category codes; all 150 image URLs are blank. This matches the supplied QA report's stated counts. It does not prove that the SQL output is correct on PostgreSQL.

## Physical schema comparison

Inspected the generated PostgreSQL migration and Prisma mappings for all seven table families used by the seed:

| Physical table | Required/imported fields | Migration/model compatibility |
|---|---|---|
| `product_types` | `type_code`, `type_name`, `description`, `is_build_component`, `is_active` | Present; `type_code` unique. |
| `categories` | `category_code`, `category_name`, `description`, `is_active` | Present; `category_code` unique; `parent_category_id` nullable. |
| `brands` | `brand_name`, `is_active` | Present; `brand_name` unique; website/description nullable. |
| `products` | type/category IDs, nullable brand ID, `model_code`, `product_name`, optional descriptions, `product_status` | Present; model code unique; required FKs to type/category and optional FK to brand. |
| `product_offers` | product ID, `offer_code`, condition, price, currency, stock/reserved, warranty, status | Present; offer code unique; product FK; price/reserved checks. |
| `product_attribute_definitions` | type ID, attribute code/name/type, optional unit, filter/build flags | Present; unique (`product_type_id`, `attribute_code`); data type check allows TEXT/DECIMAL/INTEGER/BOOLEAN/JSON. |
| `product_attribute_values` | product ID, definition ID and one typed value column | Present; composite primary key and both FKs. Migration checks enforce exactly one populated value and the appropriate type. |
| `product_images` | Not imported | Present with required `image_url`; skipped because the CSV has no image URLs. |

Seed SQL column names and conflict targets generally match the generated physical PostgreSQL names. The current schema has no catalog routes, authentication middleware, or catalog-specific seed runner; the existing seed only upserts baseline roles, types, and use cases.

## Blocking safety/compatibility findings in supplied SQL

1. Its conflict handlers update rows on product model code and offer code. Applying it as-is can overwrite an existing product's metadata, offer price, demo stock, warranty, and status. That conflicts with the requirement to preserve user-created data.
2. The same SQL updates shared `product_types`, categories, brands and attribute definitions on conflicts. These may be existing user-managed rows.
3. Offer upserts set demo quantities/price on every rerun. Idempotence alone does not make that safe.
4. The QA report says to apply the PostgreSQL migration first, but the migration and collation/triggers have not been exercised on an actual PostgreSQL instance. Compatibility is therefore static inspection, not runtime proof.
5. The seed contains no image inserts; that is consistent with the CSV and QA report, and avoids inventing image URLs.
6. Demo values must remain visibly labeled and must not be presented as live retailer prices or fulfillment inventory.

## Decision

Do not execute the supplied SQL as-is. Any integration should parse/validate the CSV, use parameterized database operations, preserve existing conflicting records, and fail/report model-code collisions unless they can be proven to be records owned by this demo seed. No schema change or migration is needed for the catalog API, but the staging database must already have the approved schema.

This report is based on reading source files and static schema comparison only. No database connection, SQL execution, seed import, or migration was performed.

## Follow-up implementation status

The read-only catalog integration was added after this initial compatibility review. The previous statement that catalog routes and a catalog seed runner were absent describes the state at the time of that review and is superseded by [catalog-integration-report.md](./catalog-integration-report.md). The follow-up still performed no migration, SQL seed execution, or database import.
