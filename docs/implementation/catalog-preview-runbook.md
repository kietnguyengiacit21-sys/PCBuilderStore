# Local Catalog Preview Runbook

This runbook previews and optionally loads the canonical 150-product catalog
into a **local development database** and connects the React preview to the Java
API. It does not configure authentication or change the database schema.

## Database boundaries

| Database | Use |
|---|---|
| `pc_builder_store_it` | Integration testing only. Never use it for this import. |
| `pc_builder_store_dev` | Local catalog preview only. Create it separately and empty. |

The importer accepts only `localhost` or `127.0.0.1`, requires the exact database
name `pc_builder_store_dev`, checks the connected PostgreSQL server address is a
numeric loopback address (with an optional full-width `/32` IPv4 or `/128` IPv6
prefix), and checks for the existing 35-table public schema. Hostnames in the
connected address are not resolved. Do not set the importer connection to Neon,
another remote server, or another database.

## 1. Create a new empty database in pgAdmin

1. Connect pgAdmin to the local PostgreSQL 18 server.
2. Expand **Servers**, right-click **Databases**, and choose **Create > Database**.
3. Set **Database** to `pc_builder_store_dev` and select the appropriate local
   owner. Do not select or reuse `pc_builder_store_it`.
4. Save, then verify the new database has no application tables.

Do not create a database from the application or importer.

## 2. Apply the existing migration to the new database only

In pgAdmin, select `pc_builder_store_dev`, open **Tools > Query Tool**, open this
existing migration file, and execute it once:

`backend\prisma\migrations\20261102000000_initial\migration.sql`

Confirm the migration's Query Tool is connected to `pc_builder_store_dev` before
executing. This is the existing 35-table migration; do not edit it, run it on the
integration-test database, or execute the legacy `seed\catalog-seed.sql.sql`
reference file.

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
java -jar target\pc-builder-store-api-0.0.1-SNAPSHOT.jar --spring.main.web-application-type=none --catalog.import.enabled=true --catalog.import.opt-in=LOCAL_DEV_ONLY
```

By default the importer reads the root-level `catalog-import-150-products.csv`
and `seed\catalog-attribute-evidence.csv`. Override either input explicitly with
`--catalog.import.csv=<path>` or `--catalog.import.evidence-csv=<path>`.

The canonical CSV has 24 base columns and 176 technical columns. Technical
columns are matched to `catalog-attribute-definitions.csv` by
`<product_type>__<attribute_code>`; the definition registry supplies types,
units, options, subtype, input mode, and specification scope. Empty technical
cells are omitted, and populated cells are converted and validated using the
registered data type. The PCIe generation value `4.0` is normalized to the
single matching registry option `PCIe 4.0`.

The evidence CSV controls verification separately from product values. A value
is marked verified only when its approved evidence row has matching model,
attribute, type, unit, scope, and typed value. Other populated values are
`NEEDS_REVIEW`; empty attributes are `UNKNOWN`. Currently 41 of the 57 approved
evidence values exactly match the canonical typed values; mismatches are not
marked verified. Price source/estimate metadata, manufacturer URLs, and data
notes are validated but are not persisted because the existing schema has no
corresponding fields.

Preview validates both CSVs, the connected database, and the existing schema,
then exits without database writes. Expected summary: 150 products, 10 product
types, 10 categories, 41 brands, 150 demo offers, 176 attribute definitions,
2,480 populated typed attribute values, and 41 exact evidence matches.

All 150 canonical product prices currently have `price_is_estimate=true`.
Prices and their estimate/provenance metadata are for the local demo catalog
only; they are not verified live selling prices and must not be presented as
such. The existing database schema cannot persist the estimate flag or price
provenance, so this limitation applies to every imported demo offer.

The importer uses Apache Commons CSV for quoted cells, embedded JSON, commas,
a UTF-8 BOM, and Vietnamese text. Invalid rows stop processing with a CSV row
number. The importer is not enabled during normal API startup.

## 5. Apply the catalog with explicit safety opt-in

Only after reviewing a successful preview, run the same command with the
additional explicit apply flag:

The demo offer stock default is configurable as `catalog.import.default-stock`
(environment variable `CATALOG_IMPORT_DEFAULT_STOCK`) and defaults to `5`.
It must be between 0 and 4,294,967,295. This value is used only when a new
`DEMO-` offer is inserted. Re-imports preserve an existing offer's
`stock_quantity`, `reserved_quantity`, `condition_code`, and `offer_status`;
the importer does not touch offers with non-`DEMO-` codes.

```cmd
java -jar target\pc-builder-store-api-0.0.1-SNAPSHOT.jar --spring.main.web-application-type=none --catalog.import.enabled=true --catalog.import.opt-in=LOCAL_DEV_ONLY --catalog.import.apply=true
```

The import uses one transaction and deterministic natural keys (`model_code`
and `DEMO-<model_code>`). Re-running the import updates the same catalog rows
rather than creating duplicates. The canonical dataset has no stock column,
so new demo offers use the configurable default stock. Existing reservation
quantity, stock, condition, and manually controlled offer status are preserved
on conflict. Existing product status is also preserved. A failure rolls back
the transaction.

The importer writes only to `product_types`, `categories`, `brands`, `products`,
`product_offers`, `product_attribute_definitions`, and
`product_attribute_values`, and `product_images`. It updates per-model
verification metadata in the existing `product_attribute_definitions.validation_json`
field without replacing other JSON keys. It does not write users, roles, carts,
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

Expected counts in the new empty preview database are respectively `150`, `41`,
`10`, `10`, `150`, `176`, `2480`, and `173`. Confirm products are active and offers
have the expected demo prefix:

```sql
SELECT product_status, COUNT(*) FROM products GROUP BY product_status;
SELECT offer_status, COUNT(*) FROM product_offers GROUP BY offer_status;
SELECT COUNT(*) AS demo_offers
FROM product_offers
WHERE offer_code LIKE 'DEMO-%';
```

The imported product and offer statuses should be `ACTIVE`, and there should be
150 `DEMO-` offers. The typed values use the existing EAV columns for text,
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
