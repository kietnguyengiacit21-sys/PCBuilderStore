# Java Catalog Read API — Phase 2

## Implemented endpoints

| Endpoint | Response |
|---|---|
| `GET /api/catalog/facets` | `{ "data": { "productTypes": [], "categories": [], "brands": [], "attributes": [] } }` |
| `GET /api/catalog/products` | `{ "data": [], "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }, "notice": "..." }` |
| `GET /api/catalog/products/{modelCode}` | `{ "data": { ...product fields... }, "notice": "..." }` |

The product-detail fields match the existing `frontend/src/catalog-api.ts`
contract: `productId`, `modelCode`, `productName`, `shortDescription`,
`description`, `status`, `productType`, `productTypeName`, `categoryCode`,
`categoryName`, `brandName`, `offers`, `specifications`, and `images`.
`demoData` is retained from the existing Node response. Offer prices are serialized
as JSON numbers from `BigDecimal`; product IDs are strings. The offer object also
retains `reservedQuantity`, as in the existing Node response.

The endpoints use the existing Node notice that explicitly labels `DEMO-` offer
prices and quantities as illustrative rather than live inventory. Product detail
returns HTTP 404 with `PRODUCT_NOT_FOUND` and a safe message if there is no active
product.

## Responsibilities

- `CatalogController` maps the three HTTP endpoints and response wrappers.
- `CatalogService` validates request parameters, applies defaults, and delegates
  catalog operations.
- `CatalogRepository` uses `NamedParameterJdbcTemplate` for PostgreSQL reads and
  maps JDBC JSON text into typed DTOs and Jackson JSON nodes.
- Catalog DTO records define product, offer, image, facet, and pagination payloads.
- `GlobalExceptionHandler` maps invalid queries to HTTP 400, missing products to
  HTTP 404, database access failures to HTTP 503, and unexpected failures to a
  sanitized HTTP 500 response. Errors have the shape `{ "error": { "code": "...",
  "message": "..." } }`.

## SQL behavior

The repository queries the existing PostgreSQL catalog tables and their existing
relationships. It performs no DDL, migration, seed, or write operation.

- Facet product types, categories, and brands must be active and have an active
  product. Attribute facets include filterable attributes of active products,
  group values by product type and attribute code, and deduplicate JSON values.
- Product search uses parameterized `ILIKE` on product name/model code. Type,
  category, brand, price bounds, and JSONB attribute predicates are also bound
  parameters. Attribute codes must exist as filterable definitions.
- When both price bounds are present, one `EXISTS` predicate applies both bounds to
  the same active offer.
- Price sorting uses the minimum active offer price, puts NULL prices last, and
  breaks ties by product name ascending. Name sorting follows the requested
  direction. Pagination is parameterized.
- Product JSON includes active offers only, `availableQuantity` calculated as
  `stock_quantity - reserved_quantity`, specifications from all typed attribute
  value columns, and `demoData` based on any `DEMO-` offer.
- Only absolute HTTP(S) image URLs with a host and without user information are
  returned. Invalid URLs and URLs containing embedded credentials are discarded.

## Query validation

Accepted parameters: `page`, `limit`, `q`, `type`, `category`, `brand`, `minPrice`,
`maxPrice`, `sort`, `order`, and repeated `attribute=code=value`.

- `page` defaults to 1 and must be 1–100000; `limit` defaults to 20 and must be
  1–100.
- `q` is trimmed and limited to 200 characters.
- Prices must be non-negative decimal amounts with at most two fractional digits,
  fit `DECIMAL(15,2)`, and `minPrice` cannot exceed `maxPrice`.
- Sort is `name` or `price`; order is `asc` or `desc`.
- Unsupported parameters, duplicate single-value parameters, invalid or duplicate
  attribute codes, and unsupported (non-filterable) attribute definitions return
  HTTP 400.

## Encoded slash model codes

The reference frontend builds the detail URL with
`encodeURIComponent(modelCode)`. At least one catalog model code contains `/`;
Tomcat's default encoded-solidus handling rejects `%2F` before Spring MVC can route
it. `EncodedSlashConfiguration` sets Tomcat's encoded-solidus handling to `decode`,
and the catch-all detail mapping preserves the full model code for repository
lookup. A test sends `%2F` through an actual embedded Tomcat HTTP server and checks
that the repository receives the decoded model code. The frontend URL contract
does not need to change.

## Tests and PostgreSQL status

Run from `backend-java/`:

```powershell
.\mvnw.cmd clean test
.\mvnw.cmd package
```

`.\mvnw.cmd clean test` — `BUILD SUCCESS`, 32 tests, 0 failures, 0 errors,
0 skipped (10.493 s).

`.\mvnw.cmd package` — `BUILD SUCCESS`, 32 tests, 0 failures, 0 errors,
0 skipped (8.979 s).

Controller tests use MockMvc and mocked repositories; service tests exercise
validation; repository tests inspect parameterized SQL construction and mapping of
PostgreSQL JSON text. The encoded-slash test uses an embedded Tomcat server with a
mock repository, not a database.

Docker CLI is installed in the current environment, but `docker info` cannot reach
the Docker Desktop Linux engine. PostgreSQL Testcontainers/integration tests were
therefore not run or added. The repository SQL has **not** been executed against
PostgreSQL in this phase.

## Known limitations and Phase 3

- No PostgreSQL integration test or live database verification is included.
- No catalog writes, authentication/authorization, or frontend changes are part of
  this phase.
- Verify Java JDBC queries against a disposable PostgreSQL instance before
  switching the frontend; do not migrate or seed a shared database as part of that
  verification.
- Phase 3 should cover remaining backend APIs and their frontend contracts,
  integration-test catalog SQL against the existing PostgreSQL schema, and plan
  the frontend runtime switch separately.
