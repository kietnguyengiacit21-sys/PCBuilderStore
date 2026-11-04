package com.pc_builder_store.exception;

import com.pc_builder_store.catalog.exception.CatalogProductNotFoundException;
import com.pc_builder_store.catalog.exception.InvalidCatalogQueryException;
import com.pc_builder_store.common.ApiErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DatabaseUnavailableException.class)
    public ResponseEntity<ApiErrorResponse> handleDatabaseUnavailable(
            DatabaseUnavailableException exception) {
        logger.warn("Database health check failed");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiErrorResponse.of("DATABASE_UNAVAILABLE", "Database is unavailable."));
    }

    @ExceptionHandler(InvalidCatalogQueryException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidCatalogQuery(
            InvalidCatalogQueryException exception) {
        return ResponseEntity.badRequest()
                .body(ApiErrorResponse.of("INVALID_CATALOG_QUERY", exception.getMessage()));
    }

    @ExceptionHandler(CatalogProductNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleCatalogProductNotFound(
            CatalogProductNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiErrorResponse.of("PRODUCT_NOT_FOUND", exception.getMessage()));
    }

    @ExceptionHandler(DataAccessResourceFailureException.class)
    public ResponseEntity<ApiErrorResponse> handleDatabaseError(
            DataAccessResourceFailureException exception) {
        logger.warn("Catalog database operation failed");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiErrorResponse.of("DATABASE_UNAVAILABLE", "Database is unavailable."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpectedException(Exception exception) {
        logger.error("Request failed", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiErrorResponse.of("INTERNAL_SERVER_ERROR", "An unexpected error occurred."));
    }
}
