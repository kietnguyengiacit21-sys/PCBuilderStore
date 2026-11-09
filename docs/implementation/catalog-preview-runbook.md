# Local V4 Catalog Preview Runbook

This runbook previews and optionally upserts the full 252-product V4 master
catalog into the existing **local development database** and connects the React
preview to the Java API. It does not configure authentication or change the
database schema.

## Database boundaries

| Database | Use |
|---|---|
| `pc_builder_store_it` | Integration testing only. Never use it for this import. |
| `pc_builder_store_dev` | Existing local catalog preview database. Preserve its data. |

The importer accepts only `localhost` or `127.0.0.1`, requires the exact database
name `pc_builder_store_dev`, checks the connected PostgreSQL server address is a
numeric loopback address (with an optional full-width `/32` IPv4 or `/128` IPv6
prefix), and checks for the existing 35-table public schema. Hostnames in the
connected address are not resolved. Do not set the importer connection to Neon,
another remote server, or another database.

## 1. Verify the existing development database

In pgAdmin, confirm the local database is `pc_builder_store_dev` and has the
existing 35-table schema. Preserve its current rows and schema: do not create,
reset, truncate, drop, or migrate database objects for this catalog import.

## 3. Build the Java API

Open a Windows CMD terminal at the repository root:

```cmd
cd /d backend-java
.\mvnw.cmd package
```

This runs unit tests and creates
`backend-java\target\pc-builder-store-api-0.0.1-SNAPSHOT.jar`.

## 4. Preview the CSV import (no writes)

In the same CMD terminal, set credentials for the local development database.
Replace the password placeholder locally; do not commit or share it:

```cmd
set SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/pc_builder_store_dev
set SPRING_DATASOURCE_USERNAME=YOUR_LOCAL_POSTGRES_USERNAME
set SPRING_DATASOURCE_PASSWORD=YOUR_LOCAL_POSTGRES_PASSWORD
```

Run the importer with explicit developer opt-in and without the apply flag:

```cmd
java -jar target\pc-builder-store-api-0.0.1-SNAPSHOT.jar --spring.main.web-application-type=none --catalog.import.enabled=true --catalog.import.opt-in=LOCAL_DEV_ONLY --catalog.import.csv=..\catalog-import-full-demo-v4.csv
```

By default the importer reads the root-level `catalog-import-full-demo-v4.csv`.
An evidence CSV is optional and is not loaded unless
`--catalog.import.evidence-csv=<path>` is supplied. Override the catalog input
with `--catalog.import.csv=<path>`.

The V4 CSV has 252 product rows and 385 columns: 24 base columns, 348
registered technical-attribute columns, and 13 merchandising, inventory, and
upgrade columns. It is the full master catalog and retains earlier products;
do not import V2 or V3 separately. It contains 36 prebuilt PCs, 287 upgrade
groups, and 2,681 selectable options, with at least two options per group.
Technical columns are matched to the attribute registry by
`<product_type>__<attribute_code>`; the definition registry supplies types,
units, options, subtype, input mode, and specification scope. Empty technical
cells are omitted, and populated cells are converted and validated using the
registered data type. PC BOM components and upgrade groups are normalized from
the corresponding V4 fields.

If an evidence CSV is explicitly supplied, it controls verification separately
from product values. A value is marked verified only when its evidence row has
matching model, attribute, type, unit, scope, and typed value. Price
source/estimate metadata, manufacturer URLs, and data notes are parsed and
validated but are not persisted because the current schema has no corresponding
columns.

Preview validates the CSV, the connected database, and required schema objects,
then exits without database writes. Product and related-record counts are
computed from the selected input; do not assume fixed catalog totals.

V4 product prices have `price_is_estimate=true`.
Prices and their estimate/provenance metadata are for the local demo catalog
only; they are not verified live selling prices and must not be presented as
such. The importer marks `DEMO-` offers active so they are available to the
local storefront and upgrade configurator. Until provenance fields are added
to the schema, the importer cannot persist the estimate flag, price source,
manufacturer specification URL, or data note.

The importer uses Apache Commons CSV for quoted cells, embedded JSON, commas,
a UTF-8 BOM, and Vietnamese text. Invalid rows stop processing with a CSV row
number. The importer is not enabled during normal API startup.

## 5. Apply the catalog with explicit safety opt-in

Only after reviewing a successful preview, run the same command with the
additional explicit apply flag:

The demo offer stock default is configurable as `catalog.import.default-stock`
(environment variable `CATALOG_IMPORT_DEFAULT_STOCK`) and defaults to `5`.
It must be between 0 and 4,294,967,295. This value is used only when a new
`DEMO-` offer is inserted. Re-imports update only `DEMO-` offers and set them
active; offers with non-`DEMO-` codes are not updated. Reserved quantity is
preserved. Existing stock is preserved when an offer has reserved quantity;
otherwise it is replaced by the CSV stock value or the configured default.

```cmd
java -jar target\pc-builder-store-api-0.0.1-SNAPSHOT.jar --spring.main.web-application-type=none --catalog.import.enabled=true --catalog.import.opt-in=LOCAL_DEV_ONLY --catalog.import.csv=..\catalog-import-full-demo-v4.csv --catalog.import.apply=true
```

The import uses one transaction and deterministic natural keys (`model_code`
and `DEMO-<model_code>`). Re-running the import updates the same catalog rows
rather than creating duplicates. The canonical dataset has no stock column,
so new demo offers use the configurable default stock. Existing reservation
quantity, stock, condition, and manually controlled offer status are preserved
on conflict. Existing product status is also preserved. A failure rolls back
the transaction.

The importer writes to `product_types`, `categories`, `brands`, `products`,
`product_offers`, `product_attribute_definitions`,
`product_attribute_values`, `product_images`, `product_bom_components`,
`product_upgrade_groups`, and `product_upgrade_options`. For imported PCs, it
removes obsolete BOM links and disables obsolete upgrade groups/options rather
than deleting cart-referenced upgrade rows. It updates per-model verification
metadata in the existing `product_attribute_definitions.validation_json` field
without replacing other JSON keys. It does not write users, roles, carts,
orders, product relationships, compatibility rules, or benchmark data.
For each imported product, canonical image URLs are upserted by URL without
deleting existing image rows. Existing primary-image flags are preserved; when
no primary image exists, the first actual canonical image is marked primary,
even when earlier CSV image slots are blank. Repeated
imports update matching image metadata and do not create duplicate URLs.

The actual PostgreSQL persistence regression tests are `CatalogImporterPostgresPersistenceIT`.
They use only temporary fixture tables and require a separately provisioned,
disposable local database with a unique name of the form
`pcbs_import_it_<uuid>`; they explicitly reject `pc_builder_store_dev` and
`pc_builder_store_it`. Configure `PCBS_IMPORT_IT_JDBC_URL`,
`PCBS_IMPORT_IT_USERNAME`, and `PCBS_IMPORT_IT_PASSWORD`, then run:

```cmd
.\mvnw.cmd -Ppostgres-it -Dit.test=CatalogImporterPostgresPersistenceIT verify
```

The ordinary `mvnw test` suite includes SQL-shape unit tests but does not count
those as database persistence verification.

## 6. Verify imported data in pgAdmin

Run these read-only queries in pgAdmin's Query Tool connected to
`pc_builder_store_dev`:

```sql
SELECT COUNT(*) AS products FROM products;
SELECT COUNT(*) AS brands FROM brands;
SELECT COUNT(*) AS categories FROM categories;
SELECT COUNT(*) AS product_types FROM product_types;
SELECT COUNT(*) AS offers FROM product_offers;
SELECT COUNT(*) AS attribute_definitions FROM product_attribute_definitions;
SELECT COUNT(*) AS typed_attribute_values FROM product_attribute_values;
SELECT COUNT(*) AS product_images FROM product_images;
```

The V4 import summary should report 252 products, 36 PCs, 287 upgrade groups,
and 2,681 selectable options. These counts apply to this input; the existing
development database may contain other records. Confirm products are active
and offers have the expected demo prefix:

```sql
SELECT product_status, COUNT(*) FROM products GROUP BY product_status;
SELECT offer_status, COUNT(*) FROM product_offers GROUP BY offer_status;
SELECT COUNT(*) AS demo_offers
FROM product_offers
WHERE offer_code LIKE 'DEMO-%';
```

The imported product and offer statuses should be `ACTIVE`, and this import
should upsert 252 `DEMO-` offers. The typed values use the existing EAV columns for text,
decimal, integer, boolean, and JSON data.

## 7. Start the Java Spring Boot API

Use the same local-only environment variables set above. From `backend-java`:

```cmd
java -jar target\pc-builder-store-api-0.0.1-SNAPSHOT.jar
```

The API uses `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and
`SPRING_DATASOURCE_PASSWORD`. Normal startup does not run the importer.

## 8. Start Vite in a separate terminal

Open another Windows CMD terminal at the repository root:

```cmd
npm run dev --workspace=frontend
```

Vite keeps `/api` as the frontend API path and proxies it to
`http://localhost:8080` by default.

## 9. Check endpoints and open the preview

In a CMD terminal, check the Java API:

```cmd
curl.exe -i http://localhost:8080/api/health
curl.exe -i http://localhost:8080/api/health/db
curl.exe -i http://localhost:8080/api/catalog/facets
curl.exe -i "http://localhost:8080/api/catalog/products?page=1&limit=5"
curl.exe -i http://localhost:8080/api/catalog/products/BX8071512100F
```

Expected: health and database health succeed, facets contain product types,
categories, brands and available attributes, the product list contains active
catalog products with pagination and the demo notice, and the detail request
returns the matching product with `DEMO-` offers and typed specifications.

Then open `http://localhost:5173` and visit:

- `http://localhost:5173/customer/home`
- `http://localhost:5173/customer/parts`
- `http://localhost:5173/customer/product?modelCode=BX8071512100F`
- `http://localhost:5173/customer/compare`

The catalog UI has a safe no-image fallback. The page labels demo prices and
stock as illustrative rather than live retailer information.

## 10. Switch the Vite proxy to the old Node API

Stop the Vite process with **Ctrl+C** in its terminal. From the repository root,
set the override and restart Vite:

```cmd
set API_PROXY_TARGET=http://localhost:3000
npm run dev --workspace=frontend
```

To return to Java's default proxy, stop Vite and clear the override in that
terminal before restarting:

```cmd
set API_PROXY_TARGET=
npm run dev --workspace=frontend
```

The proxy override changes only the Vite development server; the frontend API
base path remains `/api`. No backend host is hardcoded in the React application.

## Expected limitations and common errors

- All prices and stock quantities are **DEMO values**, not current retailer
  quotes or fulfillment inventory.
- Product `image_url` values in this CSV are blank. No product image rows are
  created; the UI's existing fallback remains in use.
- Market reference links are category/landing pages, not verified per-SKU offers.
- Data verification is `PARTIAL_REVIEW_REQUIRED`; specifications are not
  certified compatibility. No compatibility or relationship records are made.
- Prebuilt PC BOM is not mapped to component stock.
- A safety error means stop and check the URL, exact database name, local server,
  explicit opt-in, or 35-table schema. Never work around the database guard.
- A CSV row error reports its CSV record number. Correct/review the canonical
  CSV rather than using the legacy SQL seed.
- HTTP 503 or failed `/api/health/db` usually means the Java process cannot
  connect using the configured local datasource values.
- A frontend network error usually means Java is not listening on port 8080, or
  `API_PROXY_TARGET` still points to an unavailable backend.

## Technical attribute definitions and evidence

The canonical typed dictionary is
`backend-java\src\main\resources\catalog-attribute-definitions.csv`. It defines
the field names, types, units, labels, and accessory subtypes used by the Java
API and the customer/admin specification views. It does not assert that a
product has a value for every field.

`seed\catalog-attribute-evidence.csv` is a model/field review queue. Entries
marked `NEEDS_REVIEW` are not product facts. Add a value only after verifying
the exact model and field from an authoritative source; record the source URL
and locator in `seed\catalog-verified-attribute-values.csv`. Do not copy
illustrative values from legacy static screens or treat existing demo values as
source-verified.

To apply definition updates and explicitly reviewed values to local development,
use `scripts\enrich-catalog-dev.ps1`. It targets only loopback PostgreSQL
`pc_builder_store_dev`, checks the existing 35-table foundation, and runs no
migration or general catalog importer. The current reviewed-values file contains
no approved product values, so the enrichment has added definitions only; the
existing product values remain unchanged and unverified.

The GPU dictionary now contains 37 optional attributes: 20 existing fields and
17 additions. Each field is tagged as GPU-silicon or board-variant scope so
values are not copied between chipsets, manufacturers, or board models.
Repeated display outputs and power connectors, plus operating systems,
accessories, and documentation, use JSON-array attributes in the existing
typed-value storage; lists must not be encoded in numeric attributes.

The shared C03/C17 renderer groups these attributes into ten GPU sections.
The GPU evidence queue covers 15 models and 555 model/field rows: 57 fields
have exact-variant manufacturer evidence, while 498 remain `NEEDS_REVIEW`.
Unresolved fields must stay out of the approved-values file. In particular,
do not choose among multiple clock profiles or infer card dimensions when the
manufacturer's exact model specification does not identify the value clearly.
