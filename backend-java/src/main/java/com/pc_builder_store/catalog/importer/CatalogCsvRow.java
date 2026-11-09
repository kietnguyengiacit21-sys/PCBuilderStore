package com.pc_builder_store.catalog.importer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.JsonNode;

record CatalogCsvRow(
        int csvRowNumber,
        String modelCode,
        String productName,
        String brandName,
        String productTypeCode,
        String categoryCode,
        BigDecimal price,
        String currencyCode,
        String priceSourceName,
        String priceSourceUrl,
        LocalDate priceCheckedAt,
        boolean priceIsEstimate,
        int warrantyMonths,
        String manufacturerSpecUrl,
        List<CatalogCsvImage> images,
        String dataNote,
        Map<String, JsonNode> specifications,
        Map<String, CatalogCsvEvidence> verificationMetadata,
        BigDecimal compareAtPrice,
        Long stockQuantity,
        CatalogCsvMerchandising merchandising,
        List<CatalogCsvBomComponent> bomComponents,
        List<CatalogCsvUpgradeGroup> upgradeGroups) {

    CatalogCsvRow(
            int csvRowNumber,
            String modelCode,
            String productName,
            String brandName,
            String productTypeCode,
            String categoryCode,
            BigDecimal price,
            String currencyCode,
            String priceSourceName,
            String priceSourceUrl,
            LocalDate priceCheckedAt,
            boolean priceIsEstimate,
            int warrantyMonths,
            String manufacturerSpecUrl,
            List<CatalogCsvImage> images,
            String dataNote,
            Map<String, JsonNode> specifications,
            Map<String, CatalogCsvEvidence> verificationMetadata) {
        this(csvRowNumber, modelCode, productName, brandName, productTypeCode, categoryCode,
                price, currencyCode, priceSourceName, priceSourceUrl, priceCheckedAt,
                priceIsEstimate, warrantyMonths, manufacturerSpecUrl, images, dataNote,
                specifications, verificationMetadata, null, null,
                CatalogCsvMerchandising.empty(), List.of(), List.of());
    }
}

record CatalogCsvImage(String url, String altText, int sortOrder) {
}

record CatalogCsvMerchandising(
        String shortDescription,
        String description,
        String slug,
        JsonNode tags,
        String seoTitle,
        String seoDescription,
        boolean featured,
        int displayOrder,
        String bomSummary,
        JsonNode contentSections) {

    static CatalogCsvMerchandising empty() {
        return new CatalogCsvMerchandising(null, null, null, null,
                null, null, false, 0, null, null);
    }
}

record CatalogCsvBomComponent(
        String componentType,
        String modelCode,
        int quantity,
        int displayOrder) {
}

record CatalogCsvUpgradeGroup(
        String groupCode,
        String displayName,
        String description,
        String defaultModelCode,
        int quantity,
        List<CatalogCsvUpgradeOption> options,
        int displayOrder) {
}

record CatalogCsvUpgradeOption(String modelCode, int displayOrder) {
}

record CatalogCsvEvidence(
        String verificationStatus,
        String sourceUrl,
        String sourceLocator,
        String verificationScope,
        String reviewNote,
        String reviewDate) {

    CatalogCsvEvidence(
            String verificationStatus,
            String sourceUrl,
            String sourceLocator,
            String verificationScope) {
        this(verificationStatus, sourceUrl, sourceLocator, verificationScope, null, null);
    }
}
