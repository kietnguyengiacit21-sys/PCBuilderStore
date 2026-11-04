# Java Catalog PostgreSQL Integration Verification — Phase 3A

## Result

**Real PostgreSQL integration verification is blocked and was not achieved.**
The catalog integration suite is prepared, but zero PostgreSQL integration tests
were run. No PostgreSQL endpoint was configured, and no isolated database was
available. The successful Maven unit-test and package runs below do not verify
catalog SQL against PostgreSQL.

## Environment and migration

- Working branch: `migration/java-spring-boot`.
- Runtime: Eclipse Temurin Java 21.0.13 on Windows.
- `psql`, `pg_ctl`, and `initdb` are not available; no PostgreSQL Windows service
  was found.
- Docker CLI is present, but `docker info` exits with status 1 because its
  server/daemon is unavailable.
- `TEST_DATABASE_URL`, `TEST_DATABASE_DISPOSABLE`, and `DATABASE_URL` were not
  configured. No database URL or credentials were printed or recorded.
- The existing PostgreSQL migration reviewed was
  [`backend/prisma/migrations/20261102000000_initial/migration.sql`](../../backend/prisma/migrations/20261102000000_initial/migration.sql).
  It contains 35 `CREATE TABLE` statements and defines the catalog tables,
  numeric identifiers and prices, JSONB attribute columns, foreign keys, and
  indexes used by the Java catalog queries. The migration was **not applied**;
  consequently, the database's 35-table state and actual column metadata were
  not verified.
- The migration includes PostgreSQL-specific ICU collation and unsigned-ID
  sequence/function DDL. It must be applied only to a newly provisioned,
  disposable PostgreSQL database that supports those definitions.

## Schema comparison and mismatches

The integration test's table-name set was compared with the 35 `CREATE TABLE`
statements in the migration. The test now requires an exact match, rather than
only checking that the expected names are present. Its asserted catalog numeric,
JSONB, and image column types and the fixture insert/delete columns were also
checked against the migration definitions. Fixture foreign-key references and
cleanup order are consistent with the declared constraints.

| Test assertion | Migration definition | Finding |
|---|---|---|
| `ix_product_attribute_def_type` | `ix_attribute_def_type` on `product_attribute_definitions` | **Test expectation issue.** Corrected the test to check `ix_attribute_def_type`. No migration/schema change is needed. |

No other schema mismatches were found in the reviewed table names, asserted
column types, checked foreign-key names, or fixture/cleanup statements. This is a
source-level comparison only; the migration was not executed, so it is not live
database verification.

## Integration suite

`backend-java/src/test/java/com/pc_builder_store/catalog/PostgresCatalogIntegrationIT.java`
uses the real Spring Boot application, embedded HTTP server, JDBC template, and
database-backed repository. It does not mock repository or JDBC execution.
Fixtures use a unique per-test prefix and cleanup targets only matching fixture
records.

The suite contains eight integration tests covering:

- The expected table count, catalog column types, indexes, and foreign keys.
- Active/inactive facets and deduplicated typed attribute facets.
- Default pagination, search, type/category/brand filters, price bounds applied
  to the same offer, typed attribute filters, sorting, and pagination totals.
- Detail fields, string product IDs, decimal prices, active offers, available
  quantity, typed specifications, valid/invalid images, and demo markers.
- Inactive-product 404 behavior and a slash-containing model code sent through
  the encoded `%2F` URL form.

The `postgres-it` Maven profile runs `*IT` tests through Failsafe during
`verify`. It loads `TEST_DATABASE_URL` from
`backend-java/src/test/resources/application-postgres-it.properties` and refuses
to proceed unless `TEST_DATABASE_DISPOSABLE=true` and the connected database
name ends in `_it` or `_test`. The profile does not silently skip integration
tests.

**PostgreSQL integration result:** 0 tests run; no SQL failures or endpoint
results are available because the suite could not be connected to an isolated
database. This is an environment blocker, not evidence that repository SQL
passes.

## Required local checks

Commands run from `backend-java/`:

| Command | Result |
|---|---|
| `.\mvnw.cmd clean test` | `BUILD SUCCESS`; 32 tests, 0 failures, 0 errors, 0 skipped |
| `.\mvnw.cmd package` | `BUILD SUCCESS`; 32 tests, 0 failures, 0 errors, 0 skipped |
| `.\mvnw.cmd -DskipTests test-compile` | `BUILD SUCCESS`; compiled the integration test source |

These are unit/controller/build checks only. They are not PostgreSQL integration
results. The profile command `.\mvnw.cmd -Ppostgres-it verify` was not run
because there was no configured disposable database to connect to.

## Contract differences and remaining blockers

No behavior difference from the Node API was established. Since none of the
catalog SQL or endpoints ran against PostgreSQL, compatibility with the actual
database and API behavior remains unverified. The real database's table count,
constraints, indexes, `NUMERIC(20,0)` string serialization, decimal precision,
and JSONB behavior were likewise not tested.

To complete Phase 3A:

1. Provision a fresh disposable PostgreSQL database; do not use production or a
   shared database. Ensure its PostgreSQL version and privileges support the
   existing migration's ICU collation and sequence/function definitions.
2. Apply only the existing PostgreSQL migration named above to that database.
   Do not run catalog seeds or cleanup against any other database.
3. Configure `TEST_DATABASE_URL` for the disposable database and set
   `TEST_DATABASE_DISPOSABLE=true` in the test process environment. The database
   name must end in `_it` or `_test`.
4. From `backend-java/`, run `.\mvnw.cmd -Ppostgres-it verify`, then record the
   actual database version, test counts, failures, and schema/query results here.

Until that run succeeds, the primary Phase 3A success criterion remains unmet.
