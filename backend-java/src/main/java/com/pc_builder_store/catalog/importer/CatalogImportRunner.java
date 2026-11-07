package com.pc_builder_store.catalog.importer;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import tools.jackson.databind.ObjectMapper;

@Component
@ConditionalOnProperty(name = "catalog.import.enabled", havingValue = "true")
public class CatalogImportRunner implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(CatalogImportRunner.class);

    private final JdbcTemplate jdbcTemplate;
    private final Environment environment;
    private final CatalogCsvImporter importer;

    public CatalogImportRunner(
            JdbcTemplate jdbcTemplate,
            Environment environment,
            PlatformTransactionManager transactionManager,
            ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.environment = environment;
        this.importer = new CatalogCsvImporter(jdbcTemplate, transactionManager, objectMapper);
    }

    @Override
    public void run(ApplicationArguments arguments) {
        CatalogImportSafety.validateOptIn(environment.getProperty("catalog.import.opt-in"));
        CatalogImportSafety.validateJdbcUrl(environment.getProperty("spring.datasource.url"));

        Map<String, Object> connectionIdentity = jdbcTemplate.queryForMap(
                "SELECT current_database() AS database_name, inet_server_addr()::text AS server_address");
        CatalogImportSafety.validateConnectedDatabase(
                (String) connectionIdentity.get("database_name"),
                (String) connectionIdentity.get("server_address"));
        CatalogImportSchema.validate(jdbcTemplate);
        importer.validateExistingAttributeDefinitionTypes();

        Path csvPath = Path.of(environment.getProperty(
                "catalog.import.csv", "..\\catalog-import-150-products-enriched-v5.csv"));
        Path evidencePath = Path.of(environment.getProperty(
                "catalog.import.evidence-csv", "..\\seed\\catalog-attribute-evidence.csv"));
        long defaultStock = environment.getProperty("catalog.import.default-stock", Long.class, 5L);
        CatalogCsvImporter.validateDefaultOfferStock(defaultStock);
        List<CatalogCsvRow> rows = importer.readAndValidate(csvPath, evidencePath);
        boolean apply = environment.getProperty("catalog.import.apply", Boolean.class, false);
        if (!apply) {
            LOGGER.info(
                    "Catalog import preview validated {} products, 10 types, 10 categories, 41 brands, "
                            + "{} typed attribute values, and {} exact evidence matches. No database writes were made.",
                    rows.size(),
                    rows.stream().mapToInt(row -> row.specifications().size()).sum(),
                    rows.stream()
                            .flatMap(row -> row.verificationMetadata().values().stream())
                            .filter(evidence -> evidence.verificationStatus().startsWith("VERIFIED_"))
                            .count());
            return;
        }

        CatalogCsvImporter.ImportSummary summary = importer.apply(rows, defaultStock);
        LOGGER.info("Development catalog import committed: {}", summary);
    }
}
