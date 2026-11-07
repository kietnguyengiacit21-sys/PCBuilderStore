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
        Map<String, CatalogCsvEvidence> verificationMetadata) {
}

record CatalogCsvImage(String url, String altText, int sortOrder) {
}

record CatalogCsvEvidence(
        String verificationStatus,
        String sourceUrl,
        String sourceLocator,
        String verificationScope) {
}
