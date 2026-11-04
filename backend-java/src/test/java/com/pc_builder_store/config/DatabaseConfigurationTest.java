package com.pc_builder_store.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class DatabaseConfigurationTest {

    private final DatabaseConfiguration configuration = new DatabaseConfiguration();

    @Test
    void acceptsJdbcUrlAndSeparateCredentials() {
        HikariDataSource dataSource = createDataSource(
                "SPRING_DATASOURCE_URL",
                "jdbc:postgresql://host:5432/database?sslmode=require",
                "SPRING_DATASOURCE_USERNAME", "jdbc-user",
                "SPRING_DATASOURCE_PASSWORD", "jdbc-password");

        assertDataSource(dataSource,
                "jdbc:postgresql://host:5432/database?sslmode=require",
                "jdbc-user", "jdbc-password");
    }

    @Test
    void parsesPostgresqlUriCredentials() {
        HikariDataSource dataSource = createDataSource(
                "DATABASE_URL", "postgresql://uri-user:uri-password@host:5432/database");

        assertDataSource(dataSource,
                "jdbc:postgresql://host:5432/database",
                "uri-user", "uri-password");
    }

    @Test
    void parsesPostgresAlias() {
        HikariDataSource dataSource = createDataSource(
                "DATABASE_URL", "postgres://uri-user:uri-password@host:5432/database");

        assertDataSource(dataSource,
                "jdbc:postgresql://host:5432/database",
                "uri-user", "uri-password");
    }

    @Test
    void decodesPercentEncodedCredentials() {
        HikariDataSource dataSource = createDataSource(
                "DATABASE_URL", "postgresql://user%40domain:p%40ss%3Aword@host/database");

        assertDataSource(dataSource,
                "jdbc:postgresql://host/database",
                "user@domain", "p@ss:word");
    }

    @Test
    void preservesSslQueryParameters() {
        HikariDataSource dataSource = createDataSource(
                "DATABASE_URL",
                "postgresql://uri-user:uri-password@host:5432/database?sslmode=require&connect_timeout=10");

        assertEquals(
                "jdbc:postgresql://host:5432/database?sslmode=require&connect_timeout=10",
                dataSource.getJdbcUrl());
        dataSource.close();
    }

    @Test
    void explicitCredentialsOverrideCredentialsFromUri() {
        HikariDataSource dataSource = createDataSource(
                "DATABASE_URL", "postgresql://uri-user:uri-password@host/database",
                "SPRING_DATASOURCE_USERNAME", "explicit-user",
                "SPRING_DATASOURCE_PASSWORD", "explicit-password");

        assertDataSource(dataSource,
                "jdbc:postgresql://host/database",
                "explicit-user", "explicit-password");
    }

    @Test
    void rejectsMalformedOrUnsupportedUrlsWithSanitizedMessage() {
        String configuredUrl = "mysql://secret-user:secret-password@host/database";
        assertSanitizedConfigurationError(configuredUrl, "secret-password");
    }

    @Test
    void rejectsMalformedPostgresqlUriWithoutExposingIt() {
        String configuredUrl = "postgresql://secret-user:secret-password@host/%ZZ";
        assertSanitizedConfigurationError(configuredUrl, configuredUrl);
    }

    @Test
    void retainsLocalDevelopmentFallback() {
        HikariDataSource dataSource = configuration.dataSource(new MockEnvironment());

        assertDataSource(
                dataSource,
                "jdbc:postgresql://localhost:5432/pc_builder_store",
                null,
                null);
    }

    private HikariDataSource createDataSource(String... nameValues) {
        MockEnvironment environment = new MockEnvironment();
        for (int i = 0; i < nameValues.length; i += 2) {
            environment.setProperty(nameValues[i], nameValues[i + 1]);
        }
        return configuration.dataSource(environment);
    }

    private void assertSanitizedConfigurationError(String configuredUrl, String secret) {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> createDataSource("DATABASE_URL", configuredUrl));

        assertEquals(
                "Invalid PostgreSQL connection URL. Use a jdbc:postgresql:// URL or a "
                        + "postgresql:// or postgres:// URI with a host and database name.",
                exception.getMessage());
        assertFalse(exception.getMessage().contains(secret));
    }

    private void assertDataSource(
            HikariDataSource dataSource,
            String expectedUrl,
            String expectedUsername,
            String expectedPassword) {
        assertEquals(expectedUrl, dataSource.getJdbcUrl());
        if (expectedUsername == null) {
            assertNull(dataSource.getUsername());
        } else {
            assertEquals(expectedUsername, dataSource.getUsername());
        }
        if (expectedPassword == null) {
            assertNull(dataSource.getPassword());
        } else {
            assertEquals(expectedPassword, dataSource.getPassword());
        }
        dataSource.close();
    }
}
