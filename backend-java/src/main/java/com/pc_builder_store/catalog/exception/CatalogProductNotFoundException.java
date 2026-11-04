package com.pc_builder_store.catalog.exception;

public class CatalogProductNotFoundException extends RuntimeException {

    public CatalogProductNotFoundException() {
        super("The requested product was not found.");
    }
}
