package com.pc_builder_store.catalog;

import com.pc_builder_store.catalog.exception.InvalidCatalogQueryException;
import java.math.RoundingMode;
import java.util.Map;
import tools.jackson.databind.JsonNode;

public final class CatalogSpecificationValidator {

    private CatalogSpecificationValidator() {
    }

    public static void validateGpuValues(Map<String, JsonNode> specifications) {
        if (specifications == null) {
            throw new InvalidCatalogQueryException("GPU specifications must be provided.");
        }
        for (Map.Entry<String, JsonNode> entry : specifications.entrySet()) {
            AttributeDefinitionRegistry.Definition definition = AttributeDefinitionRegistry
                    .find("GPU", entry.getKey())
                    .orElseThrow(() -> new InvalidCatalogQueryException(
                            "Unsupported GPU specification: " + entry.getKey() + "."));
            JsonNode value = entry.getValue();
            if (value == null || value.isNull()) {
                continue;
            }
            switch (definition.dataType()) {
                case "TEXT" -> validateText(definition, value);
                case "INTEGER" -> {
                    if (!value.isIntegralNumber() || !value.canConvertToLong()) {
                        invalidValue(definition);
                    }
                }
                case "DECIMAL" -> {
                    if (!value.isNumber()) {
                        invalidValue(definition);
                    }
                    try {
                        if (value.decimalValue().setScale(6, RoundingMode.UNNECESSARY).precision() > 20) {
                            invalidValue(definition);
                        }
                    } catch (ArithmeticException exception) {
                        invalidValue(definition);
                    }
                }
                case "BOOLEAN" -> {
                    if (!value.isBoolean()) {
                        invalidValue(definition);
                    }
                }
                case "JSON" -> {
                    if ("JSON_ARRAY".equals(definition.inputMode())
                            ? !value.isArray()
                            : !value.isArray() && !value.isObject()) {
                        invalidValue(definition);
                    }
                }
                default -> throw new InvalidCatalogQueryException(
                        "Unsupported data type for GPU specification " + definition.code() + ".");
            }
        }
    }

    private static void validateText(
            AttributeDefinitionRegistry.Definition definition,
            JsonNode value) {
        if (!value.isTextual()) {
            invalidValue(definition);
        }
        if (!definition.options().isEmpty()
                && !definition.options().contains(value.textValue())) {
            throw new InvalidCatalogQueryException(
                    "GPU specification " + definition.code() + " must use one of its defined options.");
        }
    }

    private static void invalidValue(AttributeDefinitionRegistry.Definition definition) {
        throw new InvalidCatalogQueryException(
                "GPU specification " + definition.code() + " has an invalid " + definition.dataType() + " value.");
    }
}
