package com.pc_builder_store.catalog.dto;

public record CatalogBomComponent(
        String componentProductId,
        String modelCode,
        String productName,
        String productType,
        int quantity,
        Integer warrantyMonths,
        String displayCategory,
        int displayOrder) {
}
