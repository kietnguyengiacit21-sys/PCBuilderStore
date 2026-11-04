package com.pc_builder_store.exception;

public class DatabaseUnavailableException extends RuntimeException {

    public DatabaseUnavailableException(Throwable cause) {
        super("Database is unavailable.", cause);
    }
}
