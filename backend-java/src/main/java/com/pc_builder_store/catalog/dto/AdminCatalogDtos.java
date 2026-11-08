package com.pc_builder_store.catalog.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.JsonNode;

public final class AdminCatalogDtos {

    private AdminCatalogDtos() {
    }

    public record ProductSaveRequest(
            String modelCode,
            String productName,
            String sku,
            String slug,
            String productType,
            String categoryCode,
            String brandName,
            String shortDescription,
            String description,
            String seoTitle,
            String seoDescription,
            List<String> tags,
            boolean featured,
            int displayOrder,
            JsonNode contentSections,
            Map<String, JsonNode> specifications) {
    }

    public record OfferSaveRequest(
            String offerId,
            String condition,
            BigDecimal price,
            BigDecimal compareAtPrice,
            String currency,
            long stockQuantity,
            long warrantyMonths,
            String status,
            int minimumPurchaseQuantity,
            int maximumPurchaseQuantity,
            Integer lowStockThreshold) {
    }

    public record BomComponentRequest(
            String componentProductId,
            int quantity,
            Integer warrantyMonths,
            String displayCategory,
            int displayOrder,
            boolean customerVisible) {
    }

    public record ImageSaveRequest(
            String imageId,
            String url,
            String altText,
            String caption,
            String mediaType,
            boolean primary,
            int displayOrder) {
    }

    public record AdminProductSummary(
            String productId,
            String modelCode,
            String productName,
            String productType,
            String categoryName,
            String brandName,
            String status,
            BigDecimal minimumPrice,
            String currency,
            long availableQuantity) {
    }

    public record AdminProductPage(
            List<AdminProductSummary> data,
            int page,
            int limit,
            long total) {
    }

    public record ProductStatusRequest(String status) {
    }

    public record AdminOffer(
            String offerId,
            String condition,
            BigDecimal price,
            BigDecimal compareAtPrice,
            String currency,
            long stockQuantity,
            long reservedQuantity,
            long availableQuantity,
            long warrantyMonths,
            String status,
            int minimumPurchaseQuantity,
            int maximumPurchaseQuantity,
            Integer lowStockThreshold) {
    }

    public record AdminImage(
            String imageId,
            String url,
            String altText,
            String caption,
            String mediaType,
            String mimeType,
            String fileName,
            boolean primary,
            int displayOrder) {
    }

    public record AdminBomComponent(
            String componentProductId,
            String modelCode,
            String productName,
            String productType,
            int quantity,
            Integer warrantyMonths,
            String displayCategory,
            int displayOrder,
            boolean customerVisible) {
    }

    public record AdminProduct(
            String productId,
            String modelCode,
            String productName,
            String sku,
            String slug,
            String productType,
            String productTypeName,
            String categoryCode,
            String categoryName,
            String brandName,
            String shortDescription,
            String description,
            String seoTitle,
            String seoDescription,
            List<String> tags,
            boolean featured,
            int displayOrder,
            String status,
            JsonNode contentSections,
            Map<String, JsonNode> specifications,
            List<AdminOffer> offers,
            List<AdminImage> images,
            List<AdminBomComponent> bomComponents) {
    }

    public record AuditEntry(
            String action,
            JsonNode changes,
            String actorName,
            String actorEmail,
            String createdAt) {
    }
}
