package com.pc_builder_store.catalog.importer;

import java.math.BigDecimal;
import java.util.Map;
import tools.jackson.databind.JsonNode;

record CatalogCsvRow(
        int csvRowNumber,
        String modelCode,
        String productName,
        String brandName,
        String productTypeCode,
        String categoryCode,
        String shortDescription,
        String conditionCode,
        String currencyCode,
        BigDecimal demoPrice,
        long demoStockQuantity,
        long warrantyMonths,
        Map<String, JsonNode> specifications) {
}
