package com.pc_builder_store.auth;

import org.springframework.http.HttpStatus;

public class StaffAccountException extends RuntimeException {

    private final HttpStatus status;

    public StaffAccountException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
