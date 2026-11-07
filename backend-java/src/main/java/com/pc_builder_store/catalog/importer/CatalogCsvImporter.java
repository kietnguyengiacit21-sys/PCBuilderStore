package com.pc_builder_store.catalog.importer;

import com.pc_builder_store.catalog.AttributeDefinitionRegistry;
import com.pc_builder_store.catalog.AttributeDefinitionRegistry.Definition;
import java.io.IOException;
import java.io.StringReader;
import java.net.URI;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
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

    private static final List<String> BASE_HEADERS = List.of(
            "model_code",
            "product_type_code",
            "product_name",
            "brand_name",
            "category_code",
            "price_vnd",
            "currency_code",
            "price_source_name",
            "price_source_url",
            "price_checked_at",
            "price_is_estimate",
            "warranty_months",
            "manufacturer_spec_url",
            "image_url_1",
            "image_url_2",
            "image_url_3",
            "image_url_4",
            "image_url_5",
            "image_alt_1",
            "image_alt_2",
            "image_alt_3",
            "image_alt_4",
            "image_alt_5",
            "data_note");
    private static final List<String> EVIDENCE_HEADERS = List.of(
            "model_code",
            "product_type",
            "attribute_code",
            "data_type",
            "unit",
            "value_json",
            "source_url",
            "source_locator",
            "verification_status",
            "review_note",
            "review_date",
            "specification_scope");
    private static final Set<String> ATTRIBUTE_HEADERS = expectedAttributeHeaders();
    private static final int EXPECTED_COLUMN_COUNT = BASE_HEADERS.size() + ATTRIBUTE_HEADERS.size();
    private static final Set<String> VERIFICATION_STATUSES =
            Set.of("VERIFIED_EXACT_MODEL", "VERIFIED_EXACT_VARIANT", "NEEDS_REVIEW", "UNKNOWN");
    private static final long MAX_OFFER_STOCK = 4_294_967_295L;
    static final String OFFER_UPSERT_SQL = """
            INSERT INTO "product_offers"
              ("product_id", "offer_code", "condition_code", "price", "currency_code",
               "stock_quantity", "reserved_quantity", "warranty_months", "offer_status")
            VALUES (?, ?, 'NEW', ?, ?, ?, 0, ?, 'ACTIVE')
            ON CONFLICT ("offer_code") DO UPDATE SET
              "product_id" = EXCLUDED."product_id",
              "price" = EXCLUDED."price",
              "currency_code" = EXCLUDED."currency_code",
              "warranty_months" = EXCLUDED."warranty_months",
              "updated_at" = CURRENT_TIMESTAMP
            WHERE "product_offers"."offer_code" LIKE 'DEMO-%'
            """;
    static final String PRODUCT_UPSERT_SQL = """
            INSERT INTO "products"
              ("product_type_id", "category_id", "brand_id", "model_code", "product_name",
               "product_status")
            VALUES (?, ?, ?, ?, ?, 'ACTIVE')
            ON CONFLICT ("model_code") DO UPDATE SET
              "product_type_id" = EXCLUDED."product_type_id",
              "category_id" = EXCLUDED."category_id",
              "brand_id" = EXCLUDED."brand_id",
              "product_name" = EXCLUDED."product_name",
              "updated_at" = CURRENT_TIMESTAMP
            """;
    static final String ATTRIBUTE_DEFINITION_UPSERT_SQL = """
            INSERT INTO "product_attribute_definitions"
              ("product_type_id", "attribute_code", "attribute_name", "data_type", "unit",
               "is_filterable", "is_build_critical", "validation_json")
            VALUES (?, ?, ?, ?, ?, ?, ?,
              jsonb_strip_nulls(jsonb_build_object(
                'englishLabel', NULLIF(?, ''),
                'subtype', NULLIF(?, ''),
                'inputMode', NULLIF(?, ''),
                'options', CASE WHEN NULLIF(?, '') IS NULL THEN NULL
                                ELSE to_jsonb(string_to_array(?, '|')) END,
                'specificationScope', NULLIF(?, '')
              )))
            ON CONFLICT ("product_type_id", "attribute_code") DO UPDATE SET
              "attribute_name" = EXCLUDED."attribute_name",
              "unit" = EXCLUDED."unit",
              "is_filterable" = EXCLUDED."is_filterable",
              "is_build_critical" = EXCLUDED."is_build_critical",
              "validation_json" = COALESCE(product_attribute_definitions."validation_json", '{}'::jsonb)
                  || EXCLUDED."validation_json"
            """;
    static final String VERIFICATION_METADATA_UPSERT_SQL = """
            UPDATE "product_attribute_definitions"
               SET "validation_json" = jsonb_set(
                   COALESCE("validation_json", '{}'::jsonb),
                   '{verificationByModel}',
                   COALESCE("validation_json" -> 'verificationByModel', '{}'::jsonb)
                       || jsonb_build_object(CAST(? AS text), jsonb_strip_nulls(jsonb_build_object(
                           'verificationStatus', CAST(? AS text),
                           'sourceUrl', CAST(? AS text),
                           'sourceLocator', CAST(? AS text),
                           'verificationScope', CAST(? AS text)
                       ))),
                   TRUE
               )
             WHERE "attribute_definition_id" = ?
            """;
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

    static String normalizeOptionValue(Definition definition, String value) {
        if ("GPU".equals(definition.productType())
                && "pcie_generation".equals(definition.code())
                && "4.0".equals(value)
                && definition.options().contains("PCIe 4.0")) {
            return "PCIe 4.0";
        }
        return value;
    }

    public List<CatalogCsvRow> readAndValidate(Path csvPath, Path evidencePath) {
        try {
            String csv = Files.readString(csvPath, StandardCharsets.UTF_8);
            String evidenceCsv = Files.readString(evidencePath, StandardCharsets.UTF_8);
            List<CatalogCsvRow> rows = parseRecords(csv, evidenceCsv, objectMapper);
            validateDataset(rows);
            return rows;
        } catch (IOException exception) {
            throw new IllegalArgumentException(
                    "Could not read catalog CSV or evidence file " + csvPath + " / " + evidencePath + ".", exception);
        }
    }

    public void validateExistingAttributeDefinitionTypes() {
        Map<AttributeKey, String> existingTypes = new HashMap<>();
        jdbcTemplate.queryForList("""
                        SELECT product_types."type_code" AS product_type_code,
                               definitions."attribute_code",
                               definitions."data_type"
                          FROM "product_attribute_definitions" definitions
                          JOIN "product_types"
                            ON product_types."product_type_id" = definitions."product_type_id"
                        """)
                .forEach(row -> existingTypes.put(
                        new AttributeKey(
                                (String) row.get("product_type_code"),
                                (String) row.get("attribute_code")),
                        (String) row.get("data_type")));
        for (Definition definition : AttributeDefinitionRegistry.all()) {
            AttributeKey key = new AttributeKey(definition.productType(), definition.code());
            String databaseType = existingTypes.get(key);
            if (databaseType != null) {
                validatePersistedDataType(key.typeCode(), key.code(), databaseType, definition.dataType());
            }
        }
    }

    static void validatePersistedDataType(
            String productType, String attributeCode, String databaseType, String registryType) {
        if (!registryType.equalsIgnoreCase(databaseType)) {
            throw new IllegalStateException(
                    "Attribute data type mismatch for product type " + productType
                            + ", attribute " + attributeCode + ": database type " + databaseType
                            + ", registry type " + registryType + ".");
        }
    }

    static List<CatalogCsvRow> parseRecords(String csv, ObjectMapper objectMapper) {
        return parseRecords(csv, null, objectMapper);
    }

    static List<CatalogCsvRow> parseRecords(String csv, String evidenceCsv, ObjectMapper objectMapper) {
        String content = csv.startsWith("\uFEFF") ? csv.substring(1) : csv;
        List<CatalogCsvRow> rows;
        try (CSVParser parser = CSVParser.parse(
                new StringReader(content),
                CSVFormat.DEFAULT.builder()
                        .setHeader()
                        .setSkipHeaderRecord(true)
                        .setIgnoreEmptyLines(false)
                        .build())) {
            List<String> headers = parser.getHeaderNames();
            if (headers.size() != EXPECTED_COLUMN_COUNT
                    || !headers.subList(0, BASE_HEADERS.size()).equals(BASE_HEADERS)
                    || !new HashSet<>(headers.subList(BASE_HEADERS.size(), headers.size()))
                            .equals(ATTRIBUTE_HEADERS)
                    || new HashSet<>(headers).size() != headers.size()) {
                throw new IllegalArgumentException(
                        "CSV header must contain the 24 canonical base columns followed by all "
                                + AttributeDefinitionRegistry.all().size() + " registry-defined attribute columns.");
            }
            rows = new ArrayList<>();
            for (CSVRecord record : parser) {
                int rowNumber = Math.toIntExact(record.getRecordNumber() + 1);
                if (!record.isConsistent() || record.size() != EXPECTED_COLUMN_COUNT) {
                    throw rowError(rowNumber, "expected " + EXPECTED_COLUMN_COUNT + " columns.");
                }
                rows.add(parseRow(record, rowNumber, objectMapper));
            }
        } catch (IOException exception) {
            throw new IllegalArgumentException(
                    "Could not parse catalog CSV: " + exception.getMessage(), exception);
        }
        if (evidenceCsv != null) {
            rows = attachVerificationEvidence(rows, evidenceCsv, objectMapper);
        }
        return List.copyOf(rows);
    }

    private static Set<String> expectedAttributeHeaders() {
        return AttributeDefinitionRegistry.all().stream()
                .map(definition -> definition.productType().toLowerCase(Locale.ROOT) + "__" + definition.code())
                .collect(Collectors.toUnmodifiableSet());
    }

    private static List<CatalogCsvRow> attachVerificationEvidence(
            List<CatalogCsvRow> rows,
            String evidenceCsv,
            ObjectMapper objectMapper) {
        Map<String, CatalogCsvRow> productsByModel = new HashMap<>();
        for (CatalogCsvRow row : rows) {
            if (productsByModel.putIfAbsent(row.modelCode(), row) != null) {
                throw rowError(row.csvRowNumber(), "duplicate model_code " + row.modelCode() + ".");
            }
        }
        Map<String, CatalogCsvEvidence> matchedEvidence = new HashMap<>();
        Map<String, Set<String>> evidenceKeysByModel = new HashMap<>();
        String content = evidenceCsv.startsWith("\uFEFF") ? evidenceCsv.substring(1) : evidenceCsv;
        try (CSVParser parser = CSVParser.parse(
                new StringReader(content),
                CSVFormat.DEFAULT.builder()
                        .setHeader()
                        .setSkipHeaderRecord(true)
                        .setIgnoreEmptyLines(false)
                        .build())) {
            if (!EVIDENCE_HEADERS.equals(parser.getHeaderNames())) {
                throw new IllegalArgumentException("Catalog attribute evidence CSV has an invalid header.");
            }
            for (CSVRecord record : parser) {
                int rowNumber = Math.toIntExact(record.getRecordNumber() + 1);
                if (!record.isConsistent() || record.size() != EVIDENCE_HEADERS.size()) {
                    throw rowError(rowNumber, "malformed evidence CSV row.");
                }
                String modelCode = record.get("model_code").trim();
                String productType = record.get("product_type").trim();
                String attributeCode = record.get("attribute_code").trim();
                String status = record.get("verification_status").trim();
                CatalogCsvRow product = productsByModel.get(modelCode);
                if (product == null || !product.productTypeCode().equals(productType)) {
                    throw rowError(rowNumber, "evidence references a missing model or mismatched product type.");
                }
                Definition definition = AttributeDefinitionRegistry.find(productType, attributeCode)
                        .orElseThrow(() -> rowError(
                                rowNumber, "evidence references an unknown attribute " + productType + ":" + attributeCode));
                if (!VERIFICATION_STATUSES.contains(status)) {
                    throw rowError(rowNumber, "unsupported verification status " + status + ".");
                }
                String key = evidenceKey(modelCode, attributeCode);
                if (!evidenceKeysByModel.computeIfAbsent(modelCode, ignored -> new HashSet<>()).add(attributeCode)) {
                    throw rowError(rowNumber, "duplicate evidence for " + modelCode + "/" + attributeCode + ".");
                }
                if (!record.get("data_type").trim().equals(definition.dataType())) {
                    throw rowError(rowNumber, "evidence data type does not match the attribute definition.");
                }
                String evidenceUnit = record.get("unit").trim();
                if (!java.util.Objects.equals(
                        definition.unit(), evidenceUnit.isEmpty() ? null : evidenceUnit)) {
                    throw rowError(rowNumber, "evidence unit does not match the attribute definition.");
                }
                String evidenceSpecificationScope = record.get("specification_scope").trim();
                if (!java.util.Objects.equals(
                        definition.specificationScope(),
                        evidenceSpecificationScope.isEmpty() ? null : evidenceSpecificationScope)) {
                    throw rowError(rowNumber, "evidence specification scope does not match the attribute definition.");
                }
                if (!status.startsWith("VERIFIED_")) {
                    continue;
                }
                String sourceUrl = record.get("source_url").trim();
                String sourceLocator = record.get("source_locator").trim();
                if (!isHttpUrl(sourceUrl) || sourceLocator.isBlank()) {
                    throw rowError(rowNumber, "verified evidence requires a valid source URL and locator.");
                }
                JsonNode evidenceValue;
                try {
                    evidenceValue = objectMapper.readTree(record.get("value_json"));
                } catch (JacksonException exception) {
                    throw rowError(rowNumber, "verified evidence value_json is invalid JSON.");
                }
                if ("DECIMAL".equals(definition.dataType()) && evidenceValue != null && evidenceValue.isNumber()) {
                    evidenceValue = objectMapper.getNodeFactory().numberNode(evidenceValue.decimalValue());
                }
                if (evidenceValue == null || !definition.dataType().equals(dataType(evidenceValue))) {
                    throw rowError(rowNumber, "verified evidence value does not match its declared data type.");
                }
                validateDefinitionValue(evidenceValue, definition, rowNumber);
                JsonNode catalogValue = product.specifications().get(attributeCode);
                if (catalogValue == null || !catalogValue.equals(evidenceValue)) {
                    continue;
                }
                matchedEvidence.put(key, new CatalogCsvEvidence(
                        status,
                        sourceUrl,
                        sourceLocator,
                        status.substring("VERIFIED_".length())));
            }
        } catch (IOException exception) {
            throw new IllegalArgumentException(
                    "Could not parse catalog attribute evidence CSV: " + exception.getMessage(), exception);
        }

        List<CatalogCsvRow> enrichedRows = new ArrayList<>(rows.size());
        for (CatalogCsvRow row : rows) {
            Map<String, CatalogCsvEvidence> metadata = new LinkedHashMap<>();
            for (Definition definition : AttributeDefinitionRegistry.all()) {
                if (!definition.productType().equals(row.productTypeCode())) {
                    continue;
                }
                String code = definition.code();
                JsonNode value = row.specifications().get(code);
                CatalogCsvEvidence evidence = value == null
                        ? null
                        : matchedEvidence.get(evidenceKey(row.modelCode(), code));
                metadata.put(
                        code,
                        evidence != null
                                ? evidence
                                : new CatalogCsvEvidence(
                                        value == null ? "UNKNOWN" : "NEEDS_REVIEW",
                                        null,
                                        null,
                                        null));
            }
            enrichedRows.add(new CatalogCsvRow(
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
                    row.specifications(),
                    Map.copyOf(metadata)));
        }
        return enrichedRows;
    }

    private static String evidenceKey(String modelCode, String attributeCode) {
        return modelCode + "\u0000" + attributeCode;
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
        Map<String, String> productTypesByModel = new HashMap<>();
        for (CatalogCsvRow row : rows) {
            if (!modelCodes.add(row.modelCode())
                    || !normalizedModelCodes.add(databaseNaturalKey(row.modelCode()))) {
                throw rowError(
                        row.csvRowNumber(),
                        "duplicate model_code " + row.modelCode() + " under the database collation.");
            }
            productTypes.add(row.productTypeCode());
            productTypesByModel.put(row.modelCode(), row.productTypeCode());
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
                Definition definition = AttributeDefinitionRegistry.find(
                                row.productTypeCode(), specification.getKey())
                        .orElseThrow(() -> rowError(row.csvRowNumber(), "unsupported specification " + key + "."));
                validateDefinitionValue(specification.getValue(), definition, row.csvRowNumber());
            }
        }
        for (CatalogCsvRow row : rows) {
            validateConfigurationItems(row, productTypesByModel);
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

    static void validateConfigurationItems(CatalogCsvRow row, Map<String, String> productTypesByModel) {
        JsonNode items = row.specifications().get("configuration_items");
        if (items == null) {
            return;
        }
        if (!"PC".equals(row.productTypeCode()) || !items.isArray()) {
            throw rowError(
                    row.csvRowNumber(),
                    "PC:configuration_items must be a JSON array on a PC product.");
        }
        for (int index = 0; index < items.size(); index++) {
            JsonNode item = items.get(index);
            if (!item.isObject()
                    || item.size() != 3
                    || !item.has("component_type")
                    || !item.get("component_type").isTextual()
                    || item.get("component_type").textValue().isBlank()
                    || !item.has("model_code")
                    || !item.get("model_code").isTextual()
                    || item.get("model_code").textValue().isBlank()
                    || !item.has("product_name")
                    || !item.get("product_name").isTextual()
                    || item.get("product_name").textValue().isBlank()) {
                throw rowError(
                        row.csvRowNumber(),
                        "PC:configuration_items entry " + index
                                + " must contain exactly non-empty component_type, model_code, and "
                                + "product_name strings.");
            }
            String modelCode = item.get("model_code").textValue();
            String componentType = item.get("component_type").textValue();
            String referencedType = productTypesByModel.get(modelCode);
            if (referencedType == null) {
                throw rowError(
                        row.csvRowNumber(),
                        "PC:configuration_items entry " + index + " references missing model_code "
                                + modelCode + ".");
            }
            if (!componentType.equals(referencedType)) {
                throw rowError(
                        row.csvRowNumber(),
                        "PC:configuration_items entry " + index + " has component_type "
                                + componentType + " for model_code " + modelCode
                                + ", whose product_type_code is " + referencedType + ".");
            }
        }
    }

    static String offerCode(String modelCode) {
        return "DEMO-" + modelCode;
    }

    public static void validateDefaultOfferStock(long stock) {
        if (stock < 0 || stock > MAX_OFFER_STOCK) {
            throw new IllegalArgumentException(
                    "catalog.import.default-stock must be between 0 and " + MAX_OFFER_STOCK + ".");
        }
    }

    public ImportSummary apply(List<CatalogCsvRow> rows, long defaultStock) {
        validateDefaultOfferStock(defaultStock);
        validateDataset(rows);
        return transactionTemplate.execute(status -> applyInTransaction(rows, defaultStock));
    }

    private ImportSummary applyInTransaction(List<CatalogCsvRow> rows, long defaultStock) {
        Map<String, Long> typeIds = ensureProductTypes();
        Map<String, Long> categoryIds = ensureCategories();
        Map<String, Long> brandIds = ensureBrands(rows);
        Map<AttributeKey, Long> definitionIds = ensureAttributeDefinitions(typeIds);

        int attributeValueCount = 0;
        for (CatalogCsvRow row : rows) {
            long productId = upsertProduct(row, typeIds, categoryIds, brandIds);
            upsertOffer(row, productId, defaultStock);
            synchronizeImages(row, productId);
            for (Map.Entry<String, JsonNode> specification : row.specifications().entrySet()) {
                AttributeKey key = new AttributeKey(row.productTypeCode(), specification.getKey());
                upsertAttributeValue(
                        productId,
                        definitionIds.get(key),
                        specification.getValue());
                attributeValueCount++;
            }
            row.verificationMetadata().forEach((attributeCode, evidence) ->
                    upsertVerificationMetadata(
                            definitionIds.get(new AttributeKey(row.productTypeCode(), attributeCode)),
                            row.modelCode(),
                            evidence));
        }
        return new ImportSummary(rows.size(), typeIds.size(), categoryIds.size(), brandIds.size(),
                rows.size(), definitionIds.size(), attributeValueCount);
    }

    Map<String, Long> ensureProductTypes() {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (Map.Entry<String, String> type : PRODUCT_TYPE_NAMES.entrySet()) {
            jdbcTemplate.update("""
                    INSERT INTO "product_types"
                      ("type_code", "type_name", "description", "is_build_component", "is_active")
                    VALUES (?, ?, 'Demo catalog product type', ?, TRUE)
                    ON CONFLICT ("type_code") DO UPDATE SET
                      "type_name" = EXCLUDED."type_name",
                      "description" = EXCLUDED."description",
                      "is_build_component" = EXCLUDED."is_build_component"
                    """, type.getKey(), type.getValue(),
                    !Set.of("PC", "ACCESSORY").contains(type.getKey()));
            ids.put(type.getKey(), lookupId(
                    "SELECT \"product_type_id\" FROM \"product_types\" WHERE \"type_code\" = ?",
                    type.getKey()));
        }
        return ids;
    }

    Map<String, Long> ensureCategories() {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (Map.Entry<String, String> category : CATEGORY_NAMES.entrySet()) {
            jdbcTemplate.update("""
                    INSERT INTO "categories" ("category_code", "category_name", "description", "is_active")
                    VALUES (?, ?, 'Danh mục demo catalog PC Builder Store', TRUE)
                    ON CONFLICT ("category_code") DO NOTHING
                    """, category.getKey(), category.getValue());
            ids.put(category.getKey(), lookupId(
                    "SELECT \"category_id\" FROM \"categories\" WHERE \"category_code\" = ?",
                    category.getKey()));
        }
        return ids;
    }

    Map<String, Long> ensureBrands(List<CatalogCsvRow> rows) {
        Set<String> brandNames = new HashSet<>();
        rows.forEach(row -> brandNames.add(row.brandName()));
        Map<String, Long> ids = new LinkedHashMap<>();
        brandNames.stream().sorted().forEach(brandName -> {
            jdbcTemplate.update("""
                    INSERT INTO "brands" ("brand_name", "is_active")
                    VALUES (?, TRUE)
                    ON CONFLICT ("brand_name") DO NOTHING
                    """, brandName);
            ids.put(brandName, lookupId(
                    "SELECT \"brand_id\" FROM \"brands\" WHERE \"brand_name\" = ?",
                    brandName));
        });
        return ids;
    }

    private Map<AttributeKey, Long> ensureAttributeDefinitions(Map<String, Long> typeIds) {
        validateExistingAttributeDefinitionTypes();
        Map<AttributeKey, Long> ids = new LinkedHashMap<>();
        for (Definition metadata : AttributeDefinitionRegistry.all()) {
            AttributeKey key = new AttributeKey(metadata.productType(), metadata.code());
            String options = String.join("|", metadata.options());
            jdbcTemplate.update(
                    ATTRIBUTE_DEFINITION_UPSERT_SQL,
                    typeIds.get(key.typeCode()),
                    key.code(),
                    metadata.labelVi(),
                    metadata.dataType(),
                    metadata.unit(),
                    metadata.filterable(),
                    metadata.buildCritical(),
                    metadata.labelEn(),
                    metadata.subtype(),
                    metadata.inputMode(),
                    options,
                    options,
                    metadata.specificationScope());
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
        jdbcTemplate.update(
                PRODUCT_UPSERT_SQL,
                typeIds.get(row.productTypeCode()),
                categoryIds.get(row.categoryCode()),
                brandIds.get(row.brandName()),
                row.modelCode(),
                row.productName());
        return lookupId("SELECT \"product_id\" FROM \"products\" WHERE \"model_code\" = ?", row.modelCode());
    }

    void upsertOffer(CatalogCsvRow row, long productId, long defaultStock) {
        jdbcTemplate.update(
                OFFER_UPSERT_SQL,
                productId,
                offerCode(row.modelCode()),
                row.price(),
                row.currencyCode(),
                BigDecimal.valueOf(defaultStock),
                BigDecimal.valueOf(row.warrantyMonths()));
    }

    void synchronizeImages(CatalogCsvRow row, long productId) {
        Map<String, ExistingProductImage> existingByUrl = new LinkedHashMap<>();
        List<ExistingProductImage> existingImages = jdbcTemplate.queryForList("""
                        SELECT "image_id", "image_url", "is_primary"
                          FROM "product_images"
                         WHERE "product_id" = ?
                         ORDER BY "is_primary" DESC, "sort_order", "image_id"
                        """,
                        productId).stream()
                .map(image -> new ExistingProductImage(
                        ((Number) image.get("image_id")).longValue(),
                        (String) image.get("image_url"),
                        (Boolean) image.get("is_primary")))
                .toList();
        existingImages.forEach(image -> existingByUrl.putIfAbsent(image.url(), image));
        boolean hasPrimary = existingImages.stream().anyMatch(ExistingProductImage::primary);
        for (int imageIndex = 0; imageIndex < row.images().size(); imageIndex++) {
            CatalogCsvImage image = row.images().get(imageIndex);
            ExistingProductImage existing = existingByUrl.get(image.url());
            if (existing != null) {
                boolean promoteToPrimary = !hasPrimary && imageIndex == 0;
                jdbcTemplate.update("""
                        UPDATE "product_images"
                           SET "alt_text" = COALESCE(?, "alt_text"),
                               "sort_order" = ?,
                               "is_primary" = CASE WHEN ? THEN TRUE ELSE "is_primary" END
                         WHERE "image_id" = ?
                        """,
                        image.altText(),
                        image.sortOrder(),
                        promoteToPrimary,
                        existing.id());
                hasPrimary |= promoteToPrimary;
                continue;
            }
            boolean primary = !hasPrimary && imageIndex == 0;
            jdbcTemplate.update("""
                    INSERT INTO "product_images"
                      ("product_id", "image_url", "alt_text", "is_primary", "sort_order")
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    productId,
                    image.url(),
                    image.altText(),
                    primary,
                    image.sortOrder());
            hasPrimary |= primary;
        }
    }

    void upsertVerificationMetadata(
            Long definitionId,
            String modelCode,
            CatalogCsvEvidence evidence) {
        if (definitionId == null) {
            throw new IllegalStateException("Missing product attribute definition for catalog verification metadata.");
        }
        jdbcTemplate.update(
                VERIFICATION_METADATA_UPSERT_SQL,
                modelCode,
                evidence.verificationStatus(),
                evidence.sourceUrl(),
                evidence.sourceLocator(),
                evidence.verificationScope(),
                definitionId);
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
        String productType = requiredCode(record, "product_type_code", 60, rowNumber);
        String productName = requiredText(record, "product_name", 240, rowNumber);
        String brandName = requiredText(record, "brand_name", 120, rowNumber);
        String category = requiredCode(record, "category_code", 60, rowNumber);
        String currencyCode = requiredText(record, "currency_code", 3, rowNumber);
        if (currencyCode.length() != 3) {
            throw rowError(rowNumber, "currency_code must contain exactly 3 characters.");
        }
        BigDecimal price = parsePrice(record.get("price_vnd"), rowNumber);
        String priceSourceName = requiredText(record, "price_source_name", 160, rowNumber);
        String priceSourceUrl = requiredHttpUrl(record, "price_source_url", rowNumber);
        LocalDate priceCheckedAt;
        try {
            priceCheckedAt = LocalDate.parse(requiredText(record, "price_checked_at", 10, rowNumber));
        } catch (DateTimeParseException exception) {
            throw rowError(rowNumber, "price_checked_at must be an ISO-8601 date.");
        }
        boolean priceIsEstimate = parseBoolean(record.get("price_is_estimate"), "price_is_estimate", rowNumber);
        int warrantyMonths = Math.toIntExact(
                parseUnsignedInteger(record.get("warranty_months"), 5, "warranty_months", rowNumber));
        String manufacturerSpecUrl = requiredHttpUrl(record, "manufacturer_spec_url", rowNumber);
        List<CatalogCsvImage> images = parseImages(record, rowNumber);
        String dataNote = optionalText(record, "data_note", 2000, rowNumber);

        Map<String, JsonNode> attributes = new LinkedHashMap<>();
        for (Definition definition : AttributeDefinitionRegistry.all()) {
            String column = definition.productType().toLowerCase(Locale.ROOT) + "__" + definition.code();
            String rawValue = record.get(column);
            if (rawValue == null || rawValue.isBlank()) {
                continue;
            }
            if (!definition.productType().equals(productType)) {
                throw rowError(rowNumber, "column " + column + " is not valid for product type " + productType + ".");
            }
            JsonNode value = parseAttributeValue(rawValue, definition, rowNumber, objectMapper);
            validateDefinitionValue(value, definition, rowNumber);
            attributes.put(definition.code(), value);
        }
        return new CatalogCsvRow(
                rowNumber,
                modelCode,
                productName,
                brandName,
                productType,
                category,
                price,
                currencyCode,
                priceSourceName,
                priceSourceUrl,
                priceCheckedAt,
                priceIsEstimate,
                warrantyMonths,
                manufacturerSpecUrl,
                List.copyOf(images),
                dataNote,
                Map.copyOf(attributes),
                Map.of());
    }

    private static JsonNode parseAttributeValue(
            String rawValue,
            Definition definition,
            int rowNumber,
            ObjectMapper objectMapper) {
        String csvValue = rawValue.trim();
        String value = csvValue;
        if ("TEXT".equals(definition.dataType())) {
            value = normalizeOptionValue(definition, value);
            return objectMapper.getNodeFactory().textNode(value);
        }
        if ("DECIMAL".equals(definition.dataType())) {
            try {
                return objectMapper.getNodeFactory().numberNode(new BigDecimal(value));
            } catch (NumberFormatException exception) {
                throw rowError(
                        rowNumber,
                        definition.productType() + ":" + definition.code() + " is not valid DECIMAL data.");
            }
        }
        try {
            return objectMapper.readTree(value);
        } catch (JacksonException exception) {
            throw rowError(
                    rowNumber,
                    definition.productType() + ":" + definition.code() + " is not valid "
                            + definition.dataType() + " data.");
        }
    }

    private static List<CatalogCsvImage> parseImages(CSVRecord record, int rowNumber) {
        List<CatalogCsvImage> images = new ArrayList<>();
        Set<String> seenUrls = new HashSet<>();
        for (int index = 1; index <= 5; index++) {
            String url = record.get("image_url_" + index).trim();
            String altText = record.get("image_alt_" + index).trim();
            if (url.isEmpty()) {
                if (!altText.isEmpty()) {
                    throw rowError(rowNumber, "image_alt_" + index + " requires image_url_" + index + ".");
                }
                continue;
            }
            if (!isHttpUrl(url)) {
                throw rowError(rowNumber, "image_url_" + index + " must be an absolute HTTP(S) URL.");
            }
            if (url.length() > 1000 || altText.length() > 300) {
                throw rowError(rowNumber, "image URL or alt text exceeds the database column length.");
            }
            if (seenUrls.add(url)) {
                images.add(new CatalogCsvImage(url, altText.isEmpty() ? null : altText, index - 1));
            }
        }
        if (images.isEmpty()) {
            throw rowError(rowNumber, "at least one product image URL is required.");
        }
        return images;
    }

    private static String requiredHttpUrl(CSVRecord record, String column, int rowNumber) {
        String url = requiredText(record, column, 1000, rowNumber);
        if (!isHttpUrl(url)) {
            throw rowError(rowNumber, column + " must be an absolute HTTP(S) URL.");
        }
        return url;
    }

    private static boolean isHttpUrl(String value) {
        try {
            URI uri = URI.create(value);
            return uri.isAbsolute()
                    && ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null
                    && !uri.getHost().isBlank();
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static boolean parseBoolean(String value, String column, int rowNumber) {
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "true" -> true;
            case "false" -> false;
            default -> throw rowError(rowNumber, column + " must be true or false.");
        };
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
                    throw rowError(rowNumber, "price_vnd is outside DECIMAL(15,2) bounds.");
            }
            return price;
        } catch (NumberFormatException | ArithmeticException exception) {
                throw rowError(rowNumber, "price_vnd must be a non-negative decimal with at most 2 places.");
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

    static void validateDefinitionValue(JsonNode value, Definition definition, int rowNumber) {
        String key = definition.productType() + ":" + definition.code();
        if (value == null || value.isNull() || !definition.dataType().equals(dataType(value))) {
            throw rowError(rowNumber, "specification " + key + " must use " + definition.dataType() + " values.");
        }
        validateSpecificationValue(value, rowNumber, key);
        if (!definition.options().isEmpty()
                && (!value.isTextual() || !definition.options().contains(value.textValue()))) {
            throw rowError(rowNumber, "specification " + key + " must use one of its defined options.");
        }
        if ("JSON_ARRAY".equals(definition.inputMode()) && !value.isArray()) {
            throw rowError(rowNumber, "specification " + key + " must be a JSON array.");
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

    private record ExistingProductImage(long id, String url, boolean primary) {
    }

}
