package com.pc_builder_store.catalog.dto;

public final class TaxonomyDtos {

    private TaxonomyDtos() {}

    public record Category(
            String categoryId,
            String categoryCode,
            String categoryName,
            String description,
            String parentCategoryCode,
            boolean active,
            long productCount,
            long activeProductCount) {}

    public record CategoryRequest(
            String categoryCode,
            String categoryName,
            String description,
            String parentCategoryCode,
            Boolean active) {}

    public record Brand(
            String brandId,
            String brandName,
            String websiteUrl,
            String description,
            boolean active,
            long productCount,
            long activeProductCount) {}

    public record BrandRequest(
            String brandName,
            String websiteUrl,
            String description,
            Boolean active) {}
}
