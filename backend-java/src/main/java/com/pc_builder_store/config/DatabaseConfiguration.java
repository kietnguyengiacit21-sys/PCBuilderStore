package com.pc_builder_store.config;

import com.zaxxer.hikari.HikariDataSource;
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
        HikariDataSource dataSource = new HikariDataSource();
        String url = environment.getProperty("SPRING_DATASOURCE_URL");
        if (url == null || url.isBlank()) {
            url = environment.getProperty("DATABASE_URL", DEFAULT_DATABASE_URL);
        }

        dataSource.setJdbcUrl(toJdbcUrl(url));
        String username = environment.getProperty("SPRING_DATASOURCE_USERNAME");
        if (username != null) {
            dataSource.setUsername(username);
        }
        String password = environment.getProperty("SPRING_DATASOURCE_PASSWORD");
        if (password != null) {
            dataSource.setPassword(password);
        }
        return dataSource;
    }

    private String toJdbcUrl(String url) {
        if (url.startsWith("postgresql://")) {
            return "jdbc:" + url;
        }
        if (url.startsWith("postgres://")) {
            return "jdbc:postgresql://" + url.substring("postgres://".length());
        }
        return url;
    }
}
