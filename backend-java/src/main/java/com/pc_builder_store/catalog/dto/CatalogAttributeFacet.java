package com.pc_builder_store.catalog.dto;

import java.util.List;

public record CatalogAttributeFacet(
        String productType,
        String code,
        String label,
        List<Value> values) {

    public record Value(String label, String value) {
    }
}
