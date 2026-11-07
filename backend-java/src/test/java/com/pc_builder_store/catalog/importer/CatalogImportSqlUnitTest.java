package com.pc_builder_store.catalog.importer;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.invocation.Invocation;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import tools.jackson.databind.ObjectMapper;

class CatalogImportSqlUnitTest {

    @Test
    void postgresPersistenceTargetRequiresLocalUuidDatabaseAndNoQueryParameters() {
        String database = "pcbs_import_it_123e4567-e89b-12d3-a456-426614174000";
        assertEquals(
                database,
                CatalogImporterPostgresPersistenceIT.validateDisposableJdbcUrl(
                        "jdbc:postgresql://[::1]:5432/" + database).group(2));
        assertThrows(
                IllegalStateException.class,
                () -> CatalogImporterPostgresPersistenceIT.validateDisposableJdbcUrl(
                        "jdbc:postgresql://localhost:5432/" + database + "?ApplicationName=it"));
        assertThrows(
                IllegalStateException.class,
                () -> CatalogImporterPostgresPersistenceIT.validateDisposableJdbcUrl(
                        "jdbc:postgresql://localhost:5432/pc_builder_store_it"));
        assertThrows(
                IllegalStateException.class,
                () -> CatalogImporterPostgresPersistenceIT.validateDisposableJdbcUrl(
                        "jdbc:postgresql://db.example.test:5432/" + database));
    }

    @Test
    void postgresPersistenceConnectionMustBeTheRequestedLocalDatabase() {
        String database = "pcbs_import_it_123e4567-e89b-12d3-a456-426614174000";
        CatalogImporterPostgresPersistenceIT.validateDisposableDatabaseIdentity(
                database, database, "::1/128");
        CatalogImporterPostgresPersistenceIT.validateDisposableDatabaseIdentity(
                database, database, "127.0.0.1/32");
        assertThrows(
                IllegalStateException.class,
                () -> CatalogImporterPostgresPersistenceIT.validateDisposableDatabaseIdentity(
                        database, "pc_builder_store_dev", "127.0.0.1"));
        assertThrows(
                IllegalStateException.class,
                () -> CatalogImporterPostgresPersistenceIT.validateDisposableDatabaseIdentity(
                        database, database, "192.168.1.5"));
        assertThrows(
                IllegalStateException.class,
                () -> CatalogImporterPostgresPersistenceIT.validateDisposableDatabaseIdentity(
                        database, database, "localhost"));
    }

    @Test
    void offerUpsertUsesConfiguredInsertDefaultAndOmitsExistingManagedFieldsFromUpdate() throws IOException {
        CatalogCsvImporter.validateDefaultOfferStock(5);
        CatalogCsvImporter.validateDefaultOfferStock(0);
        CatalogCsvImporter.validateDefaultOfferStock(4_294_967_295L);

        String catalogCsv = Files.readString(
                Path.of("..", "catalog-import-150-products.csv").toAbsolutePath().normalize(),
                StandardCharsets.UTF_8);
        CatalogCsvRow row = CatalogCsvImporter.parseRecords(catalogCsv, new ObjectMapper()).getFirst();
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        CatalogCsvImporter importer = new CatalogCsvImporter(
                jdbcTemplate, mock(PlatformTransactionManager.class), new ObjectMapper());
        importer.upsertOffer(row, 42L, 5);

        Invocation offerWrite = org.mockito.Mockito.mockingDetails(jdbcTemplate)
                .getInvocations().stream()
                .filter(invocation -> "update".equals(invocation.getMethod().getName()))
                .filter(invocation -> CatalogCsvImporter.OFFER_UPSERT_SQL.equals(invocation.getArguments()[0]))
                .findFirst()
                .orElseThrow();
        Object[] parameters = sqlParameters(offerWrite);
        assertEquals(BigDecimal.valueOf(5), parameters[4]);

        String conflictClause = CatalogCsvImporter.OFFER_UPSERT_SQL
                .substring(CatalogCsvImporter.OFFER_UPSERT_SQL.indexOf("DO UPDATE SET"));
        assertFalse(conflictClause.contains("\"stock_quantity\" ="));
        assertFalse(conflictClause.contains("\"reserved_quantity\" ="));
        assertFalse(conflictClause.contains("\"condition_code\" ="));
        assertFalse(conflictClause.contains("\"offer_status\" ="));
        assertTrue(conflictClause.contains("WHERE \"product_offers\".\"offer_code\" LIKE 'DEMO-%'"));

        assertEquals(BigDecimal.valueOf(5), parameters[4]);
        assertFalse(CatalogCsvImporter.PRODUCT_UPSERT_SQL.contains("\"product_status\" ="));
    }

    @Test
    void rejectsStockOutsideDatabaseRange() {
        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> CatalogCsvImporter.validateDefaultOfferStock(-1));
        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> CatalogCsvImporter.validateDefaultOfferStock(4_294_967_296L));
    }

    @Test
    void attributeTypesMustMatchRegistryAndMismatchNamesBothTypes() {
        CatalogCsvImporter.validatePersistedDataType("GPU", "vram_gb", "INTEGER", "INTEGER");

        IllegalStateException error = org.junit.jupiter.api.Assertions.assertThrows(
                IllegalStateException.class,
                () -> CatalogCsvImporter.validatePersistedDataType(
                        "GPU", "vram_gb", "TEXT", "INTEGER"));
        assertTrue(error.getMessage().contains("GPU"));
        assertTrue(error.getMessage().contains("vram_gb"));
        assertTrue(error.getMessage().contains("database type TEXT"));
        assertTrue(error.getMessage().contains("registry type INTEGER"));
        String normalizedSql = CatalogCsvImporter.ATTRIBUTE_DEFINITION_UPSERT_SQL.replaceAll("\\s+", " ");
        assertFalse(normalizedSql.contains("\"data_type\" = EXCLUDED"));
        assertTrue(normalizedSql.contains(
                "COALESCE(product_attribute_definitions.\"validation_json\", '{}'::jsonb)"
                        + " || EXCLUDED.\"validation_json\""));
    }

    @Test
    void verificationMetadataSqlCastsNullableTextAndRetainsJsonMerge() {
        String sql = CatalogCsvImporter.VERIFICATION_METADATA_UPSERT_SQL;
        assertTrue(sql.contains("jsonb_build_object(CAST(? AS text)"));
        assertTrue(sql.contains("'verificationStatus', CAST(? AS text)"));
        assertTrue(sql.contains("'sourceUrl', CAST(? AS text)"));
        assertTrue(sql.contains("'sourceLocator', CAST(? AS text)"));
        assertTrue(sql.contains("'verificationScope', CAST(? AS text)"));
        assertTrue(sql.contains("jsonb_strip_nulls(jsonb_build_object("));
        assertTrue(sql.contains("COALESCE(\"validation_json\", '{}'::jsonb)"));
        assertTrue(sql.contains("COALESCE(\"validation_json\" -> 'verificationByModel', '{}'::jsonb)"));
    }

    @Test
    void schemaPreflightRequiresImageAndAttributeValidationColumns() {
        List<String> missing = CatalogImportSchema.missingRequiredColumns(java.util.Set.of());

        assertTrue(missing.contains("product_images.image_id"));
        assertTrue(missing.contains("product_images.product_id"));
        assertTrue(missing.contains("product_images.image_url"));
        assertTrue(missing.contains("product_images.alt_text"));
        assertTrue(missing.contains("product_images.is_primary"));
        assertTrue(missing.contains("product_images.sort_order"));
        assertTrue(missing.contains("product_attribute_definitions.validation_json"));
    }

    @Test
    void mockedImageSyncDoesNotDeleteOrDemoteAnExistingPrimaryImage() throws IOException {
        String catalogCsv = Files.readString(
                Path.of("..", "catalog-import-150-products.csv").toAbsolutePath().normalize(),
                StandardCharsets.UTF_8);
        CatalogCsvRow row = CatalogCsvImporter.parseRecords(catalogCsv, new ObjectMapper()).stream()
                .filter(candidate -> candidate.images().size() == 5)
                .findFirst()
                .orElseThrow();

        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        CatalogCsvImporter importer = new CatalogCsvImporter(
                jdbcTemplate, mock(PlatformTransactionManager.class), new ObjectMapper());
        long productId = 42L;
        List<Map<String, Object>> firstRead = List.of(
                imageRow(1, "https://existing.example/primary.jpg", true),
                imageRow(2, row.images().getFirst().url(), false));
        List<Map<String, Object>> secondRead = new ArrayList<>(firstRead);
        for (int index = 1; index < row.images().size(); index++) {
            secondRead.add(imageRow(index + 2, row.images().get(index).url(), false));
        }
        when(jdbcTemplate.queryForList(anyString(), eq((Object) productId)))
                .thenReturn(firstRead, secondRead);

        importer.synchronizeImages(row, productId);
        importer.synchronizeImages(row, productId);

        List<Invocation> imageWrites = org.mockito.Mockito.mockingDetails(jdbcTemplate)
                .getInvocations().stream()
                .filter(invocation -> "update".equals(invocation.getMethod().getName()))
                .filter(invocation -> invocation.getArguments().length > 0
                        && invocation.getArguments()[0] instanceof String sql
                        && sql.contains("\"product_images\""))
                .toList();
        long inserts = imageWrites.stream()
                .filter(invocation -> ((String) invocation.getArguments()[0]).startsWith("INSERT"))
                .count();
        assertTrue(imageWrites.stream().noneMatch(
                invocation -> ((String) invocation.getArguments()[0]).startsWith("DELETE")));
        assertTrue(imageWrites.stream().anyMatch(
                invocation -> ((String) invocation.getArguments()[0]).contains("\"is_primary\" = CASE")));
        assertEquals(row.images().size() - 1, inserts);
        assertTrue(secondRead.stream().anyMatch(image ->
                "https://existing.example/primary.jpg".equals(image.get("image_url"))
                        && Boolean.TRUE.equals(image.get("is_primary"))));
    }

    @Test
    void firstActualImageBecomesPrimaryWhenEarlierImageSlotIsBlank() throws IOException {
        String catalogCsv = Files.readString(
                Path.of("..", "catalog-import-150-products.csv").toAbsolutePath().normalize(),
                StandardCharsets.UTF_8);
        CatalogCsvRow source = CatalogCsvImporter.parseRecords(catalogCsv, new ObjectMapper()).stream()
                .filter(row -> row.images().size() > 1)
                .findFirst()
                .orElseThrow();
        CatalogCsvImage firstActualImage = source.images().getFirst();
        CatalogCsvRow row = withImages(
                source,
                List.of(new CatalogCsvImage(
                        firstActualImage.url(), firstActualImage.altText(), firstActualImage.sortOrder() + 1)));

        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForList(anyString(), eq((Object) 42L))).thenReturn(List.of());
        CatalogCsvImporter importer = new CatalogCsvImporter(
                jdbcTemplate, mock(PlatformTransactionManager.class), new ObjectMapper());
        importer.synchronizeImages(row, 42L);

        Invocation imageInsert = org.mockito.Mockito.mockingDetails(jdbcTemplate)
                .getInvocations().stream()
                .filter(invocation -> "update".equals(invocation.getMethod().getName()))
                .filter(invocation -> invocation.getArguments()[0] instanceof String sql
                        && sql.startsWith("INSERT INTO \"product_images\""))
                .findFirst()
                .orElseThrow();
        assertEquals(Boolean.TRUE, sqlParameters(imageInsert)[3]);
    }

    private static Map<String, Object> imageRow(long imageId, String url, boolean primary) {
        return Map.of("image_id", imageId, "image_url", url, "is_primary", primary);
    }

    private static Object[] sqlParameters(Invocation invocation) {
        Object[] arguments = invocation.getArguments();
        if (arguments.length == 2 && arguments[1] instanceof Object[] parameters) {
            return parameters;
        }

        return Arrays.copyOfRange(arguments, 1, arguments.length);
    }

    private static CatalogCsvRow withImages(CatalogCsvRow row, List<CatalogCsvImage> images) {
        return new CatalogCsvRow(
                row.csvRowNumber(),
                row.modelCode(),
                row.productName(),
                row.brandName(),
                row.productTypeCode(),
                row.categoryCode(),
                row.price(),
                row.currencyCode(),
                row.priceSourceName(),
                row.priceSourceUrl(),
                row.priceCheckedAt(),
                row.priceIsEstimate(),
                row.warrantyMonths(),
                row.manufacturerSpecUrl(),
                images,
                row.dataNote(),
                row.specifications(),
                row.verificationMetadata());
    }
}
