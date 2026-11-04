package com.pc_builder_store.common;

import java.time.Instant;

public record ApiErrorResponse(ErrorDetail error) {

    public static ApiErrorResponse of(String code, String message) {
        return new ApiErrorResponse(new ErrorDetail(code, message, Instant.now().toString()));
    }

    public record ErrorDetail(String code, String message, String timestamp) {
    }
}
