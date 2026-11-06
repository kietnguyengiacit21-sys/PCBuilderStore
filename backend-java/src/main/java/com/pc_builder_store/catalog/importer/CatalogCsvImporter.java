package com.pc_builder_store.catalog.importer;

import com.pc_builder_store.catalog.AttributeDefinitionRegistry;
import com.pc_builder_store.catalog.AttributeDefinitionRegistry.Definition;
import java.io.IOException;
import java.io.StringReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public final class CatalogCsvImporter {

    private static final List<String> HEADERS = List.of(
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
            "data_notes");
    private static final Map<String, String> PRODUCT_TYPE_NAMES = Map.ofEntries(
            Map.entry("ACCESSORY", "Accessory"),
            Map.entry("CASE", "PC Case"),
            Map.entry("COOLER", "CPU Cooler"),
            Map.entry("CPU", "Processor"),
            Map.entry("GPU", "Graphics Card"),
            Map.entry("MOTHERBOARD", "Motherboard"),
            Map.entry("PC", "Complete PC"),
            Map.entry("PSU", "Power Supply"),
            Map.entry("RAM", "Memory"),
            Map.entry("STORAGE", "Storage"));
    private static final Map<String, String> CATEGORY_CODES = Map.ofEntries(
            Map.entry("ACCESSORY", "ACCESSORY"),
            Map.entry("CASE", "CASE"),
            Map.entry("COOLER", "COOLER"),
            Map.entry("CPU", "CPU"),
            Map.entry("GPU", "GPU"),
            Map.entry("MOTHERBOARD", "MAINBOARD"),
            Map.entry("PC", "PREBUILT_PC"),
            Map.entry("PSU", "PSU"),
            Map.entry("RAM", "RAM"),
            Map.entry("STORAGE", "STORAGE"));
    private static final Map<String, String> CATEGORY_NAMES = Map.ofEntries(
            Map.entry("ACCESSORY", "Phụ kiện"),
            Map.entry("CASE", "Vỏ case"),
            Map.entry("COOLER", "Tản nhiệt CPU"),
            Map.entry("CPU", "CPU"),
            Map.entry("GPU", "Card đồ họa"),
            Map.entry("MAINBOARD", "Bo mạch chủ"),
            Map.entry("PREBUILT_PC", "PC lắp sẵn"),
            Map.entry("PSU", "Nguồn máy tính"),
            Map.entry("RAM", "RAM"),
            Map.entry("STORAGE", "Ổ cứng / SSD"));
    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;
    private final ObjectMapper objectMapper;

    public CatalogCsvImporter(
            JdbcTemplate jdbcTemplate,
            PlatformTransactionManager transactionManager,
            ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.objectMapper = objectMapper;
    }

    public List<CatalogCsvRow> readAndValidate(Path csvPath) {
        try {
            String csv = Files.readString(csvPath, StandardCharsets.UTF_8);
            List<CatalogCsvRow> rows = parseRecords(csv, objectMapper);
            validateDataset(rows);
            return rows;
        } catch (IOException exception) {
            throw new IllegalArgumentException("Could not read catalog CSV " + csvPath + ".", exception);
        }
    }

    static List<CatalogCsvRow> parseRecords(String csv, ObjectMapper objectMapper) {
        String content = csv.startsWith("\uFEFF") ? csv.substring(1) : csv;
        try (CSVParser parser = CSVParser.parse(
                new StringReader(content),
                CSVFormat.DEFAULT.builder()
                        .setHeader()
                        .setSkipHeaderRecord(true)
                        .setIgnoreEmptyLines(false)
                        .build())) {
            if (!HEADERS.equals(parser.getHeaderNames())) {
                throw new IllegalArgumentException(
                        "CSV header does not exactly match the canonical catalog header.");
            }
            List<CatalogCsvRow> rows = new ArrayList<>();
            for (CSVRecord record : parser) {
                int rowNumber = Math.toIntExact(record.getRecordNumber() + 1);
                if (!record.isConsistent() || record.size() != HEADERS.size()) {
                    throw rowError(rowNumber, "expected " + HEADERS.size() + " columns.");
                }
                rows.add(parseRow(record, rowNumber, objectMapper));
            }
            return List.copyOf(rows);
        } catch (IOException exception) {
            throw new IllegalArgumentException(
                    "Could not parse catalog CSV: " + exception.getMessage(), exception);
        }
    }

    static void validateDataset(List<CatalogCsvRow> rows) {
        if (rows.size() != 150) {
            throw new IllegalArgumentException("Expected exactly 150 CSV products; found " + rows.size() + ".");
        }
        Set<String> modelCodes = new HashSet<>();
        Set<String> normalizedModelCodes = new HashSet<>();
        Set<String> productTypes = new HashSet<>();
        Set<String> categories = new HashSet<>();
        Set<String> brands = new HashSet<>();
        Map<String, String> normalizedBrands = new HashMap<>();
        Map<String, String> attributeTypes = new HashMap<>();
        for (CatalogCsvRow row : rows) {
            if (!modelCodes.add(row.modelCode())
                    || !normalizedModelCodes.add(databaseNaturalKey(row.modelCode()))) {
                throw rowError(
                        row.csvRowNumber(),
                        "duplicate model_code " + row.modelCode() + " under the database collation.");
            }
            productTypes.add(row.productTypeCode());
            categories.add(row.categoryCode());
            brands.add(row.brandName());
            String existingBrand = normalizedBrands.putIfAbsent(
                    databaseNaturalKey(row.brandName()), row.brandName());
            if (existingBrand != null && !existingBrand.equals(row.brandName())) {
                throw rowError(
                        row.csvRowNumber(),
                        "duplicate brand_name " + row.brandName() + " under the database collation.");
            }
            if (!row.categoryCode().equals(CATEGORY_CODES.get(row.productTypeCode()))) {
                throw rowError(
                        row.csvRowNumber(),
                        "category_code " + row.categoryCode() + " is not mapped to product_type_code "
                                + row.productTypeCode() + ".");
            }
            for (Map.Entry<String, JsonNode> specification : row.specifications().entrySet()) {
                String key = row.productTypeCode() + ":" + specification.getKey();
                Definition definition = AttributeDefinitionRegistry
                        .find(row.productTypeCode(), specification.getKey())
                        .orElse(null);
                if (definition == null) {
                    throw rowError(row.csvRowNumber(), "unsupported specification " + key + ".");
                }
                String dataType = dataType(specification.getValue());
                if (!definition.dataType().equals(dataType)) {
                    throw rowError(row.csvRowNumber(), "specification " + key + " must use "
                            + definition.dataType() + " values.");
                }
                if (!definition.options().isEmpty()
                        && !definition.options().contains(specification.getValue().textValue())) {
                    throw rowError(row.csvRowNumber(), "specification " + key
                            + " must use one of its defined options.");
                }
                if ("JSON_ARRAY".equals(definition.inputMode())
                        && !specification.getValue().isArray()) {
                    throw rowError(row.csvRowNumber(), "specification " + key + " must be a JSON array.");
                }
                String previousType = attributeTypes.putIfAbsent(key, dataType);
                if (previousType != null && !previousType.equals(dataType)) {
                    throw rowError(row.csvRowNumber(), "specification " + key + " changes data type.");
                }
            }
        }
        if (modelCodes.size() != 150 || productTypes.size() != 10
                || categories.size() != 10 || brands.size() != 41) {
            throw new IllegalArgumentException(
                    "Catalog CSV count validation failed: expected 150 unique models, 10 types, "
                            + "10 categories, and 41 brands; found "
                            + modelCodes.size() + ", " + productTypes.size() + ", "
                            + categories.size() + ", and " + brands.size() + ".");
        }
        if (!productTypes.equals(PRODUCT_TYPE_NAMES.keySet())
                || !categories.equals(CATEGORY_NAMES.keySet())) {
            throw new IllegalArgumentException(
                    "Catalog CSV contains missing or unsupported product type/category references.");
        }
    }

    static String offerCode(String modelCode) {
        return "DEMO-" + modelCode;
    }

    public ImportSummary apply(List<CatalogCsvRow> rows) {
        validateDataset(rows);
        return transactionTemplate.execute(status -> applyInTransaction(rows));
    }

    private ImportSummary applyInTransaction(List<CatalogCsvRow> rows) {
        Map<String, Long> typeIds = ensureProductTypes();
        Map<String, Long> categoryIds = ensureCategories();
        Map<String, Long> brandIds = ensureBrands(rows);
        Map<AttributeKey, Long> definitionIds = ensureAttributeDefinitions(rows, typeIds);

        int attributeValueCount = 0;
        for (CatalogCsvRow row : rows) {
            long productId = upsertProduct(row, typeIds, categoryIds, brandIds);
            upsertOffer(row, productId);
            for (Map.Entry<String, JsonNode> specification : row.specifications().entrySet()) {
                AttributeKey key = new AttributeKey(row.productTypeCode(), specification.getKey());
                upsertAttributeValue(
                        productId,
                        definitionIds.get(key),
                        specification.getValue());
                attributeValueCount++;
            }
        }
        return new ImportSummary(rows.size(), typeIds.size(), categoryIds.size(), brandIds.size(),
                rows.size(), definitionIds.size(), attributeValueCount);
    }

    private Map<String, Long> ensureProductTypes() {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (Map.Entry<String, String> type : PRODUCT_TYPE_NAMES.entrySet()) {
            jdbcTemplate.update("""
                    INSERT INTO "product_types"
                      ("type_code", "type_name", "description", "is_build_component", "is_active")
                    VALUES (?, ?, 'Demo catalog product type', ?, TRUE)
                    ON CONFLICT ("type_code") DO UPDATE SET
                      "type_name" = EXCLUDED."type_name",
                      "description" = EXCLUDED."description",
                      "is_build_component" = EXCLUDED."is_build_component",
                      "is_active" = TRUE
                    """, type.getKey(), type.getValue(),
                    !Set.of("PC", "ACCESSORY").contains(type.getKey()));
            ids.put(type.getKey(), lookupId(
                    "SELECT \"product_type_id\" FROM \"product_types\" WHERE \"type_code\" = ?",
                    type.getKey()));
        }
        return ids;
    }

    private Map<String, Long> ensureCategories() {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (Map.Entry<String, String> category : CATEGORY_NAMES.entrySet()) {
            jdbcTemplate.update("""
                    INSERT INTO "categories" ("category_code", "category_name", "description", "is_active")
                    VALUES (?, ?, 'Danh mục demo catalog PC Builder Store', TRUE)
                    ON CONFLICT ("category_code") DO UPDATE SET
                      "category_name" = EXCLUDED."category_name",
                      "description" = EXCLUDED."description",
                      "is_active" = TRUE
                    """, category.getKey(), category.getValue());
            ids.put(category.getKey(), lookupId(
                    "SELECT \"category_id\" FROM \"categories\" WHERE \"category_code\" = ?",
                    category.getKey()));
        }
        return ids;
    }

    private Map<String, Long> ensureBrands(List<CatalogCsvRow> rows) {
        Set<String> brandNames = new HashSet<>();
        rows.forEach(row -> brandNames.add(row.brandName()));
        Map<String, Long> ids = new LinkedHashMap<>();
        brandNames.stream().sorted().forEach(brandName -> {
            jdbcTemplate.update("""
                    INSERT INTO "brands" ("brand_name", "is_active")
                    VALUES (?, TRUE)
                    ON CONFLICT ("brand_name") DO UPDATE SET "is_active" = TRUE
                    """, brandName);
            ids.put(brandName, lookupId(
                    "SELECT \"brand_id\" FROM \"brands\" WHERE \"brand_name\" = ?",
                    brandName));
        });
        return ids;
    }

    private Map<AttributeKey, Long> ensureAttributeDefinitions(
            List<CatalogCsvRow> rows,
            Map<String, Long> typeIds) {
        Map<AttributeKey, String> dataTypes = new LinkedHashMap<>();
        for (CatalogCsvRow row : rows) {
            for (Map.Entry<String, JsonNode> specification : row.specifications().entrySet()) {
                AttributeKey key = new AttributeKey(row.productTypeCode(), specification.getKey());
                dataTypes.put(key, dataType(specification.getValue()));
            }
        }

        Map<AttributeKey, Long> ids = new LinkedHashMap<>();
        for (Map.Entry<AttributeKey, String> entry : dataTypes.entrySet()) {
            AttributeKey key = entry.getKey();
            Definition metadata = AttributeDefinitionRegistry.find(key.typeCode(), key.code())
                    .orElseThrow(() -> new IllegalStateException(
                            "Missing attribute definition metadata for " + key.typeCode() + ":" + key.code()));
            jdbcTemplate.update("""
                    INSERT INTO "product_attribute_definitions"
                      ("product_type_id", "attribute_code", "attribute_name", "data_type", "unit",
                       "is_filterable", "is_build_critical")
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT ("product_type_id", "attribute_code") DO UPDATE SET
                      "attribute_name" = EXCLUDED."attribute_name",
                      "data_type" = EXCLUDED."data_type",
                      "unit" = EXCLUDED."unit",
                      "is_filterable" = EXCLUDED."is_filterable",
                      "is_build_critical" = EXCLUDED."is_build_critical"
                    """,
                    typeIds.get(key.typeCode()),
                    key.code(),
                    metadata.labelVi(),
                    entry.getValue(),
                    metadata.unit(),
                    metadata.filterable(),
                    metadata.buildCritical());
            ids.put(key, lookupId(
                    "SELECT \"attribute_definition_id\" "
                            + "FROM \"product_attribute_definitions\" "
                            + "WHERE \"product_type_id\" = ? AND \"attribute_code\" = ?",
                    typeIds.get(key.typeCode()),
                    key.code()));
        }
        return ids;
    }

    private long upsertProduct(
            CatalogCsvRow row,
            Map<String, Long> typeIds,
            Map<String, Long> categoryIds,
            Map<String, Long> brandIds) {
        jdbcTemplate.update("""
                INSERT INTO "products"
                  ("product_type_id", "category_id", "brand_id", "model_code", "product_name",
                   "short_description", "description", "product_status")
                VALUES (?, ?, ?, ?, ?, ?, NULL, 'ACTIVE')
                ON CONFLICT ("model_code") DO UPDATE SET
                  "product_type_id" = EXCLUDED."product_type_id",
                  "category_id" = EXCLUDED."category_id",
                  "brand_id" = EXCLUDED."brand_id",
                  "product_name" = EXCLUDED."product_name",
                  "short_description" = EXCLUDED."short_description",
                  "description" = NULL,
                  "product_status" = 'ACTIVE',
                  "updated_at" = CURRENT_TIMESTAMP
                """,
                typeIds.get(row.productTypeCode()),
                categoryIds.get(row.categoryCode()),
                brandIds.get(row.brandName()),
                row.modelCode(),
                row.productName(),
                row.shortDescription());
        return lookupId("SELECT \"product_id\" FROM \"products\" WHERE \"model_code\" = ?", row.modelCode());
    }

    private void upsertOffer(CatalogCsvRow row, long productId) {
        jdbcTemplate.update("""
                INSERT INTO "product_offers"
                  ("product_id", "offer_code", "condition_code", "price", "currency_code",
                   "stock_quantity", "reserved_quantity", "warranty_months", "offer_status")
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'ACTIVE')
                ON CONFLICT ("offer_code") DO UPDATE SET
                  "product_id" = EXCLUDED."product_id",
                  "condition_code" = EXCLUDED."condition_code",
                  "price" = EXCLUDED."price",
                  "currency_code" = EXCLUDED."currency_code",
                  "stock_quantity" = EXCLUDED."stock_quantity",
                  "reserved_quantity" = 0,
                  "warranty_months" = EXCLUDED."warranty_months",
                  "offer_status" = 'ACTIVE',
                  "updated_at" = CURRENT_TIMESTAMP
                """,
                productId,
                offerCode(row.modelCode()),
                row.conditionCode(),
                row.demoPrice(),
                row.currencyCode(),
                BigDecimal.valueOf(row.demoStockQuantity()),
                BigDecimal.valueOf(row.warrantyMonths()));
    }

    private void upsertAttributeValue(long productId, Long definitionId, JsonNode value) {
        if (definitionId == null) {
            throw new IllegalStateException("Missing product attribute definition during catalog import.");
        }
        String type = dataType(value);
        String text = "TEXT".equals(type) ? value.textValue() : null;
        BigDecimal decimal = "DECIMAL".equals(type) ? value.decimalValue() : null;
        BigDecimal integer = "INTEGER".equals(type) ? value.decimalValue() : null;
        Boolean bool = "BOOLEAN".equals(type) ? value.booleanValue() : null;
        String json = "JSON".equals(type) ? value.toString() : null;
        jdbcTemplate.update("""
                INSERT INTO "product_attribute_values"
                  ("product_id", "attribute_definition_id", "value_text", "value_decimal",
                   "value_integer", "value_boolean", "value_json")
                VALUES (?, ?, ?, ?, ?, ?, CAST(? AS jsonb))
                ON CONFLICT ("product_id", "attribute_definition_id") DO UPDATE SET
                  "value_text" = EXCLUDED."value_text",
                  "value_decimal" = EXCLUDED."value_decimal",
                  "value_integer" = EXCLUDED."value_integer",
                  "value_boolean" = EXCLUDED."value_boolean",
                  "value_json" = EXCLUDED."value_json",
                  "updated_at" = CURRENT_TIMESTAMP
                """, productId, definitionId, text, decimal, integer, bool, json);
    }

    private long lookupId(String sql, Object... args) {
        BigDecimal id = jdbcTemplate.queryForObject(sql, BigDecimal.class, args);
        if (id == null) {
            throw new IllegalStateException("Catalog lookup returned no database identifier.");
        }
        return id.longValueExact();
    }

    private static CatalogCsvRow parseRow(
            CSVRecord record,
            int rowNumber,
            ObjectMapper objectMapper) {
        String modelCode = requiredText(record, "model_code", 100, rowNumber);
        String productName = requiredText(record, "product_name", 240, rowNumber);
        String brandName = requiredText(record, "brand_name", 120, rowNumber);
        String productType = requiredCode(record, "product_type_code", 60, rowNumber);
        String category = requiredCode(record, "category_code", 60, rowNumber);
        String shortDescription = optionalText(record, "short_description", 500, rowNumber);
        String conditionCode = requiredCode(record, "condition_code", 24, rowNumber);
        String currencyCode = requiredText(record, "currency_code", 3, rowNumber);
        if (currencyCode.length() != 3) {
            throw rowError(rowNumber, "currency_code must contain exactly 3 characters.");
        }
        BigDecimal price = parsePrice(record.get("demo_price_vnd"), rowNumber);
        long stock = parseUnsignedInteger(record.get("demo_stock_quantity"), 10, "demo_stock_quantity", rowNumber);
        long warranty = parseUnsignedInteger(record.get("warranty_months_demo"), 5, "warranty_months_demo", rowNumber);
        if (!"PARTIAL_REVIEW_REQUIRED".equals(record.get("data_verification_status"))) {
            throw rowError(rowNumber, "data_verification_status must remain PARTIAL_REVIEW_REQUIRED.");
        }
        String specificationsJson = record.get("specifications_json");
        JsonNode specifications;
        try {
            specifications = objectMapper.readTree(specificationsJson);
        } catch (JacksonException exception) {
            throw rowError(rowNumber, "specifications_json is invalid JSON.");
        }
        if (specifications == null || !specifications.isObject()) {
            throw rowError(rowNumber, "specifications_json must be a JSON object.");
        }
        Map<String, JsonNode> attributes = new LinkedHashMap<>();
        specifications.properties().forEach(entry -> {
            String key = entry.getKey();
            JsonNode value = entry.getValue();
            if (!key.matches("[a-z][a-z0-9_]{0,99}") || value == null || value.isNull()) {
                throw rowError(rowNumber, "specifications_json contains an invalid key or null value.");
            }
            validateSpecificationValue(value, rowNumber, key);
            attributes.put(key, value);
        });
        return new CatalogCsvRow(
                rowNumber, modelCode, productName, brandName, productType, category,
                shortDescription, conditionCode, currencyCode, price, stock, warranty, Map.copyOf(attributes));
    }

    private static String requiredCode(CSVRecord record, String column, int maxLength, int rowNumber) {
        String value = requiredText(record, column, maxLength, rowNumber);
        if (!value.matches("[A-Z][A-Z0-9_]*")) {
            throw rowError(rowNumber, column + " has an invalid code.");
        }
        return value;
    }

    private static String requiredText(CSVRecord record, String column, int maxLength, int rowNumber) {
        String value = record.get(column).trim();
        if (value.isEmpty() || value.length() > maxLength) {
            throw rowError(rowNumber, column + " must contain 1-" + maxLength + " characters.");
        }
        return value;
    }

    private static String optionalText(CSVRecord record, String column, int maxLength, int rowNumber) {
        String value = record.get(column).trim();
        if (value.length() > maxLength) {
            throw rowError(rowNumber, column + " exceeds " + maxLength + " characters.");
        }
        return value.isEmpty() ? null : value;
    }

    private static BigDecimal parsePrice(String value, int rowNumber) {
        try {
            BigDecimal price = new BigDecimal(value.trim()).setScale(2, RoundingMode.UNNECESSARY);
            if (price.signum() < 0 || price.precision() > 15) {
                throw rowError(rowNumber, "demo_price_vnd is outside DECIMAL(15,2) bounds.");
            }
            return price;
        } catch (NumberFormatException | ArithmeticException exception) {
            throw rowError(rowNumber, "demo_price_vnd must be a non-negative decimal with at most 2 places.");
        }
    }

    private static long parseUnsignedInteger(String value, int precision, String column, int rowNumber) {
        try {
            if (!value.trim().matches("[0-9]+")) {
                throw new NumberFormatException();
            }
            BigDecimal parsed = new BigDecimal(value.trim());
            if (parsed.precision() > precision) {
                throw new NumberFormatException();
            }
            return parsed.longValueExact();
        } catch (NumberFormatException | ArithmeticException exception) {
            throw rowError(rowNumber, column + " must be a non-negative " + precision + "-digit integer.");
        }
    }

    private static String dataType(JsonNode value) {
        if (value.isTextual()) return "TEXT";
        if (value.isBoolean()) return "BOOLEAN";
        if (value.isIntegralNumber()) return "INTEGER";
        if (value.isNumber()) return "DECIMAL";
        if (value.isArray() || value.isObject()) return "JSON";
        throw new IllegalArgumentException("Unsupported JSON value in catalog specification.");
    }

    private static String databaseNaturalKey(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }

    private static void validateSpecificationValue(JsonNode value, int rowNumber, String code) {
        String type = dataType(value);
        if ("INTEGER".equals(type) && value.decimalValue().precision() > 20) {
            throw rowError(rowNumber, "integer specification " + code + " exceeds NUMERIC(20,0).");
        }
        if ("DECIMAL".equals(type)) {
            try {
                if (value.decimalValue().setScale(6, RoundingMode.UNNECESSARY).precision() > 20) {
                    throw rowError(rowNumber, "decimal specification " + code + " exceeds NUMERIC(20,6).");
                }
            } catch (ArithmeticException exception) {
                throw rowError(rowNumber, "decimal specification " + code + " exceeds NUMERIC(20,6).");
            }
        }
    }

    private static IllegalArgumentException rowError(int rowNumber, String message) {
        return new IllegalArgumentException("CSV row " + rowNumber + ": " + message);
    }

    public record ImportSummary(
            int products,
            int productTypes,
            int categories,
            int brands,
            int offers,
            int attributeDefinitions,
            int attributeValues) {
    }

    private record AttributeKey(String typeCode, String code) {
    }

}
