package com.pc_builder_store.storefront;

import com.pc_builder_store.catalog.dto.CatalogProduct;
import java.util.List;

public record StorefrontHomepageResponse(List<Section> sections) {

    public record Section(
            String key,
            String title,
            String eyebrow,
            String href,
            String variant,
            long productCount,
            List<Link> links,
            List<CatalogProduct> products) {
    }

    public record Link(String label, String href) {
    }
}
