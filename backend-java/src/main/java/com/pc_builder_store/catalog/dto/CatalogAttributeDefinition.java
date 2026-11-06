package com.pc_builder_store.catalog.dto;

import java.util.List;

public record CatalogAttributeDefinition(
        String productType,
        String code,
        String label,
        String dataType,
        String unit,
        boolean filterable,
        String englishLabel,
        String subtype,
        String inputMode,
        List<String> options,
        String specificationScope) {

    public CatalogAttributeDefinition(
            String productType,
            String code,
            String label,
            String dataType,
            String unit,
            boolean filterable) {
        this(productType, code, label, dataType, unit, filterable, label, null, null, List.of(), null);
    }
}
