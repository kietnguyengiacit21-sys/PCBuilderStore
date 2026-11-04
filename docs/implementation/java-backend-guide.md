# Java backend guide

The Java backend is a separate foundation in `backend-java/`. It does not replace or
modify the existing Node.js backend. Catalog migration is not part of this phase.

## Requirements

- Java 21 (for example, Eclipse Temurin 21).
- Maven is included through the Maven Wrapper; a separate Maven installation is
  optional.

Verify Java with:

```powershell
java -version
```

If Java 21 is not installed, install an OpenJDK 21 distribution such as Eclipse
Temurin from [Adoptium](https://adoptium.net/temurin/releases/?version=21), then
configure `JAVA_HOME` and add its `bin` directory to `PATH`.

The Maven Wrapper downloads the project's pinned Maven version automatically, so
installing Maven separately is optional. To install Maven 3.9.12 system-wide,
download the binary archive from the [Apache Maven download page](https://maven.apache.org/download.cgi),
extract it, set `MAVEN_HOME` to the extracted directory, and add its `bin`
directory to `PATH`. Verify the installation with `mvn -version`.

## Run the backend

From `backend-java/`, use the wrapper:

```powershell
.\mvnw.cmd spring-boot:run
```

The API listens on port 8080 by default:

- `GET http://localhost:8080/api/health`
- `GET http://localhost:8080/api/health/db`

Build and test with:

```powershell
.\mvnw.cmd clean test
.\mvnw.cmd package
```

The API health endpoint does not require PostgreSQL. The database health endpoint
returns HTTP 503 when the configured database cannot be reached.

## Project structure

```text
backend-java/
  src/main/java/com/pc_builder_store/
    common/       Shared API response types
    config/       DataSource and CORS configuration
    controller/   HTTP routes and request/response mapping
    dto/          Data transfer objects returned by the API
    exception/    Application exceptions and centralized error handling
    repository/   JDBC queries and database access
    service/      Application logic between controllers and repositories
  src/main/resources/
    application.properties
  src/test/java/  Startup and health endpoint tests
```

Controllers handle HTTP concerns and return DTOs. Services coordinate application
logic. Repositories perform database access. DTOs define API payloads and keep
database access details out of HTTP responses.

## JdbcTemplate

`JdbcTemplate` is supplied by Spring JDBC and is used by repositories to execute
SQL with managed connections and exception translation. The initial database
health check runs `SELECT 1`. Database schema migration and seeding are intentionally
not configured or run in this phase.

## Environment variables

The database URL can be supplied through either `SPRING_DATASOURCE_URL` or
`DATABASE_URL`. `SPRING_DATASOURCE_URL` takes precedence. Supported formats are:

- JDBC: `jdbc:postgresql://host:5432/database?sslmode=require`. Supply credentials
  separately with the username and password variables below.
- PostgreSQL URI: `postgresql://username:password@host:5432/database?sslmode=require`.
- PostgreSQL alias: `postgres://username:password@host:5432/database?sslmode=require`.

URI credentials are percent-decoded, and query parameters such as `sslmode` are
preserved when the URI is converted to a JDBC URL. For URI formats, explicit
`SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD` values take
precedence over credentials embedded in the URI. The default URL points to a local
database and contains no credentials.

Set credentials separately with `SPRING_DATASOURCE_USERNAME` and
`SPRING_DATASOURCE_PASSWORD`. For example, in PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://db-host:5432/pc_builder_store"
$env:SPRING_DATASOURCE_USERNAME = "your-database-user"
$env:SPRING_DATASOURCE_PASSWORD = "your-database-password"
.\mvnw.cmd spring-boot:run
```

Alternatively, set `SPRING_DATASOURCE_URL` to a `jdbc:postgresql://...` URL and
supply credentials separately. Keep credentials out of source control and logs.

`CORS_ALLOWED_ORIGINS` is a comma-separated list of exact frontend origins. It
defaults to `http://localhost:5173`; add the deployed Vercel frontend origin when it
is known, for example:

```powershell
$env:CORS_ALLOWED_ORIGINS = "http://localhost:5173,https://your-store.vercel.app"
```

Origins are not wildcarded and credentialed CORS is disabled. SQL initialization is
disabled with `spring.sql.init.mode=never`. No Hibernate/JPA schema generation,
migration, or seed is part of this project foundation.
