package com.pc_builder_store.catalog.dto;

public record CatalogAttributeVerification(
        CatalogVerificationStatus verificationStatus,
        String sourceUrl,
        String sourceLocator,
        String verificationScope) {
}
