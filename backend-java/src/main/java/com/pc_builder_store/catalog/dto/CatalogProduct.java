package com.pc_builder_store.catalog.dto;

import java.util.List;
import java.util.Map;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
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
        @JsonInclude(JsonInclude.Include.NON_NULL)
        Map<String, CatalogAttributeVerification> verificationMetadata,
        Map<String, CatalogAttributeQuality> specificationQuality,
        List<CatalogImage> images,
        @JsonIgnore
        boolean demoData,
        List<CatalogBomComponent> bomComponents,
        JsonNode contentSections) {

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
            Map<String, CatalogAttributeVerification> verificationMetadata,
            Map<String, CatalogAttributeQuality> specificationQuality,
            List<CatalogImage> images,
            boolean demoData) {
        this(productId, modelCode, productName, shortDescription, description, status, productType,
                productTypeName, categoryCode, categoryName, brandName, offers, specifications,
                verificationMetadata, specificationQuality, images, demoData, List.of(), null);
    }

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
            Map<String, CatalogAttributeVerification> verificationMetadata,
            List<CatalogImage> images,
            boolean demoData) {
        this(productId, modelCode, productName, shortDescription, description, status, productType,
                productTypeName, categoryCode, categoryName, brandName, offers, specifications,
                verificationMetadata, Map.of(), images, demoData, List.of(), null);
    }

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
            Map.of(), Map.of(), images, demoData, List.of(), null);
    }
}
