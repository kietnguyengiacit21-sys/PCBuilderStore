package com.pc_builder_store.catalog;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

public final class AttributeDefinitionRegistry {

    private static final List<String> HEADERS = List.of(
            "product_type",
            "code",
            "label_vi",
            "label_en",
            "data_type",
            "unit",
            "filterable",
            "build_critical",
            "subtype",
            "input_mode",
            "options",
            "specification_scope");
    private static final Map<Key, Definition> DEFINITIONS = loadDefinitions();

    private AttributeDefinitionRegistry() {
    }

    public static List<Definition> all() {
        return List.copyOf(DEFINITIONS.values());
    }

    public static Optional<Definition> find(String productType, String code) {
        return Optional.ofNullable(DEFINITIONS.get(new Key(productType, code)));
    }

    private static Map<Key, Definition> loadDefinitions() {
        InputStream resource = AttributeDefinitionRegistry.class.getResourceAsStream(
                "/catalog-attribute-definitions.csv");
        if (resource == null) {
            throw new IllegalStateException("Catalog attribute definition resource is missing.");
        }
        Map<Key, Definition> definitions = new LinkedHashMap<>();
        try (InputStream input = resource;
                InputStreamReader reader = new InputStreamReader(input, StandardCharsets.UTF_8);
                CSVParser parser = CSVParser.parse(
                        reader,
                        CSVFormat.DEFAULT.builder()
                                .setHeader()
                                .setSkipHeaderRecord(true)
                                .setIgnoreEmptyLines(false)
                                .build())) {
            if (!HEADERS.equals(parser.getHeaderNames())) {
                throw new IllegalStateException("Catalog attribute definition resource has an invalid header.");
            }
            for (CSVRecord record : parser) {
                if (!record.isConsistent()) {
                    throw new IllegalStateException(
                            "Catalog attribute definition row " + record.getRecordNumber() + " is malformed.");
                }
                Definition definition = new Definition(
                        record.get("product_type"),
                        record.get("code"),
                        record.get("label_vi"),
                        record.get("label_en"),
                        record.get("data_type"),
                        record.get("unit").isBlank() ? null : record.get("unit"),
                        Boolean.parseBoolean(record.get("filterable")),
                        Boolean.parseBoolean(record.get("build_critical")),
                        record.get("subtype").isBlank() ? null : record.get("subtype"),
                        record.get("input_mode").isBlank() ? null : record.get("input_mode"),
                        record.get("options").isBlank()
                                ? List.of()
                                : List.of(record.get("options").split("\\|", -1)),
                        record.get("specification_scope").isBlank()
                                ? null
                                : record.get("specification_scope"));
                if (!definition.filterableText().equals(record.get("filterable"))
                        || !definition.buildCriticalText().equals(record.get("build_critical"))
                        || !definition.code().matches("[a-z][a-z0-9_]*")
                        || !List.of("TEXT", "DECIMAL", "INTEGER", "BOOLEAN", "JSON")
                                .contains(definition.dataType())
                        || !validEditorMetadata(definition)
                        || !validSpecificationScope(definition)) {
                    throw new IllegalStateException(
                            "Catalog attribute definition row " + record.getRecordNumber() + " is invalid.");
                }
                Key key = new Key(definition.productType(), definition.code());
                if (definitions.putIfAbsent(key, definition) != null) {
                    throw new IllegalStateException("Duplicate catalog attribute definition " + key + ".");
                }
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read catalog attribute definition resource.", exception);
        }
        if (definitions.isEmpty()
                || !definitions.keySet().stream().map(Key::productType).distinct().sorted().toList()
                        .equals(List.of("ACCESSORY", "CASE", "COOLER", "CPU", "GPU",
                                "MOTHERBOARD", "PC", "PSU", "RAM", "STORAGE"))) {
            throw new IllegalStateException("Catalog attribute dictionary must cover all ten product types.");
        }
        return Map.copyOf(definitions);
    }

    private static boolean validEditorMetadata(Definition definition) {
        if (!definition.options().isEmpty()
                && (!"TEXT".equals(definition.dataType())
                        || definition.options().stream().anyMatch(String::isBlank)
                        || definition.options().stream().distinct().count() != definition.options().size())) {
            return false;
        }
        return switch (definition.inputMode() == null ? "" : definition.inputMode()) {
            case "" -> definition.options().isEmpty();
            case "TEXT" -> "TEXT".equals(definition.dataType()) && definition.options().isEmpty();
            case "TEXTAREA" -> List.of("TEXT", "JSON").contains(definition.dataType())
                    && definition.options().isEmpty();
            case "NUMBER" -> List.of("INTEGER", "DECIMAL").contains(definition.dataType())
                    && definition.options().isEmpty();
            case "BOOLEAN" -> "BOOLEAN".equals(definition.dataType()) && definition.options().isEmpty();
            case "JSON", "JSON_ARRAY" -> "JSON".equals(definition.dataType())
                    && definition.options().isEmpty();
            case "SELECT" -> "TEXT".equals(definition.dataType()) && !definition.options().isEmpty();
            default -> false;
        };
    }

    private static boolean validSpecificationScope(Definition definition) {
        if (definition.specificationScope() == null) {
            return !"GPU".equals(definition.productType());
        }
        return "GPU".equals(definition.productType())
                && List.of("GPU_SILICON", "BOARD_VARIANT").contains(definition.specificationScope());
    }

    private record Key(String productType, String code) {
    }

    public record Definition(
            String productType,
            String code,
            String labelVi,
            String labelEn,
            String dataType,
            String unit,
            boolean filterable,
            boolean buildCritical,
            String subtype,
            String inputMode,
            List<String> options,
            String specificationScope) {
        private String filterableText() {
            return Boolean.toString(filterable);
        }

        private String buildCriticalText() {
            return Boolean.toString(buildCritical);
        }
    }
}
