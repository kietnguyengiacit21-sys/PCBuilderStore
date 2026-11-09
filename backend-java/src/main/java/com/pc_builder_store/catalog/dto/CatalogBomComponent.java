package com.pc_builder_store.catalog.dto;

import tools.jackson.databind.JsonNode;

public record CatalogBomComponent(
        String componentProductId,
        String modelCode,
        String productName,
        String productType,
        int quantity,
        Integer warrantyMonths,
        String displayCategory,
        int displayOrder,
        String imageUrl,
        String imageAltText,
        JsonNode keySpecifications) {

    public CatalogBomComponent(
            String componentProductId,
            String modelCode,
            String productName,
            String productType,
            int quantity,
            Integer warrantyMonths,
            String displayCategory,
            int displayOrder,
            String imageUrl,
            String imageAltText) {
        this(componentProductId, modelCode, productName, productType, quantity, warrantyMonths,
                displayCategory, displayOrder, imageUrl, imageAltText, null);
    }
}
