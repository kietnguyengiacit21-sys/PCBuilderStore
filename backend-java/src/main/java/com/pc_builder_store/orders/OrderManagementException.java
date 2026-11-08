package com.pc_builder_store.orders;

import org.springframework.http.HttpStatus;

public class OrderManagementException extends RuntimeException {

    private final HttpStatus status;

    public OrderManagementException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
