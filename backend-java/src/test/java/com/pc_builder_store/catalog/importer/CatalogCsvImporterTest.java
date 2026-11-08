package com.pc_builder_store.catalog.importer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.pc_builder_store.catalog.AttributeDefinitionRegistry;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class CatalogCsvImporterTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void canonicalDatasetMapsAllRegistryDefinitionsAndEvidenceConservatively() throws IOException {
        String catalogCsv = Files.readString(
                Path.of("..", "catalog-import-150-products.csv").toAbsolutePath().normalize(),
                StandardCharsets.UTF_8);
        String evidenceCsv = Files.readString(
                Path.of("..", "seed", "catalog-attribute-evidence.csv").toAbsolutePath().normalize(),
                StandardCharsets.UTF_8);

        List<CatalogCsvRow> rows = CatalogCsvImporter.parseRecords(catalogCsv, evidenceCsv, objectMapper);
        CatalogCsvImporter.validateDataset(rows);

        assertEquals(150, rows.size());
        assertEquals(10, rows.stream().map(CatalogCsvRow::productTypeCode).distinct().count());
        assertEquals(10, rows.stream().map(CatalogCsvRow::categoryCode).distinct().count());
        assertEquals(41, rows.stream().map(CatalogCsvRow::brandName).distinct().count());
        assertEquals(348, AttributeDefinitionRegistry.all().size());
        assertEquals(2482, rows.stream().mapToInt(row -> row.specifications().size()).sum());
        assertEquals(150, rows.stream().filter(CatalogCsvRow::priceIsEstimate).count());
        assertEquals(81, rows.stream()
                .map(row -> row.specifications().get("configuration_items"))
                .filter(value -> value != null)
                .mapToInt(JsonNode::size)
                .sum());

        CatalogCsvRow rtx4060 = rowByModel(rows, "DUAL-RTX4060-O8G");
        assertEquals(
                "VERIFIED_EXACT_VARIANT",
                rtx4060.verificationMetadata().get("slot_thickness").verificationStatus());
        assertEquals("2.5", rtx4060.specifications().get("slot_thickness").toString());
        assertEquals("https://www.asus.com/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g/techspec/",
                rtx4060.verificationMetadata().get("slot_thickness").sourceUrl());

        CatalogCsvRow rtx4060Ti = rowByModel(rows, "DUAL-RTX4060TI-O8G");
        assertEquals("VERIFIED_EXACT_VARIANT",
                rtx4060Ti.verificationMetadata().get("recommended_psu_watt").verificationStatus());
        assertEquals("650", rtx4060Ti.specifications().get("recommended_psu_watt").toString());

        CatalogCsvRow rtx4070Super = rowByModel(rows, "DUAL-RTX4070S-O12G");
        assertEquals("2.56", rtx4070Super.specifications().get("slot_thickness").toString());
        assertEquals("VERIFIED_EXACT_VARIANT",
                rtx4070Super.verificationMetadata().get("slot_thickness").verificationStatus());
        assertTrue(rtx4070Super.specifications().get("power_connectors").isArray());
        assertFalse(rtx4070Super.verificationMetadata().isEmpty());

        long verifiedRows = rows.stream()
                .flatMap(row -> row.verificationMetadata().values().stream())
                .filter(metadata -> metadata.verificationStatus().startsWith("VERIFIED_"))
                .count();
        assertEquals(42, verifiedRows);
        assertTrue(rows.stream()
                .flatMap(row -> row.verificationMetadata().values().stream())
                .anyMatch(metadata -> "NEEDS_REVIEW".equals(metadata.verificationStatus())));
    }

    @Test
    void rejectsLegacyHeaderInsteadOfFallingBackToLegacyCsv() {
        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> CatalogCsvImporter.parseRecords("model_code,product_name\nSKU,Product\n", objectMapper));

        assertTrue(error.getMessage().contains("24 canonical base columns"));
    }

    @Test
    void demoOfferCodesAreDeterministicAndNamespaced() {
        String first = CatalogCsvImporter.offerCode("MODEL-123");

        assertEquals(first, CatalogCsvImporter.offerCode("MODEL-123"));
        assertTrue(first.startsWith("DEMO-"));
    }

    @Test
    void rejectsJsonArrayAttributeWhenItsCellIsAnObject() throws Exception {
        var definition = AttributeDefinitionRegistry.find("GPU", "display_outputs").orElseThrow();
        JsonNode objectValue = objectMapper.readTree("{\"type\":\"HDMI\",\"count\":1}");

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> CatalogCsvImporter.validateDefinitionValue(objectValue, definition, 2));

        assertTrue(error.getMessage().contains("must be a JSON array"));
    }

    @Test
    void rejectsGpuEnumValuesOutsideDefinitionOptions() {
        var definition = AttributeDefinitionRegistry.find("GPU", "memory_type").orElseThrow();
        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> CatalogCsvImporter.validateDefinitionValue(
                        objectMapper.getNodeFactory().textNode("GDDR8"), definition, 2));
        assertTrue(error.getMessage().contains("defined options"));
    }

    @Test
    void normalizesOnlyGpuPcieGenerationFour() {
        var gpuPcie = AttributeDefinitionRegistry.find("GPU", "pcie_generation").orElseThrow();
        var gpuMemoryType = AttributeDefinitionRegistry.find("GPU", "memory_type").orElseThrow();

        assertEquals("PCIe 4.0", CatalogCsvImporter.normalizeOptionValue(gpuPcie, "4.0"));
        assertEquals("5.0", CatalogCsvImporter.normalizeOptionValue(gpuPcie, "5.0"));
        assertEquals("GDDR6", CatalogCsvImporter.normalizeOptionValue(gpuMemoryType, "GDDR6"));
        assertThrows(
                IllegalArgumentException.class,
                () -> CatalogCsvImporter.validateDefinitionValue(
                        objectMapper.getNodeFactory().textNode(
                                CatalogCsvImporter.normalizeOptionValue(gpuPcie, "5.0")),
                        gpuPcie,
                        2));
    }

    @Test
    void rejectsConfigurationItemsThatReferenceMissingModels() throws Exception {
        CatalogCsvRow pc = canonicalRows().stream()
                .filter(row -> "PC".equals(row.productTypeCode()))
                .findFirst()
                .orElseThrow();
        JsonNode items = objectMapper.readTree(
                pc.specifications().get("configuration_items").toString()
                        .replaceFirst(
                                "\"model_code\":\"[^\"]+\"",
                                "\"model_code\":\"MISSING-MODEL\""));
        Map<String, String> productTypes = productTypesByModel(canonicalRows());

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> CatalogCsvImporter.validateConfigurationItems(
                        withConfigurationItems(pc, items), productTypes));
        assertTrue(error.getMessage().contains("MISSING-MODEL"));
    }

    @Test
    void rejectsConfigurationItemsWithMismatchedComponentTypes() throws Exception {
        CatalogCsvRow pc = canonicalRows().stream()
                .filter(row -> "PC".equals(row.productTypeCode()))
                .findFirst()
                .orElseThrow();
        JsonNode items = objectMapper.readTree(
                pc.specifications().get("configuration_items").toString()
                        .replaceFirst("\"component_type\":\"CPU\"", "\"component_type\":\"GPU\""));
        Map<String, String> productTypes = productTypesByModel(canonicalRows());

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> CatalogCsvImporter.validateConfigurationItems(
                        withConfigurationItems(pc, items), productTypes));
        assertTrue(error.getMessage().contains("product_type_code is CPU"));
    }

    @Test
    void rejectsMalformedConfigurationItemStructures() throws Exception {
        CatalogCsvRow pc = canonicalRows().stream()
                .filter(row -> "PC".equals(row.productTypeCode()))
                .findFirst()
                .orElseThrow();
        JsonNode malformed = objectMapper.readTree("[{\"component_type\":\"CPU\"}]");

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> CatalogCsvImporter.validateConfigurationItems(
                        withConfigurationItems(pc, malformed), Map.of()));
        assertTrue(error.getMessage().contains("model_code"));
    }

    @Test
    void parserDeduplicatesRepeatedImageUrls() throws IOException {
        String catalogCsv = Files.readString(
                Path.of("..", "catalog-import-150-products.csv").toAbsolutePath().normalize(),
                StandardCharsets.UTF_8);
        CatalogCsvRow original = CatalogCsvImporter.parseRecords(catalogCsv, objectMapper).stream()
                .filter(row -> row.images().size() == 5)
                .findFirst()
                .orElseThrow();
        String duplicateUrl = original.images().get(1).url();
        String firstUrl = original.images().getFirst().url();

        List<CatalogCsvRow> rows = CatalogCsvImporter.parseRecords(
                catalogCsv.replace(duplicateUrl, firstUrl), objectMapper);
        CatalogCsvRow changed = rowByModel(rows, original.modelCode());

        assertEquals(4, changed.images().size());
        assertEquals(
                changed.images().size(),
                changed.images().stream().map(CatalogCsvImage::url).distinct().count());
    }

    @Test
    void onlyRegistryDefinedHeadersAreAccepted() throws IOException {
        String catalogCsv = Files.readString(
                Path.of("..", "catalog-import-150-products.csv").toAbsolutePath().normalize(),
                StandardCharsets.UTF_8);
        String changedHeader = catalogCsv.replaceFirst("gpu__gpu_chip", "gpu__unregistered_field");

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> CatalogCsvImporter.parseRecords(changedHeader, objectMapper));

        assertTrue(error.getMessage().contains("known registry attribute columns"));
    }

    private static CatalogCsvRow rowByModel(List<CatalogCsvRow> rows, String modelCode) {
        return rows.stream()
                .filter(row -> modelCode.equals(row.modelCode()))
                .findFirst()
                .orElseThrow();
    }

    private List<CatalogCsvRow> canonicalRows() throws IOException {
        String catalogCsv = Files.readString(
                Path.of("..", "catalog-import-150-products.csv").toAbsolutePath().normalize(),
                StandardCharsets.UTF_8);
        return CatalogCsvImporter.parseRecords(catalogCsv, objectMapper);
    }

    private static Map<String, String> productTypesByModel(List<CatalogCsvRow> rows) {
        Map<String, String> productTypes = new HashMap<>();
        rows.forEach(row -> productTypes.put(row.modelCode(), row.productTypeCode()));
        return productTypes;
    }

    private static CatalogCsvRow withConfigurationItems(CatalogCsvRow row, JsonNode items) {
        Map<String, JsonNode> specifications = new LinkedHashMap<>(row.specifications());
        specifications.put("configuration_items", items);
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
                row.images(),
                row.dataNote(),
                Map.copyOf(specifications),
                row.verificationMetadata());
    }
}
