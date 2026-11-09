package com.pc_builder_store.catalog.dto;

import java.util.List;

public record PcBuilderCompatibilityResponse(
        String status,
        List<Check> checks,
        List<String> warnings) {

    public record Check(
            String code,
            String label,
            String status,
            String detail) {
    }
}
