package com.pc_builder_store.catalog.importer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class CatalogCsvImporterTest {

    private static final String HEADER = String.join(",", List.of(
            "model_code",
            "product_name",
            "brand_name",
            "product_type_code",
            "category_code",
            "short_description",
            "condition_code",
            "currency_code",
            "demo_price_vnd",
            "demo_stock_quantity",
            "warranty_months_demo",
            "specifications_json",
            "market_reference_url",
            "manufacturer_spec_url",
            "image_url",
            "image_usage_status",
            "data_verification_status",
            "data_notes"));

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void parsesBomQuotedJsonCommasAndVietnameseText() {
        List<String> fields = new ArrayList<>(List.of(
                "SKU-1", "Sản phẩm", "PC Builder", "ACCESSORY", "ACCESSORY", "Mô tả, có dấu",
                "NEW", "VND", "125000.00", "2", "12",
                "{\"accessory_type\":\"Adapter, \\\"quiet\\\"\"}",
                "https://example.test/category?a=1,b=2", "", "", "", "PARTIAL_REVIEW_REQUIRED", "Ghi chú"));
        String csv = "\uFEFF" + HEADER + "\r\n" + csvRow(fields);

        List<CatalogCsvRow> rows = CatalogCsvImporter.parseRecords(csv, objectMapper);

        assertEquals(1, rows.size());
        assertEquals("Sản phẩm", rows.getFirst().productName());
        assertEquals("Mô tả, có dấu", rows.getFirst().shortDescription());
        assertEquals("Adapter, \"quiet\"", rows.getFirst().specifications().get("accessory_type").textValue());
    }

    @Test
    void reportsInvalidDataWithCsvRecordNumber() {
        List<String> fields = new ArrayList<>(List.of(
                "SKU-1", "Product", "PC Builder", "ACCESSORY", "ACCESSORY", "",
                "NEW", "VND", "not-a-price", "2", "12",
                "{\"accessory_type\":\"adapter\"}", "", "", "", "", "PARTIAL_REVIEW_REQUIRED", ""));
        String csv = HEADER + "\n" + csvRow(fields);

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> CatalogCsvImporter.parseRecords(csv, objectMapper));

        assertTrue(error.getMessage().contains("CSV row 2"));
        assertTrue(error.getMessage().contains("demo_price_vnd"));
    }

    @Test
    void canonicalCsvHasExpectedRowsAndUniqueModelCodes() throws IOException {
        Path csvPath = Path.of("..", "seed", "catalog-150-products.csv").toAbsolutePath().normalize();
        String csv = Files.readString(csvPath, StandardCharsets.UTF_8);
        List<CatalogCsvRow> rows = CatalogCsvImporter.parseRecords(csv, objectMapper);

        CatalogCsvImporter.validateDataset(rows);

        assertEquals(150, rows.size());
        assertEquals(150, rows.stream().map(CatalogCsvRow::modelCode).distinct().count());
        assertEquals(10, rows.stream().map(CatalogCsvRow::productTypeCode).distinct().count());
        assertEquals(10, rows.stream().map(CatalogCsvRow::categoryCode).distinct().count());
        assertEquals(41, rows.stream().map(CatalogCsvRow::brandName).distinct().count());
        assertEquals(25, rows.stream()
                .flatMap(row -> row.specifications().keySet().stream()
                        .map(code -> row.productTypeCode() + ":" + code))
                .collect(java.util.stream.Collectors.toSet()).size());
        assertEquals(345, rows.stream().mapToInt(row -> row.specifications().size()).sum());
        assertEquals(Set.of(
                "ACCESSORY", "CASE", "COOLER", "CPU", "GPU",
                "MOTHERBOARD", "PC", "PSU", "RAM", "STORAGE"),
                rows.stream().map(CatalogCsvRow::productTypeCode).collect(java.util.stream.Collectors.toSet()));
    }

    @Test
    void demoOfferCodesAreDeterministicAndRecognizedByCatalogApi() {
        String first = CatalogCsvImporter.offerCode("MODEL-123");
        String second = CatalogCsvImporter.offerCode("MODEL-123");

        assertEquals(first, second);
        assertTrue(first.startsWith("DEMO-"));
    }

    @Test
    void rejectsGpuEnumValuesOutsideTheDefinitionOptions() throws Exception {
        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> CatalogCsvImporter.validateDataset(rowsWithGpuSpecification(
                        "memory_type", "\"GDDR8\"")));
        assertTrue(error.getMessage().contains("GPU:memory_type"));
        assertTrue(error.getMessage().contains("defined options"));
    }

    @Test
    void requiresRepeatedGpuSpecificationsToUseJsonArrays() throws Exception {
        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> CatalogCsvImporter.validateDataset(rowsWithGpuSpecification(
                        "display_outputs", "{\"type\":\"HDMI\",\"count\":1}")));
        assertTrue(error.getMessage().contains("GPU:display_outputs"));
        assertTrue(error.getMessage().contains("JSON array"));
    }

    private List<CatalogCsvRow> rowsWithGpuSpecification(String code, String jsonValue) throws Exception {
        Path csvPath = Path.of("..", "seed", "catalog-150-products.csv").toAbsolutePath().normalize();
        List<CatalogCsvRow> rows = new ArrayList<>(
                CatalogCsvImporter.parseRecords(Files.readString(csvPath, StandardCharsets.UTF_8), objectMapper));
        int gpuIndex = java.util.stream.IntStream.range(0, rows.size())
                .filter(index -> "GPU".equals(rows.get(index).productTypeCode()))
                .findFirst()
                .orElseThrow();
        CatalogCsvRow original = rows.get(gpuIndex);
        Map<String, tools.jackson.databind.JsonNode> values = new LinkedHashMap<>(original.specifications());
        values.put(code, objectMapper.readTree(jsonValue));
        rows.set(gpuIndex, new CatalogCsvRow(
                original.csvRowNumber(),
                original.modelCode(),
                original.productName(),
                original.brandName(),
                original.productTypeCode(),
                original.categoryCode(),
                original.shortDescription(),
                original.conditionCode(),
                original.currencyCode(),
                original.demoPrice(),
                original.demoStockQuantity(),
                original.warrantyMonths(),
                values));
        return rows;
    }

    private static String csvRow(List<String> fields) {
        return fields.stream()
                .map(value -> "\"" + value.replace("\"", "\"\"") + "\"")
                .reduce((left, right) -> left + "," + right)
                .orElseThrow();
    }
}
