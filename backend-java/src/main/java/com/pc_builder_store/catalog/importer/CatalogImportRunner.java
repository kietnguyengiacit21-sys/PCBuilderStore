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
                "catalog.import.csv", "..\\catalog-import-full-demo-v4.csv"));
        String evidenceCsv = environment.getProperty("catalog.import.evidence-csv");
        Path evidencePath = evidenceCsv == null || evidenceCsv.isBlank()
                ? null
                : Path.of(evidenceCsv);
        long defaultStock = environment.getProperty("catalog.import.default-stock", Long.class, 5L);
        CatalogCsvImporter.validateDefaultOfferStock(defaultStock);
        List<CatalogCsvRow> rows = importer.readAndValidate(csvPath, evidencePath);
        boolean apply = environment.getProperty("catalog.import.apply", Boolean.class, false);
        if (!apply) {
            CatalogCsvImporter.ImportSummary summary = importer.preview(rows, defaultStock);
            LOGGER.info("Catalog import preview (no writes): {}", summary);
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
        Long activeOffers = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM product_offers "
                        + "WHERE offer_code IN (SELECT 'DEMO-' || model_code FROM products "
                        + "WHERE model_code IN (" + placeholders + ")) "
                        + "AND offer_status = 'ACTIVE'",
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
        Long bomComponents = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM product_bom_components bom "
                        + "JOIN products parent ON parent.product_id = bom.parent_product_id "
                        + "JOIN product_types type ON type.product_type_id = parent.product_type_id "
                        + "WHERE parent.model_code IN (" + placeholders + ") AND type.type_code = 'PC'",
                Long.class,
                modelCodes);
        Long upgradeGroups = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM product_upgrade_groups groups "
                        + "JOIN products product ON product.product_id = groups.product_id "
                        + "WHERE product.model_code IN (" + placeholders + ") "
                        + "AND groups.is_enabled = TRUE",
                Long.class,
                modelCodes);
        Long upgradeOptions = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM product_upgrade_options options "
                        + "JOIN product_upgrade_groups groups "
                        + "ON groups.upgrade_group_id = options.upgrade_group_id "
                        + "JOIN products product ON product.product_id = groups.product_id "
                        + "WHERE product.model_code IN (" + placeholders + ") "
                        + "AND groups.is_enabled = TRUE AND options.is_enabled = TRUE",
                Long.class,
                modelCodes);

        if (products == null || products != rows.size()
                || activeOffers == null || activeOffers != summary.offers()
                || attributeValues == null || attributeValues < summary.attributeValues()
                || verificationMetadata == null || verificationMetadata < expectedVerificationMetadata
                || bomComponents == null || bomComponents != summary.bomComponents()
                || upgradeGroups == null || upgradeGroups != summary.upgradeGroups()
                || upgradeOptions == null || upgradeOptions != summary.upgradeOptions()) {
            throw new IllegalStateException(
                    "Catalog persistence verification failed: products=" + products + "/" + rows.size()
                            + ", active offers=" + activeOffers + "/" + summary.offers()
                            + ", typedAttributeValues=" + attributeValues + "/" + summary.attributeValues()
                            + ", verificationMetadata=" + verificationMetadata + "/"
                            + expectedVerificationMetadata + ", BOM components=" + bomComponents
                            + "/" + summary.bomComponents() + ", active upgrade groups=" + upgradeGroups
                            + "/" + summary.upgradeGroups() + ", active upgrade options=" + upgradeOptions
                            + "/" + summary.upgradeOptions() + ".");
        }
        LOGGER.info(
                "Catalog persistence verified in PostgreSQL: products={}/{}, active catalog offers={}/{}, "
                        + "typed attribute values={}/at least {}, verification metadata={}/at least {}, "
                        + "PC BOM components={}/{}, active upgrade groups={}/{}, active upgrade options={}/{}.",
                products,
                rows.size(),
                activeOffers,
                summary.offers(),
                attributeValues,
                summary.attributeValues(),
                verificationMetadata,
                expectedVerificationMetadata,
                bomComponents,
                summary.bomComponents(),
                upgradeGroups,
                summary.upgradeGroups(),
                upgradeOptions,
                summary.upgradeOptions());
    }
}
