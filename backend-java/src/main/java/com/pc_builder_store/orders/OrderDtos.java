package com.pc_builder_store.orders;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Email;
import java.math.BigDecimal;
import java.util.List;

public final class OrderDtos {

    private OrderDtos() {}

    public enum FulfillmentStatus {
        PENDING_CONFIRMATION,
        CONFIRMED,
        PROCESSING,
        READY_TO_SHIP,
        SHIPPING,
        DELIVERED,
        CANCELLATION_REQUESTED,
        CANCELLED
    }

    public record OrderSummary(
            String orderNumber,
            String customerName,
            String customerEmail,
            String customerPhone,
            FulfillmentStatus status,
            String paymentMethod,
            String paymentStatus,
            String shipmentStatus,
            String shippingCarrier,
            String trackingNumber,
            String currencyCode,
            boolean showFinancials,
            BigDecimal total,
            String placedAt,
            String updatedAt) {}

    public record OrderItem(
            String productName,
            String condition,
            int quantity,
            String currencyCode,
            BigDecimal unitPrice,
            BigDecimal lineTotal) {}

    public record StatusHistory(
            String previousStatus,
            String newStatus,
            String action,
            String actorName,
            String actorRole,
            String note,
            String createdAt) {}

    public record OrderDetail(
            OrderSummary order,
            String shippingAddress,
            String shippingRegion,
            String shippingPostalCode,
            BigDecimal subtotal,
            BigDecimal shippingFee,
            BigDecimal discountAmount,
            List<OrderItem> items,
            List<StatusHistory> statusHistory,
            boolean refundRetryAvailable) {}

    public record StatusUpdateRequest(
            FulfillmentStatus status,
            @Size(max = 2000) String note) {}

    public record CancellationDecisionRequest(
            boolean approve,
            @Size(max = 2000) String note) {}

    public record RefundRetryRequest(@Size(max = 2000) String note) {}

    public record CancellationRequest(
            @NotBlank @Size(max = 2000) String reason) {}

    public record ShippingUpdateRequest(
            @Size(max = 100) String carrier,
            @Size(max = 180) String trackingNumber,
            @Size(max = 2000) String note) {}

    public record CheckoutRequest(
            @NotBlank @Size(max = 160) String customerName,
            @NotBlank @Size(max = 40) String customerPhone,
            @NotBlank @Size(max = 2000) String shippingAddress,
            @Size(max = 160) String shippingRegion,
            @Size(max = 30) String shippingPostalCode,
            @NotBlank String paymentMethod,
            @NotEmpty @Size(max = 50) List<@Valid CheckoutItem> items) {}

    public record GuestCheckoutRequest(
            @NotBlank @Size(max = 160) String customerName,
            @NotBlank @Email @Size(max = 254) String customerEmail,
            @NotBlank @Size(max = 40) String customerPhone,
            @NotBlank @Size(max = 2000) String shippingAddress,
            @Size(max = 160) String shippingRegion,
            @Size(max = 30) String shippingPostalCode,
            @NotBlank String paymentMethod,
            @NotEmpty @Size(max = 50) List<@Valid CheckoutItem> items) {
        public CheckoutRequest toCheckoutRequest() {
            return new CheckoutRequest(
                    customerName, customerPhone, shippingAddress, shippingRegion,
                    shippingPostalCode, paymentMethod, items);
        }
    }

    public record GuestOrderLookupRequest(
            @NotBlank @Size(max = 100) String orderNumber,
            @NotBlank @Size(max = 40) String customerPhone) {}

    public record GuestPaymentRequest(
            @NotBlank @Size(max = 40) String customerPhone) {}

    public record CheckoutItem(
            @NotBlank @Size(max = 20) String offerId,
            @Min(1) @Max(100) int quantity) {}
}
