package com.pc_builder_store.catalog.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PublicCatalogAttributeDefinition(
        String productType,
        String code,
        String label,
        String dataType,
                String unit,
                String subtype) {

        public PublicCatalogAttributeDefinition(
                        String productType,
                        String code,
                        String label,
                        String dataType,
                        String unit) {
                this(productType, code, label, dataType, unit, null);
        }
}
