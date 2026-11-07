package com.pc_builder_store.catalog.dto;

import java.util.List;
import java.util.Map;
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
        Map<String, CatalogAttributeVerification> verificationMetadata,
        List<CatalogImage> images,
        boolean demoData) {

    public CatalogProduct(
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
        this(productId, modelCode, productName, shortDescription, description, status, productType,
                productTypeName, categoryCode, categoryName, brandName, offers, specifications,
                Map.of(), images, demoData);
    }
}
