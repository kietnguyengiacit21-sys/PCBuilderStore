package com.pc_builder_store.config;

import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class DatabaseConfiguration {

    private static final String DEFAULT_DATABASE_URL =
            "jdbc:postgresql://localhost:5432/pc_builder_store";

    @Bean
    @ConfigurationProperties("spring.datasource.hikari")
    public HikariDataSource dataSource(Environment environment) {
        String url = environment.getProperty("SPRING_DATASOURCE_URL");
        if (url == null || url.isBlank()) {
            url = environment.getProperty("DATABASE_URL", DEFAULT_DATABASE_URL);
        }

        DatabaseConnectionSettings settings = parseConnectionUrl(url);
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(settings.jdbcUrl());
        String username = environment.getProperty("SPRING_DATASOURCE_USERNAME");
        dataSource.setUsername(username != null ? username : settings.username());
        String password = environment.getProperty("SPRING_DATASOURCE_PASSWORD");
        dataSource.setPassword(password != null ? password : settings.password());
        return dataSource;
    }

    private DatabaseConnectionSettings parseConnectionUrl(String url) {
        if (url.startsWith("jdbc:postgresql://")) {
            validateJdbcUrl(url);
            return new DatabaseConnectionSettings(url, null, null);
        }
        if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
            return parsePostgresUri(url);
        }
        throw invalidConnectionUrl();
    }

    private void validateJdbcUrl(String url) {
        try {
            URI uri = new URI(url.substring("jdbc:".length()));
            validatePostgresUri(uri);
            if (uri.getRawUserInfo() != null || uri.getRawFragment() != null) {
                throw invalidConnectionUrl();
            }
        } catch (URISyntaxException exception) {
            throw invalidConnectionUrl();
        }
    }

    private DatabaseConnectionSettings parsePostgresUri(String url) {
        try {
            URI uri = new URI(url);
            validatePostgresUri(uri);
            if (uri.getRawFragment() != null) {
                throw invalidConnectionUrl();
            }

            String username = null;
            String password = null;
            String rawUserInfo = uri.getRawUserInfo();
            if (rawUserInfo != null) {
                int separator = rawUserInfo.indexOf(':');
                if (separator < 0) {
                    throw invalidConnectionUrl();
                }
                username = decodeUserInfo(rawUserInfo.substring(0, separator));
                password = decodeUserInfo(rawUserInfo.substring(separator + 1));
            }

            String rawAuthority = uri.getRawAuthority();
            String authorityWithoutCredentials = rawUserInfo == null
                    ? rawAuthority
                    : rawAuthority.substring(rawUserInfo.length() + 1);
            String jdbcUrl = "jdbc:postgresql://" + authorityWithoutCredentials
                    + uri.getRawPath()
                    + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery());
            return new DatabaseConnectionSettings(jdbcUrl, username, password);
        } catch (URISyntaxException exception) {
            throw invalidConnectionUrl();
        }
    }

    private void validatePostgresUri(URI uri) {
        String scheme = uri.getScheme();
        if (!("postgresql".equals(scheme) || "postgres".equals(scheme))
                || uri.getHost() == null
                || uri.getRawPath() == null
                || uri.getRawPath().length() <= 1
                || (uri.getPort() != -1 && (uri.getPort() < 1 || uri.getPort() > 65535))) {
            throw invalidConnectionUrl();
        }
    }

    private String decodeUserInfo(String value) {
        try {
            return URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException exception) {
            throw invalidConnectionUrl();
        }
    }

    private IllegalArgumentException invalidConnectionUrl() {
        return new IllegalArgumentException(
                "Invalid PostgreSQL connection URL. Use a jdbc:postgresql:// URL or a "
                        + "postgresql:// or postgres:// URI with a host and database name.");
    }

    private record DatabaseConnectionSettings(String jdbcUrl, String username, String password) {
    }
}
