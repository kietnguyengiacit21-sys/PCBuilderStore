package com.pc_builder_store.catalog.dto;

import java.util.List;
import tools.jackson.databind.JsonNode;

public record CatalogProduct(
        String productId,
        String modelCode,
        String productName,
        String shortDescription,
        String description,
        String status,
        String productType,
        String productTypeName,
        String categoryCode,
        String categoryName,
        String brandName,
        List<CatalogOffer> offers,
        JsonNode specifications,
        List<CatalogImage> images,
        boolean demoData) {
}
