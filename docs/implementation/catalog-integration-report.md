# Catalog integration report

## Result

The customer catalog now reads product data from the Express Catalog API instead of rendering the old hardcoded product samples. No database schema, migration, production database, or supplied SQL seed was changed or run.

The catalog CSV contains 150 unique product model codes. The seed entry point checks for exactly 150 rows, validates import values against the catalog column limits, and uses parameterized SQL in one Prisma transaction. It inserts shared catalog lookups only when missing, verifies existing lookup/attribute definitions without overwriting them, and fails on conflicting product or offer records rather than updating user data. Offer codes use the `DEMO-` prefix; prices and stock are illustrative. No image records are created from the supplied CSV.

This confirms the seed input and implementation path, not that 150 rows have been imported into a database.

## Changed files

- `backend/prisma/seed.ts` — requires 150 CSV records and applies the baseline/catalog seed in a transaction with an explicit timeout.
- `backend/src/catalog/seed-csv.ts` — validates CSV shape, strings, model and offer-code limits, prices, quantities, warranty, JSON values, and numeric precision.
- `backend/src/catalog/seed.ts` — verifies lookup/attribute compatibility, avoids overwriting existing records, and identifies imported products as demo-seed-owned.
- `backend/src/catalog/routes.ts` — provides product list/detail and filter facets; validates query values, uses parameterized SQL, keeps price bounds on the same offer, and filters invalid image URLs.
- `backend/test/catalog-api.test.ts` — covers list/search/filter/sort/pagination, detail/not-found, safe invalid input, price bounds, facets, image URLs, and encoded slash model codes.
- `frontend/src/catalog-api.ts` — centralized API client and response types, using `VITE_API_BASE_URL` or `/api`.
- `frontend/src/CatalogPage.tsx` — API-backed homepage, search/list/filter/sort/pagination, product detail, and comparison screens with loading, empty, and error states.
- `frontend/src/LegacyScreen.tsx` — retains the existing shared header/footer and mounts the React catalog into the existing customer screens.
- `docs/implementation/local-development-guide.md` — updates setup and API/seed guidance.
- `docs/implementation/catalog-compatibility-report.md` — marks the original pre-implementation findings as historical.

## API and screens

Implemented read-only endpoints:

- `GET /api/catalog/facets`
- `GET /api/catalog/products` — search by product name/model code; filters by type, category, brand, active-offer price range, and supported attributes; name/price sorting and bounded pagination.
- `GET /api/catalog/products/:modelCode` — product detail, active offers, warranty, specifications, and only HTTP(S) image records with a valid host.

Connected screens:

- Homepage product/category listing and search.
- Customer parts listing with product type, category, brand, supported attribute, price, sort, and pagination controls.
- Product detail from an API product model code.
- Product comparison based on returned product specifications; the browser stores selected model codes only.

The legacy header, footer, and Vietnamese UI remain. Build-PC remains Coming Soon. Admin CRUD/authentication, checkout, inventory fulfillment, and compatibility certification are not implemented.

## Schema and data compatibility

- No schema or migration edits were made. The seed/API use existing `product_types`, `categories`, `brands`, `products`, `product_offers`, `product_attribute_definitions`, `product_attribute_values`, and `product_images` tables.
- CSV model codes may include `/` as present in the input; the seed caps the code at 95 characters so the `DEMO-` offer code remains within the existing 100-character `offer_code` column.
- Price values are checked against `DECIMAL(15,2)`, quantities against the existing numeric offer columns, and attributes against the existing typed value columns and reviewed attribute definitions.
- Existing model-code collisions are accepted only when the product still matches the demo marker and the expected demo offer exists. Existing offer and attribute data are checked, not updated. Lookup rows and attribute definitions are likewise not overwritten.
- The seed skips images because the supplied 150-row CSV has blank image URLs. API image filtering checks URL syntax only; it does not fetch or certify image content.
- The migration and custom collation/sequence/trigger behavior have not been tested on PostgreSQL. Static inspection is not proof of successful deployment.

## Verification actually performed

- `npm test` in `backend/` — passed: 3 test files, 17 tests.
- `npm run build` in `backend/` — passed.
- `npm run build` in `frontend/` — passed (TypeScript check and Vite production build).
- `npm run db:validate` — passed after supplying a temporary local placeholder `DIRECT_URL` for Prisma configuration. The first attempt without `DIRECT_URL` failed before validation. No database connection was made.
- `npm run db:generate` — passed with the same temporary configuration; Prisma Client generated successfully.
- Browser check of `/customer/home` and `/customer/parts?type=CPU` — Vite served the screens and showed the expected catalog UI. Catalog requests returned HTTP 500 because the Express/database service was not running; the UI displayed its API error state. This is not an API/database integration test.
- `git diff --check` — passed.

Not executed: migration, seed, database-health check against PostgreSQL, live API/database integration, rollback/idempotence against PostgreSQL, or production/Neon access. The current workspace has no configured database credentials.

## Next staging setup

Use an explicitly selected non-production PostgreSQL staging database with the approved 35-table migration. Do not copy production credentials. From the repository root:

```powershell
npm install
Copy-Item .\backend\.env.example .\backend\.env
Copy-Item .\frontend\.env.example .\frontend\.env
```

Set `DATABASE_URL` to the staging runtime URL and `DIRECT_URL` to the staging direct/CLI URL in `backend/.env`; set `VITE_API_BASE_URL=/api` in `frontend/.env` unless the deployment uses a separate API origin. Keep both files untracked and verify the selected database target before running database commands.

```powershell
npm run db:validate
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

The migration command applies the repository migration if it has not already been applied; the seed does not run migrations. Verify the staging catalog count, offer/attribute foreign keys, seed rerun behavior, and rollback behavior before any production planning.

## Remaining work

1. Apply/verify the existing migration on a disposable staging database and inspect its custom collations, sequences, triggers, and helper functions at runtime.
2. Run the catalog seed in staging; verify 150 inserted/already-seeded product models, valid offer/attribute foreign keys, non-overwrite behavior, rollback, and rerun idempotency.
3. Run real PostgreSQL-backed API tests and verify the database-health endpoint and error handling.
4. Configure the Git remote only after the repository URL and target branch are confirmed. The current Git repository has no remote, so nothing has been pushed.
