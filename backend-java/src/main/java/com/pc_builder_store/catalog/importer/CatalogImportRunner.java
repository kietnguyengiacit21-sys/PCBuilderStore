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
        verifyCommittedCatalog(rows, summary);
        LOGGER.info("Development catalog import committed: {}", summary);
    }

    private void verifyCommittedCatalog(List<CatalogCsvRow> rows, CatalogCsvImporter.ImportSummary summary) {
        String placeholders = String.join(",", java.util.Collections.nCopies(rows.size(), "?"));
        Object[] modelCodes = rows.stream().map(CatalogCsvRow::modelCode).toArray();
        Long products = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM products WHERE model_code IN (" + placeholders + ")",
                Long.class,
                modelCodes);
        Long offers = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM product_offers "
                        + "WHERE offer_code IN (SELECT 'DEMO-' || model_code FROM products "
                        + "WHERE model_code IN (" + placeholders + "))",
                Long.class,
                modelCodes);
        Long attributeValues = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM product_attribute_values value "
                        + "JOIN products product ON product.product_id = value.product_id "
                        + "WHERE product.model_code IN (" + placeholders + ") "
                        + "AND (value.value_text IS NOT NULL OR value.value_decimal IS NOT NULL "
                        + "OR value.value_integer IS NOT NULL OR value.value_boolean IS NOT NULL "
                        + "OR value.value_json IS NOT NULL)",
                Long.class,
                modelCodes);
        Long verificationMetadata = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM product_attribute_definitions definition "
                        + "CROSS JOIN LATERAL jsonb_each(COALESCE("
                        + "definition.validation_json -> 'verificationByModel', '{}'::jsonb)) metadata "
                        + "WHERE metadata.key IN (" + placeholders + ")",
                Long.class,
                modelCodes);
        long expectedVerificationMetadata = rows.stream()
                .mapToLong(row -> row.verificationMetadata().size())
                .sum();

        if (products == null || products != rows.size()
                || offers == null || offers != summary.offers()
                || attributeValues == null || attributeValues < summary.attributeValues()
                || verificationMetadata == null || verificationMetadata < expectedVerificationMetadata) {
            throw new IllegalStateException(
                    "Catalog persistence verification failed: products=" + products + "/" + rows.size()
                            + ", offers=" + offers + "/" + summary.offers()
                            + ", typedAttributeValues=" + attributeValues + "/" + summary.attributeValues()
                            + ", verificationMetadata=" + verificationMetadata + "/"
                            + expectedVerificationMetadata + ".");
        }
        LOGGER.info(
                "Catalog persistence verified in PostgreSQL: products={}/{}, DEMO offers={}/{}, "
                        + "typed attribute values={}/at least {}, verification metadata={}/at least {}.",
                products,
                rows.size(),
                offers,
                summary.offers(),
                attributeValues,
                summary.attributeValues(),
                verificationMetadata,
                expectedVerificationMetadata);
    }
}
