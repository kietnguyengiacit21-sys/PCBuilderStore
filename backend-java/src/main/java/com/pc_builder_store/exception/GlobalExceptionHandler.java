package com.pc_builder_store.exception;

import com.pc_builder_store.catalog.exception.CatalogProductNotFoundException;
import com.pc_builder_store.catalog.exception.InvalidCatalogQueryException;
import com.pc_builder_store.auth.StaffAccountException;
import com.pc_builder_store.cart.CartException;
import com.pc_builder_store.orders.OrderManagementException;
import com.pc_builder_store.common.ApiErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;

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

    @ExceptionHandler(OrderManagementException.class)
    public ResponseEntity<ApiErrorResponse> handleOrderManagement(
            OrderManagementException exception) {
        return ResponseEntity.status(exception.status())
                .body(ApiErrorResponse.of("ORDER_OPERATION_FAILED", exception.getMessage()));
    }

    @ExceptionHandler(StaffAccountException.class)
    public ResponseEntity<ApiErrorResponse> handleStaffAccount(StaffAccountException exception) {
        return ResponseEntity.status(exception.status())
                .body(ApiErrorResponse.of("STAFF_ACCOUNT_OPERATION_FAILED", exception.getMessage()));
    }

    @ExceptionHandler(CartException.class)
    public ResponseEntity<ApiErrorResponse> handleCart(CartException exception) {
        return ResponseEntity.status(exception.status())
                .body(ApiErrorResponse.of("CART_OPERATION_FAILED", exception.getMessage()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(ResponseStatusException exception) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        String message = exception.getReason() == null ? "Yêu cầu không hợp lệ." : exception.getReason();
        return ResponseEntity.status(status)
                .body(ApiErrorResponse.of("REQUEST_FAILED", message));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataConflict(DataIntegrityViolationException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(
                        "DATA_CONFLICT", "Dữ liệu bị trùng hoặc không thể cập nhật do có liên kết đang sử dụng."));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidRequest(MethodArgumentNotValidException exception) {
        return ResponseEntity.badRequest()
                .body(ApiErrorResponse.of("INVALID_REQUEST", "Thông tin yêu cầu không hợp lệ."));
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
