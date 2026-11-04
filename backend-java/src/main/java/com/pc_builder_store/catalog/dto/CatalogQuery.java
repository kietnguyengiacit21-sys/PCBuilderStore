package com.pc_builder_store.catalog.dto;

import java.math.BigDecimal;
import java.util.List;

public record CatalogQuery(
        int page,
        int limit,
        String query,
        String type,
        String category,
        String brand,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        Sort sort,
        Direction order,
        List<AttributeFilter> attributes) {

    public enum Sort {
        NAME,
        PRICE
    }

    public enum Direction {
        ASC,
        DESC
    }

    public record AttributeFilter(String code, String value) {
    }
}
