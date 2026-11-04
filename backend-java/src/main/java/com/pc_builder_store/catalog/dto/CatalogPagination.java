package com.pc_builder_store.catalog.dto;

public record CatalogPagination(int page, int limit, long total, long totalPages) {
}
