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
        List<AttributeFilter> attributes,
        String pcCollection,
        String accessoryType,
        boolean saleOnly) {

    public CatalogQuery(
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
        this(page, limit, query, type, category, brand, minPrice, maxPrice,
                sort, order, attributes, null, null, false);
    }

    public CatalogQuery(
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
            List<AttributeFilter> attributes,
            String pcCollection,
            boolean saleOnly) {
        this(page, limit, query, type, category, brand, minPrice, maxPrice,
                sort, order, attributes, pcCollection, null, saleOnly);
    }

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
