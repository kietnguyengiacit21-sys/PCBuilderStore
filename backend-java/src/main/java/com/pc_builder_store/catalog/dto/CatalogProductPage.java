package com.pc_builder_store.catalog.dto;

import java.util.List;

public record CatalogProductPage(
        List<CatalogProduct> data,
        CatalogPagination pagination) {
}
