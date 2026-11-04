package com.pc_builder_store.catalog.dto;

import java.math.BigDecimal;

public record CatalogOffer(
        String offerCode,
        String condition,
        BigDecimal price,
        String currency,
        long stockQuantity,
        long reservedQuantity,
        long availableQuantity,
        Long warrantyMonths,
        String status,
        boolean isDemo) {
}
