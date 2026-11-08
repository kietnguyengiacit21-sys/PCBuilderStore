package com.pc_builder_store.catalog.dto;

public record CatalogImage(
        String url,
        String altText,
        boolean isPrimary,
        String caption,
        String mediaType) {

    public CatalogImage(String url, String altText, boolean isPrimary) {
        this(url, altText, isPrimary, null, "IMAGE");
    }
}
