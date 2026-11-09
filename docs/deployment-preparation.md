# Deployment preparation

The frontend is configured for Vercel in `vercel.json`. The Spring Boot API can
be built from `backend-java/Dockerfile`; it starts with the `prod` profile and
listens on the platform-provided `PORT` (8081 locally by default).
For local Vite development, `/api` is proxied to the Spring Boot port 8081.
For Vercel, set `VITE_API_BASE_URL` to the separately deployed API origin,
including `/api`; the Vercel SPA rewrite is not an API proxy.

Configure these values in the hosting platforms before deployment:

| Service | Variable | Value |
| --- | --- | --- |
| Frontend | `VITE_API_BASE_URL` | Public API origin followed by `/api`, e.g. `https://api.example.com/api` |
| Backend | `DATABASE_URL` | PostgreSQL JDBC URL or `postgresql://` URI for the deployment database |
| Backend | `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | Optional separate database credentials when the URL does not include them |
| Backend | `CORS_ALLOWED_ORIGINS` | Exact public frontend origin(s), comma-separated; do not use `*` |
| Backend | `SPRING_PROFILES_ACTIVE` | `prod` |
| Backend | `SESSION_COOKIE_SAME_SITE` | `none` when frontend and API are on different sites |
| Backend | `SESSION_COOKIE_SECURE` | `true` for HTTPS |

`DATABASE_URL` and any database credentials must be stored as hosting-platform
secrets, not committed. The `prod` profile fails fast if the database URL or
allowed frontend origins are missing. It does not create, migrate, or reset the
database.

## Database readiness blocker

The root `schema_35_tables.sql` is MySQL 8 DDL and must not be used to initialize
the Java backend's PostgreSQL database. A PostgreSQL 35-table baseline artifact
exists at `backend/prisma/migrations/20261102000000_initial/migration.sql`;
it was ported from that MySQL schema, but has not been applied to or verified
against a deployment PostgreSQL instance. The Spring Boot application uses
`JdbcTemplate` and does not apply Prisma migrations at startup.

The Java backend also relies on additive PostgreSQL migrations under
`scripts/migrations/`:

- `20261108_account_role_history.sql`
- `20261108_admin_product_management.sql`
- `20261108_order_management.sql`
- `20261108_promotion_currency.sql`
- `20261108_pc_upgrades_bundles.sql`
- `20261108_pc_upgrades_bundles_v2.sql`
- `20261108_order_promotion_snapshots.sql`
- `20261108_promotion_order_snapshots.sql`
- `20261108_zz_merchandising_inventory_capabilities.sql`

There is no migration-history mechanism for tracking these SQL scripts. Before
provisioning production:

1. Review the PostgreSQL baseline and additive SQL as one ordered schema change
   against the current Java repositories and services.
2. Apply and validate the reviewed sequence on a fresh isolated PostgreSQL
   staging database. Confirm all required tables, columns, indexes, constraints,
   triggers, and PostgreSQL/ICU collation support; do not assume the existing
   local database proves a clean production initialization works.
3. Establish an auditable migration/version record and an approved backup and
   recovery procedure before applying the sequence to production.

No schema SQL was run as part of this preparation. Production database
provisioning and migration validation are blockers; do not deploy the backend
until they are resolved.

## Health and integration-test checks

Use `/api/health` for process liveness and `/api/health/db` for database
readiness. The latter executes a database check.

`PostgresCommerceIntegrationIT` is destructive to its connected test database
in the sense that it creates and removes fixtures. Run it only with both
`TEST_DATABASE_URL` pointed at an isolated database whose name ends in `_it` or
`_test`, and `TEST_DATABASE_DISPOSABLE=true`. Neither variable was configured
for this preparation, so the PostgreSQL purchase/inventory integration test
was not executed. Never point it at the normal development or production DB.

The API uses cookie sessions and CSRF protection. Cross-site deployments require
HTTPS, credentialed CORS for the exact frontend origin, and `SameSite=None;
Secure` cookies. Keep the frontend and API same-site where possible.

The online payment option is simulated and must not be presented as a real
payment processor. No deployment has been performed by this preparation.
