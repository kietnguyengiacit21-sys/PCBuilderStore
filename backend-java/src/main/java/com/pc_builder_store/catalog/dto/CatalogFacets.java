package com.pc_builder_store.catalog.dto;

import java.util.List;

public record CatalogFacets(
        List<CatalogOption> productTypes,
        List<CatalogOption> categories,
        List<CatalogOption> brands,
        List<CatalogAttributeFacet> attributes) {
}
