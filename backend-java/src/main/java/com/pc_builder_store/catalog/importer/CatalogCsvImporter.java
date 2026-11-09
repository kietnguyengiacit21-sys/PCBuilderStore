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
    private static final Set<String> OPTIONAL_PRODUCT_HEADERS = Set.of(
            "short_description",
            "description",
            "content_sections_json",
            "tags_json",
            "seo_title",
            "seo_description",
            "slug",
            "is_featured",
            "display_order",
            "compare_at_price_vnd",
            "stock_quantity",
            "bom_summary",
            "pc__upgrade_groups_json");
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
    private static final Set<String> VERIFICATION_STATUSES =
            Set.of("VERIFIED_EXACT_MODEL", "VERIFIED_EXACT_VARIANT", "NEEDS_REVIEW", "UNKNOWN");
    private static final long MAX_OFFER_STOCK = 4_294_967_295L;
    static final String OFFER_UPSERT_SQL = """
            INSERT INTO "product_offers"
              ("product_id", "offer_code", "condition_code", "price", "compare_at_price",
               "currency_code", "stock_quantity", "reserved_quantity", "warranty_months", "offer_status")
            VALUES (?, ?, 'NEW', ?, ?, ?, ?, 0, ?, 'ACTIVE')
            ON CONFLICT ("offer_code") DO UPDATE SET
              "product_id" = EXCLUDED."product_id",
              "price" = EXCLUDED."price",
              "compare_at_price" = EXCLUDED."compare_at_price",
              "currency_code" = EXCLUDED."currency_code",
              "stock_quantity" = CASE
                WHEN "product_offers"."reserved_quantity" = 0 THEN EXCLUDED."stock_quantity"
                ELSE "product_offers"."stock_quantity"
              END,
              "warranty_months" = EXCLUDED."warranty_months",
              "offer_status" = 'ACTIVE',
              "updated_at" = CURRENT_TIMESTAMP
            WHERE "product_offers"."offer_code" LIKE 'DEMO-%'
            """;
    static final String PRODUCT_UPSERT_SQL = """
            INSERT INTO "products"
              ("product_type_id", "category_id", "brand_id", "model_code", "product_name",
               "short_description", "description", "sku", "slug", "tags", "seo_title",
               "seo_description", "is_featured", "display_order", "bom_summary",
               "content_sections", "product_status")
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?, ?, ?, ?, CAST(? AS jsonb), 'ACTIVE')
            ON CONFLICT ("model_code") DO UPDATE SET
              "product_type_id" = EXCLUDED."product_type_id",
              "category_id" = EXCLUDED."category_id",
              "brand_id" = EXCLUDED."brand_id",
              "product_name" = EXCLUDED."product_name",
              "short_description" = EXCLUDED."short_description",
              "description" = EXCLUDED."description",
              "sku" = EXCLUDED."sku",
              "slug" = EXCLUDED."slug",
              "tags" = EXCLUDED."tags",
              "seo_title" = EXCLUDED."seo_title",
              "seo_description" = EXCLUDED."seo_description",
              "is_featured" = EXCLUDED."is_featured",
              "display_order" = EXCLUDED."display_order",
              "bom_summary" = EXCLUDED."bom_summary",
              "content_sections" = EXCLUDED."content_sections",
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
                           'verificationScope', CAST(? AS text),
                           'reviewNote', CAST(? AS text),
                           'reviewDate', CAST(? AS text)
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
            String evidenceCsv = evidencePath == null
                    ? null
                    : Files.readString(evidencePath, StandardCharsets.UTF_8);
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
            Set<String> nonAttributeHeaders = new HashSet<>(BASE_HEADERS);
            nonAttributeHeaders.addAll(OPTIONAL_PRODUCT_HEADERS);
            Set<String> candidateAttributeHeaders = new HashSet<>(headers);
            candidateAttributeHeaders.removeAll(nonAttributeHeaders);
            if (headers.size() < BASE_HEADERS.size()
                    || !headers.subList(0, BASE_HEADERS.size()).equals(BASE_HEADERS)
                    || !ATTRIBUTE_HEADERS.containsAll(candidateAttributeHeaders)
                    || !headers.containsAll(BASE_HEADERS)
                    || new HashSet<>(headers).size() != headers.size()) {
                throw new IllegalArgumentException(
                        "CSV header must contain the 24 canonical base columns, known registry "
                                + "attribute columns, and known product fields.");
            }
            int expectedColumnCount = headers.size();
            rows = new ArrayList<>();
            for (CSVRecord record : parser) {
                int rowNumber = Math.toIntExact(record.getRecordNumber() + 1);
                if (!record.isConsistent() || record.size() != expectedColumnCount) {
                    throw rowError(rowNumber, "expected " + expectedColumnCount + " columns.");
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
                String sourceUrl = nullableText(record.get("source_url"));
                String sourceLocator = nullableText(record.get("source_locator"));
                String reviewNote = nullableText(record.get("review_note"));
                String reviewDate = nullableText(record.get("review_date"));
                CatalogCsvEvidence evidence = new CatalogCsvEvidence(
                        status,
                        sourceUrl,
                        sourceLocator,
                        evidenceSpecificationScope.isEmpty() ? null : evidenceSpecificationScope,
                        reviewNote,
                        reviewDate);
                if (!status.startsWith("VERIFIED_")) {
                    matchedEvidence.put(key, evidence);
                    continue;
                }
                if (!isHttpUrl(sourceUrl) || sourceLocator == null || sourceLocator.isBlank()) {
                    throw rowError(rowNumber, "verified evidence requires a valid source URL and locator.");
                }
                JsonNode evidenceValue;
                try {
                    evidenceValue = objectMapper.readTree(record.get("value_json"));
                } catch (JacksonException exception) {
                    throw rowError(rowNumber, "verified evidence value_json is invalid JSON.");
                }
                if (evidenceValue != null && evidenceValue.isTextual()) {
                    evidenceValue = objectMapper.getNodeFactory().textNode(
                            normalizeOptionValue(definition, evidenceValue.textValue()));
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
                    matchedEvidence.put(key, new CatalogCsvEvidence(
                            "NEEDS_REVIEW",
                            sourceUrl,
                            sourceLocator,
                            evidence.verificationScope(),
                            reviewNote,
                            reviewDate));
                    continue;
                }
                matchedEvidence.put(key, evidence);
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
                CatalogCsvEvidence evidence = matchedEvidence.get(evidenceKey(row.modelCode(), code));
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
                    Map.copyOf(metadata),
                    row.compareAtPrice(),
                    row.stockQuantity(),
                    row.merchandising(),
                    row.bomComponents(),
                    row.upgradeGroups()));
        }
        return enrichedRows;
    }

    private static String evidenceKey(String modelCode, String attributeCode) {
        return modelCode + "\u0000" + attributeCode;
    }

    static void validateDataset(List<CatalogCsvRow> rows) {
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Catalog CSV must contain at least one product.");
        }
        Set<String> modelCodes = new HashSet<>();
        Set<String> normalizedModelCodes = new HashSet<>();
        Set<String> productTypes = new HashSet<>();
        Set<String> categories = new HashSet<>();
        Set<String> brands = new HashSet<>();
        Map<String, String> normalizedBrands = new HashMap<>();
        Map<String, String> productTypesByModel = new HashMap<>();
        Map<String, CatalogCsvRow> rowsByModel = new HashMap<>();
        for (CatalogCsvRow row : rows) {
            if (!modelCodes.add(row.modelCode())
                    || !normalizedModelCodes.add(databaseNaturalKey(row.modelCode()))) {
                throw rowError(
                        row.csvRowNumber(),
                        "duplicate model_code " + row.modelCode() + " under the database collation.");
            }
            productTypes.add(row.productTypeCode());
            productTypesByModel.put(row.modelCode(), row.productTypeCode());
            rowsByModel.put(row.modelCode(), row);
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
            validateBomComponents(row, productTypesByModel);
            validateUpgradeGroups(row, rowsByModel);
        }
        if (productTypes.size() != PRODUCT_TYPE_NAMES.size()
                || categories.size() != CATEGORY_NAMES.size() || brands.isEmpty()) {
            throw new IllegalArgumentException(
                    "Catalog CSV count validation failed: expected all supported product types/categories "
                            + "and at least one brand; found "
                            + modelCodes.size() + ", " + productTypes.size() + ", "
                            + categories.size() + ", and " + brands.size() + ".");
        }

        if (!productTypes.equals(PRODUCT_TYPE_NAMES.keySet())
                || !categories.equals(CATEGORY_NAMES.keySet())) {
            throw new IllegalArgumentException(
                    "Catalog CSV contains missing or unsupported product type/category references.");
        }
    }

    private static void validateBomComponents(
            CatalogCsvRow row, Map<String, String> productTypesByModel) {
        if (row.bomComponents().isEmpty()) return;
        if (!"PC".equals(row.productTypeCode())) {
            throw rowError(row.csvRowNumber(), "Only PC products may declare BOM components.");
        }
        Set<String> seen = new HashSet<>();
        for (CatalogCsvBomComponent component : row.bomComponents()) {
            if (component.quantity() < 1 || component.displayOrder() < 0
                        || !seen.add(component.modelCode())) {
                    throw rowError(row.csvRowNumber(), "BOM component quantity, order, or model is invalid.");
            }
            String referencedType = productTypesByModel.get(component.modelCode());
            if (referencedType == null || !referencedType.equals(component.componentType())) {
                    throw rowError(row.csvRowNumber(),
                            "BOM component references a missing model or mismatched product type: "
                                    + component.modelCode() + ".");
            }
        }
    }

    private static void validateUpgradeGroups(
            CatalogCsvRow row, Map<String, CatalogCsvRow> rowsByModel) {
        if (row.upgradeGroups().isEmpty()) return;
        if (!"PC".equals(row.productTypeCode())) {
            throw rowError(row.csvRowNumber(), "Only PC products may declare upgrade groups.");
        }
        Set<String> groupCodes = new HashSet<>();
        Map<String, Integer> bomQuantities = row.bomComponents().stream()
                    .collect(Collectors.toMap(
                            CatalogCsvBomComponent::modelCode,
                            CatalogCsvBomComponent::quantity));
        for (CatalogCsvUpgradeGroup group : row.upgradeGroups()) {
            if (!group.groupCode().matches("[A-Z][A-Z0-9_]{0,79}")
                        || group.displayName().isBlank()
                        || group.quantity() < 1
                        || group.displayOrder() < 0
                        || group.options().isEmpty()
                        || !groupCodes.add(group.groupCode())
                        || !Integer.valueOf(group.quantity()).equals(bomQuantities.get(group.defaultModelCode()))) {
                    throw rowError(row.csvRowNumber(),
                            "Upgrade group must have a unique code, valid quantity, and default that matches the BOM.");
            }
            CatalogCsvRow defaultComponent = rowsByModel.get(group.defaultModelCode());
            if (defaultComponent == null || !group.groupCode().equals(defaultComponent.productTypeCode())) {
                    throw rowError(row.csvRowNumber(), "Upgrade group default has a mismatched product type.");
            }
            Set<String> optionModels = new HashSet<>();
            boolean includesDefault = false;
            for (CatalogCsvUpgradeOption option : group.options()) {
                    CatalogCsvRow optionProduct = rowsByModel.get(option.modelCode());
                    if (option.displayOrder() < 0 || !optionModels.add(option.modelCode())
                            || optionProduct == null
                            || !group.groupCode().equals(optionProduct.productTypeCode())) {
                        throw rowError(row.csvRowNumber(),
                                "Upgrade options must be unique existing products of the group's component type.");
                    }
                    if (!defaultComponent.currencyCode().equals(optionProduct.currencyCode())) {
                        throw rowError(row.csvRowNumber(),
                                "Upgrade options and their default must use the same currency.");
                    }
                    if (optionProduct.price().compareTo(defaultComponent.price()) < 0) {
                        throw rowError(row.csvRowNumber(),
                                "Upgrade options cannot have a negative price difference from the default.");
                    }
                    includesDefault |= option.modelCode().equals(group.defaultModelCode());
            }
            if (!includesDefault) {
                    throw rowError(row.csvRowNumber(), "Upgrade options must include their default BOM component.");
            }
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
                    || (item.size() != 3 && !(item.size() == 4 && item.has("quantity")))
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
                                + " must contain non-empty component_type, model_code, and product_name "
                                + "strings, with optional positive integer quantity.");
            }
            if (item.has("quantity")
                    && (!item.get("quantity").isIntegralNumber()
                    || !item.get("quantity").canConvertToInt()
                    || item.get("quantity").intValue() < 1)) {
                throw rowError(
                        row.csvRowNumber(),
                        "PC:configuration_items entry " + index + " quantity must be a positive integer.");
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

    public ImportSummary preview(List<CatalogCsvRow> rows, long defaultStock) {
        validateDefaultOfferStock(defaultStock);
        validateDataset(rows);
        return summarize(rows, existingModelCodes(rows).size(), 0);
    }

    private ImportSummary applyInTransaction(List<CatalogCsvRow> rows, long defaultStock) {
        int existingProducts = existingModelCodes(rows).size();
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

        int bomComponentCount = 0;
        for (CatalogCsvRow row : rows) {
            long productId = lookupId(
                    "SELECT \"product_id\" FROM \"products\" WHERE \"model_code\" = ?",
                    row.modelCode());
            bomComponentCount += upsertBomComponents(row, productId);
        }

        int upgradeGroupCount = 0;
        int upgradeOptionCount = 0;
        for (CatalogCsvRow row : rows) {
            long productId = lookupId(
                    "SELECT \"product_id\" FROM \"products\" WHERE \"model_code\" = ?",
                    row.modelCode());
            int[] upgradeCounts = upsertUpgradeGroups(row, productId);
            upgradeGroupCount += upgradeCounts[0];
            upgradeOptionCount += upgradeCounts[1];
        }
        return summarize(
                rows, existingProducts, 0,
                typeIds.size(), categoryIds.size(), brandIds.size(),
                definitionIds.size(), attributeValueCount,
                bomComponentCount, upgradeGroupCount, upgradeOptionCount);
    }

    private ImportSummary summarize(List<CatalogCsvRow> rows, int existingProducts, int failed) {
        return summarize(rows, existingProducts, failed,
                PRODUCT_TYPE_NAMES.size(), CATEGORY_NAMES.size(),
                (int) rows.stream().map(CatalogCsvRow::brandName).distinct().count(),
                AttributeDefinitionRegistry.all().size(),
                rows.stream().mapToInt(row -> row.specifications().size()).sum(),
                rows.stream().mapToInt(row -> row.bomComponents().size()).sum(),
                rows.stream().mapToInt(row -> row.upgradeGroups().size()).sum(),
                rows.stream().flatMap(row -> row.upgradeGroups().stream())
                        .mapToInt(group -> group.options().size()).sum());
    }

    private ImportSummary summarize(
            List<CatalogCsvRow> rows,
            int existingProducts,
            int failed,
            int productTypes,
            int categories,
            int brands,
            int attributeDefinitions,
            int attributeValues,
            int bomComponents,
            int upgradeGroups,
            int upgradeOptions) {
        int inserted = Math.max(0, rows.size() - existingProducts);
        return new ImportSummary(
                rows.size(), inserted, existingProducts, 0, failed,
                productTypes, categories, brands, rows.size(), bomComponents,
                upgradeGroups, upgradeOptions, attributeDefinitions, attributeValues);
    }

    private Set<String> existingModelCodes(List<CatalogCsvRow> rows) {
        if (rows.isEmpty()) return Set.of();
        String placeholders = String.join(",", java.util.Collections.nCopies(rows.size(), "?"));
        Object[] modelCodes = rows.stream().map(CatalogCsvRow::modelCode).toArray();
        return new HashSet<>(jdbcTemplate.queryForList(
                "SELECT \"model_code\" FROM \"products\" WHERE \"model_code\" IN ("
                        + placeholders + ")",
                String.class,
                modelCodes));
    }

    Map<String, Long> ensureProductTypes() {
        Map<String, Long> ids = new LinkedHashMap<>();
        for (Map.Entry<String, String> type : PRODUCT_TYPE_NAMES.entrySet()) {
            jdbcTemplate.update("""
                    INSERT INTO "product_types"
                      ("type_code", "type_name", "description", "is_build_component", "is_active")
                    VALUES (?, ?, 'Danh mục sản phẩm máy tính', ?, TRUE)
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
                    VALUES (?, ?, 'Danh mục sản phẩm và linh kiện máy tính', TRUE)
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
                row.productName(),
                row.merchandising().shortDescription(),
                row.merchandising().description(),
                row.modelCode(),
                row.merchandising().slug(),
                row.merchandising().tags() == null
                        ? "[]" : row.merchandising().tags().toString(),
                row.merchandising().seoTitle(),
                row.merchandising().seoDescription(),
                row.merchandising().featured(),
                row.merchandising().displayOrder(),
                row.merchandising().bomSummary(),
                row.merchandising().contentSections() == null
                        ? "[]" : row.merchandising().contentSections().toString());
        return lookupId("SELECT \"product_id\" FROM \"products\" WHERE \"model_code\" = ?", row.modelCode());
    }

    void upsertOffer(CatalogCsvRow row, long productId, long defaultStock) {
        jdbcTemplate.update(
                OFFER_UPSERT_SQL,
                productId,
                offerCode(row.modelCode()),
                row.price(),
                row.compareAtPrice(),
                row.currencyCode(),
                BigDecimal.valueOf(row.stockQuantity() == null
                        ? defaultStock : row.stockQuantity()),
                BigDecimal.valueOf(row.warrantyMonths()));
    }

    void synchronizeImages(CatalogCsvRow row, long productId) {
        Map<String, ExistingProductImage> existingByUrl = new LinkedHashMap<>();
        List<ExistingProductImage> existingImages = jdbcTemplate.queryForList("""
                        SELECT "image_id", "image_url", "is_primary"
                          FROM "product_images"
                         WHERE "product_id" = ?
                         ORDER BY "sort_order", "image_id"
                        """,
                        productId).stream()
                .map(image -> new ExistingProductImage(
                        ((Number) image.get("image_id")).longValue(),
                        (String) image.get("image_url"),
                        (Boolean) image.get("is_primary")))
                .toList();
        existingImages.forEach(image -> existingByUrl.putIfAbsent(image.url(), image));
        boolean hasExistingPrimary = existingImages.stream().anyMatch(ExistingProductImage::primary);
        for (int imageIndex = 0; imageIndex < row.images().size(); imageIndex++) {
            CatalogCsvImage image = row.images().get(imageIndex);
            ExistingProductImage existing = existingByUrl.get(image.url());
            if (existing != null) {
                jdbcTemplate.update("""
                        UPDATE "product_images"
                           SET "alt_text" = COALESCE(?, "alt_text"),
                               "sort_order" = ?,
                               "is_primary" = ?
                         WHERE "image_id" = ?
                        """,
                        image.altText(),
                        image.sortOrder(),
                        existing.primary() || (!hasExistingPrimary && imageIndex == 0),
                        existing.id());
                continue;
            }
            jdbcTemplate.update("""
                    INSERT INTO "product_images"
                      ("product_id", "image_url", "alt_text", "is_primary", "sort_order")
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    productId,
                    image.url(),
                    image.altText(),
                    !hasExistingPrimary && imageIndex == 0,
                    image.sortOrder());
        }
    }

    private int upsertBomComponents(CatalogCsvRow row, long productId) {
        if ("PC".equals(row.productTypeCode())) {
            List<Long> componentProductIds = row.bomComponents().stream()
                    .map(component -> lookupId(
                            "SELECT \"product_id\" FROM \"products\" WHERE \"model_code\" = ?",
                            component.modelCode()))
                    .toList();
            if (componentProductIds.isEmpty()) {
                jdbcTemplate.update(
                        "DELETE FROM \"product_bom_components\" WHERE \"parent_product_id\" = ?",
                        productId);
            } else {
                String placeholders = String.join(
                        ",", java.util.Collections.nCopies(componentProductIds.size(), "?"));
                Object[] parameters = new Object[componentProductIds.size() + 1];
                parameters[0] = productId;
                for (int index = 0; index < componentProductIds.size(); index++) {
                    parameters[index + 1] = componentProductIds.get(index);
                }
                jdbcTemplate.update(
                        "DELETE FROM \"product_bom_components\" WHERE \"parent_product_id\" = ? "
                                + "AND \"component_product_id\" NOT IN (" + placeholders + ")",
                        parameters);
            }
        }
        int persisted = 0;
        for (CatalogCsvBomComponent component : row.bomComponents()) {
            long componentProductId = lookupId(
                    "SELECT \"product_id\" FROM \"products\" WHERE \"model_code\" = ?",
                    component.modelCode());
            jdbcTemplate.update("""
                    INSERT INTO "product_bom_components" (
                        "parent_product_id", "component_product_id", "quantity",
                        "component_warranty_months", "display_category", "display_order",
                        "customer_visible"
                    ) VALUES (?, ?, ?, NULL, ?, ?, TRUE)
                    ON CONFLICT ("parent_product_id", "component_product_id")
                    DO UPDATE SET "quantity" = EXCLUDED."quantity",
                                  "display_category" = EXCLUDED."display_category",
                                  "display_order" = EXCLUDED."display_order",
                                  "customer_visible" = EXCLUDED."customer_visible",
                                  "updated_at" = CURRENT_TIMESTAMP
                    """, productId, componentProductId, component.quantity(),
                    component.componentType(), component.displayOrder());
            persisted++;
        }
        return persisted;
    }

    private int[] upsertUpgradeGroups(CatalogCsvRow row, long productId) {
        if (!"PC".equals(row.productTypeCode())) {
            return new int[] {0, 0};
        }
        if (row.upgradeGroups().isEmpty()) {
            jdbcTemplate.update("""
                    UPDATE "product_upgrade_groups"
                       SET "is_enabled" = FALSE, "updated_at" = CURRENT_TIMESTAMP
                     WHERE "product_id" = ?
                    """, productId);
            jdbcTemplate.update("""
                    UPDATE "product_upgrade_options"
                       SET "is_enabled" = FALSE
                     WHERE "upgrade_group_id" IN (
                         SELECT "upgrade_group_id" FROM "product_upgrade_groups"
                         WHERE "product_id" = ?
                     )
                    """, productId);
            return new int[] {0, 0};
        }
        String groupPlaceholders = String.join(
                ",", java.util.Collections.nCopies(row.upgradeGroups().size(), "?"));
        Object[] groupParameters = new Object[row.upgradeGroups().size() + 1];
        groupParameters[0] = productId;
        for (int index = 0; index < row.upgradeGroups().size(); index++) {
            groupParameters[index + 1] = row.upgradeGroups().get(index).groupCode();
        }
        jdbcTemplate.update(
                "UPDATE \"product_upgrade_groups\" SET \"is_enabled\" = FALSE, "
                        + "\"updated_at\" = CURRENT_TIMESTAMP WHERE \"product_id\" = ? "
                        + "AND \"group_code\" NOT IN (" + groupPlaceholders + ")",
                groupParameters);
        jdbcTemplate.update(
                "UPDATE \"product_upgrade_options\" SET \"is_enabled\" = FALSE "
                        + "WHERE \"upgrade_group_id\" IN (SELECT \"upgrade_group_id\" "
                        + "FROM \"product_upgrade_groups\" WHERE \"product_id\" = ? "
                        + "AND \"is_enabled\" = FALSE)",
                productId);

        int optionCount = 0;
        for (CatalogCsvUpgradeGroup group : row.upgradeGroups()) {
            jdbcTemplate.update("""
                    INSERT INTO "product_upgrade_groups" (
                        "product_id", "group_code", "display_name", "description",
                        "is_required", "display_order", "is_enabled"
                    ) VALUES (?, ?, ?, ?, FALSE, ?, TRUE)
                    ON CONFLICT ("product_id", "group_code")
                    DO UPDATE SET "display_name" = EXCLUDED."display_name",
                                  "description" = EXCLUDED."description",
                                  "display_order" = EXCLUDED."display_order",
                                  "is_required" = FALSE,
                                  "is_enabled" = TRUE,
                                  "updated_at" = CURRENT_TIMESTAMP
                    """, productId, group.groupCode(), group.displayName(),
                    group.description(), group.displayOrder());
            long groupId = lookupId("""
                    SELECT "upgrade_group_id" FROM "product_upgrade_groups"
                    WHERE "product_id" = ? AND "group_code" = ?
                    """, productId, group.groupCode());
            long defaultOfferId = lookupId(
                    "SELECT \"offer_id\" FROM \"product_offers\" WHERE \"offer_code\" = ?",
                    offerCode(group.defaultModelCode()));
            BigDecimal defaultPrice = jdbcTemplate.queryForObject(
                    "SELECT \"price\" FROM \"product_offers\" WHERE \"offer_id\" = ?",
                    BigDecimal.class,
                    defaultOfferId);
            if (defaultPrice == null) {
                throw new IllegalStateException("Upgrade default offer has no stored price.");
            }
            jdbcTemplate.update(
                    "UPDATE \"product_upgrade_options\" SET \"is_enabled\" = FALSE "
                            + "WHERE \"upgrade_group_id\" = ?",
                    groupId);
            for (CatalogCsvUpgradeOption option : group.options()) {
                long offerId = lookupId(
                        "SELECT \"offer_id\" FROM \"product_offers\" WHERE \"offer_code\" = ?",
                        offerCode(option.modelCode()));
                String productName = jdbcTemplate.queryForObject(
                        "SELECT \"product_name\" FROM \"products\" WHERE \"model_code\" = ?",
                        String.class,
                        option.modelCode());
                BigDecimal optionPrice = jdbcTemplate.queryForObject(
                        "SELECT \"price\" FROM \"product_offers\" WHERE \"offer_id\" = ?",
                        BigDecimal.class,
                        offerId);
                jdbcTemplate.update("""
                        INSERT INTO "product_upgrade_options" (
                            "upgrade_group_id", "offer_id", "price_delta", "display_name",
                            "description", "is_default", "minimum_quantity", "maximum_quantity",
                            "display_order", "is_enabled"
                        ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, TRUE)
                        ON CONFLICT ("upgrade_group_id", "offer_id")
                        DO UPDATE SET "price_delta" = EXCLUDED."price_delta",
                                      "display_name" = EXCLUDED."display_name",
                                      "description" = EXCLUDED."description",
                                      "is_default" = EXCLUDED."is_default",
                                      "minimum_quantity" = EXCLUDED."minimum_quantity",
                                      "maximum_quantity" = EXCLUDED."maximum_quantity",
                                      "display_order" = EXCLUDED."display_order",
                                      "is_enabled" = TRUE
                        """, groupId, offerId, optionPrice.subtract(defaultPrice),
                        productName, option.modelCode().equals(group.defaultModelCode()),
                        group.quantity(), group.quantity(), option.displayOrder());
                optionCount++;
            }
        }
        return new int[] {row.upgradeGroups().size(), optionCount};
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
                evidence.reviewNote(),
                evidence.reviewDate(),
                definitionId);
    }

    private static String nullableText(String value) {
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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
        String category = normalizeCategory(
                requiredCode(record, "category_code", 60, rowNumber), productType, rowNumber);
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
            if (!record.isMapped(column)) {
                continue;
            }
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
        BigDecimal compareAtPrice = optionalPrice(record, "compare_at_price_vnd", rowNumber);
        if (compareAtPrice != null && compareAtPrice.compareTo(price) < 0) {
            throw rowError(rowNumber, "compare_at_price_vnd cannot be lower than price_vnd.");
        }
        Long stockQuantity = optionalUnsignedInteger(record, "stock_quantity", rowNumber);
        CatalogCsvMerchandising merchandising = parseMerchandising(record, rowNumber, objectMapper);
        List<CatalogCsvBomComponent> bomComponents =
                parseBomComponents(attributes.get("component_details"),
                        attributes.get("configuration_items"), rowNumber);
        List<CatalogCsvUpgradeGroup> upgradeGroups =
                parseUpgradeGroups(optionalColumn(record, "pc__upgrade_groups_json"),
                        rowNumber, objectMapper);
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
                Map.of(),
                compareAtPrice,
                stockQuantity,
                merchandising,
                bomComponents,
                upgradeGroups);
    }

    private static String normalizeCategory(String category, String productType, int rowNumber) {
        if ("MOTHERBOARD".equals(productType) && "MOTHERBOARD".equals(category)) {
            return "MAINBOARD";
        }
        if ("PC".equals(productType) && "PC".equals(category)) {
            return "PREBUILT_PC";
        }
        if (!category.equals(CATEGORY_CODES.get(productType))) {
            throw rowError(rowNumber, "category_code " + category
                    + " is not mapped to product_type_code " + productType + ".");
        }
        return category;
    }

    private static CatalogCsvMerchandising parseMerchandising(
            CSVRecord record, int rowNumber, ObjectMapper objectMapper) {
        String shortDescription = optionalColumn(record, "short_description");
        validateOptionalLength(shortDescription, 500, "short_description", rowNumber);
        String description = optionalColumn(record, "description");
        validateOptionalLength(description, 100_000, "description", rowNumber);
        String slug = optionalColumn(record, "slug");
        validateOptionalLength(slug, 180, "slug", rowNumber);
        String seoTitle = optionalColumn(record, "seo_title");
        validateOptionalLength(seoTitle, 255, "seo_title", rowNumber);
        String seoDescription = optionalColumn(record, "seo_description");
        validateOptionalLength(seoDescription, 500, "seo_description", rowNumber);
        String bomSummary = optionalColumn(record, "bom_summary");
        validateOptionalLength(bomSummary, 4000, "bom_summary", rowNumber);
        JsonNode tags = parseOptionalJson(optionalColumn(record, "tags_json"),
                "tags_json", rowNumber, objectMapper);
        if (tags != null && (!tags.isArray()
                || tags.valueStream().anyMatch(value -> !value.isTextual() || value.asString().isBlank()))) {
            throw rowError(rowNumber, "tags_json must be an array of non-empty strings.");
        }
        JsonNode contentSections = parseOptionalJson(
                optionalColumn(record, "content_sections_json"),
                "content_sections_json", rowNumber, objectMapper);
        validateContentSections(contentSections, rowNumber);
        boolean featured = optionalColumn(record, "is_featured") == null
                ? false
                : parseBoolean(optionalColumn(record, "is_featured"), "is_featured", rowNumber);
        int displayOrder = optionalColumn(record, "display_order") == null
                ? 0
                : Math.toIntExact(parseUnsignedInteger(
                        optionalColumn(record, "display_order"), 10, "display_order", rowNumber));
        return new CatalogCsvMerchandising(
                blankToNull(shortDescription),
                blankToNull(description),
                blankToNull(slug),
                tags,
                blankToNull(seoTitle),
                blankToNull(seoDescription),
                featured,
                displayOrder,
                blankToNull(bomSummary),
                contentSections);
    }

    private static void validateContentSections(JsonNode sections, int rowNumber) {
        if (sections == null) return;
        if (!sections.isArray()) {
            throw rowError(rowNumber, "content_sections_json must be a JSON array.");
        }
        for (JsonNode section : sections) {
            JsonNode heading = section.get("heading");
            JsonNode body = section.get("body");
            if (!section.isObject() || heading == null || !heading.isTextual()
                    || heading.asString().isBlank() || heading.asString().length() > 180
                    || body == null || !body.isTextual() || body.asString().isBlank()
                    || body.asString().length() > 10_000) {
                throw rowError(rowNumber,
                        "Each content section must have a non-empty heading and body.");
            }
        }
    }

    private static List<CatalogCsvBomComponent> parseBomComponents(
            JsonNode componentDetails, JsonNode configurationItems, int rowNumber) {
        JsonNode components = componentDetails != null ? componentDetails : configurationItems;
        if (components == null) return List.of();
        if (!components.isArray()) {
            throw rowError(rowNumber, "PC component details must be a JSON array.");
        }
        List<CatalogCsvBomComponent> result = new ArrayList<>();
        Map<String, Integer> quantitiesByModel = new LinkedHashMap<>();
        Map<String, String> typeByModel = new HashMap<>();
        for (JsonNode component : components) {
            String type = textualField(component, "component_type", rowNumber);
            String model = textualField(component, "model_code", rowNumber);
            int quantity = component.has("quantity")
                    ? Math.toIntExact(parseJsonUnsignedInteger(component.get("quantity"), "quantity", rowNumber))
                    : 1;
            Integer total = quantitiesByModel.merge(model, quantity, Integer::sum);
            String priorType = typeByModel.putIfAbsent(model, type);
            if (priorType != null && !priorType.equals(type)) {
                throw rowError(rowNumber, "A BOM model code cannot have multiple component types.");
            }
        }
        int displayOrder = 0;
        for (Map.Entry<String, Integer> component : quantitiesByModel.entrySet()) {
            result.add(new CatalogCsvBomComponent(
                    typeByModel.get(component.getKey()),
                    component.getKey(),
                    component.getValue(),
                    displayOrder++));
        }
        return List.copyOf(result);
    }

    private static List<CatalogCsvUpgradeGroup> parseUpgradeGroups(
            String raw, int rowNumber, ObjectMapper objectMapper) {
        JsonNode groups = parseOptionalJson(raw, "pc__upgrade_groups_json", rowNumber, objectMapper);
        if (groups == null) return List.of();
        if (!groups.isArray()) {
            throw rowError(rowNumber, "pc__upgrade_groups_json must be a JSON array.");
        }
        List<CatalogCsvUpgradeGroup> result = new ArrayList<>();
        for (JsonNode group : groups) {
            String code = textualField(group, "group_code", rowNumber).toUpperCase(Locale.ROOT);
            String displayName = textualField(group, "display_name", rowNumber);
            String description = optionalJsonText(group, "description", rowNumber);
            String defaultModelCode = textualField(group, "default_model_code", rowNumber);
            int quantity = Math.toIntExact(parseJsonUnsignedInteger(
                    group.get("quantity"), "quantity", rowNumber));
            int groupOrder = group.has("display_order")
                    ? Math.toIntExact(parseJsonUnsignedInteger(
                            group.get("display_order"), "display_order", rowNumber))
                    : result.size();
            JsonNode options = group.get("options");
            if (options == null || !options.isArray()) {
                throw rowError(rowNumber, "Each upgrade group must include an options array.");
            }
            List<CatalogCsvUpgradeOption> parsedOptions = new ArrayList<>();
            for (JsonNode option : options) {
                String modelCode = textualField(option, "model_code", rowNumber);
                int order = option.has("display_order")
                        ? Math.toIntExact(parseJsonUnsignedInteger(
                                option.get("display_order"), "display_order", rowNumber))
                        : parsedOptions.size();
                parsedOptions.add(new CatalogCsvUpgradeOption(modelCode, order));
            }
            result.add(new CatalogCsvUpgradeGroup(
                    code, displayName, description, defaultModelCode, quantity,
                    List.copyOf(parsedOptions), groupOrder));
        }
        return List.copyOf(result);
    }

    private static String textualField(JsonNode object, String field, int rowNumber) {
        JsonNode value = object == null ? null : object.get(field);
        if (value == null || !value.isTextual() || value.asString().isBlank()) {
            throw rowError(rowNumber, "JSON field " + field + " must be a non-empty string.");
        }
        return value.asString().trim();
    }

    private static String optionalJsonText(JsonNode object, String field, int rowNumber) {
        JsonNode value = object == null ? null : object.get(field);
        if (value == null || value.isNull()) return null;
        if (!value.isTextual()) {
            throw rowError(rowNumber, "JSON field " + field + " must be a string.");
        }
        return value.asString().trim();
    }

    private static long parseJsonUnsignedInteger(JsonNode value, String field, int rowNumber) {
        if (value == null || !value.isIntegralNumber() || value.longValue() < 0) {
            throw rowError(rowNumber, "JSON field " + field + " must be a non-negative integer.");
        }
        return value.longValue();
    }

    private static JsonNode parseOptionalJson(
            String raw, String field, int rowNumber, ObjectMapper objectMapper) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return objectMapper.readTree(raw);
        } catch (JacksonException exception) {
            throw rowError(rowNumber, field + " must contain valid JSON.");
        }
    }

    private static BigDecimal optionalPrice(CSVRecord record, String column, int rowNumber) {
        String value = optionalColumn(record, column);
        if (value == null) return null;
        try {
            BigDecimal price = new BigDecimal(value).setScale(2, RoundingMode.UNNECESSARY);
            if (price.signum() < 0 || price.precision() > 15) {
                throw rowError(rowNumber, column + " is outside DECIMAL(15,2) bounds.");
            }
            return price;
        } catch (NumberFormatException | ArithmeticException exception) {
            throw rowError(rowNumber, column + " must be a non-negative decimal with at most 2 places.");
        }
    }

    private static Long optionalUnsignedInteger(CSVRecord record, String column, int rowNumber) {
        String value = optionalColumn(record, column);
        return value == null
                ? null
                : parseUnsignedInteger(value, 10, column, rowNumber);
    }

    private static String optionalColumn(CSVRecord record, String column) {
        if (!record.isMapped(column)) return null;
        String value = record.get(column);
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static void validateOptionalLength(
            String value, int maxLength, String column, int rowNumber) {
        if (value != null && value.length() > maxLength) {
            throw rowError(rowNumber, column + " exceeds " + maxLength + " characters.");
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
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
        if ("BOOLEAN".equals(definition.dataType())) {
            return switch (value.toLowerCase(Locale.ROOT)) {
                case "true" -> objectMapper.getNodeFactory().booleanNode(true);
                case "false" -> objectMapper.getNodeFactory().booleanNode(false);
                default -> throw rowError(
                        rowNumber,
                        definition.productType() + ":" + definition.code() + " is not valid BOOLEAN data.");
            };
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
        if (value == null) {
            return false;
        }
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
            int insertedProducts,
            int updatedProducts,
            int skippedProducts,
            int failedProducts,
            int productTypes,
            int categories,
            int brands,
            int offers,
            int bomComponents,
            int upgradeGroups,
            int upgradeOptions,
            int attributeDefinitions,
            int attributeValues) {
    }

    private record AttributeKey(String typeCode, String code) {
    }

    private record ExistingProductImage(long id, String url, boolean primary) {
    }

}
