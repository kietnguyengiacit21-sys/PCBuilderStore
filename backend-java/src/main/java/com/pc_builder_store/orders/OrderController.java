package com.pc_builder_store.orders;

import com.pc_builder_store.auth.AuthUserPrincipal;
import com.pc_builder_store.cart.GuestCartTokenService;
import com.pc_builder_store.orders.OrderDtos.CancellationDecisionRequest;
import com.pc_builder_store.orders.OrderDtos.CancellationRequest;
import com.pc_builder_store.orders.OrderDtos.CheckoutRequest;
import com.pc_builder_store.orders.OrderDtos.GuestCheckoutRequest;
import com.pc_builder_store.orders.OrderDtos.GuestOrderLookupRequest;
import com.pc_builder_store.orders.OrderDtos.GuestPaymentRequest;
import com.pc_builder_store.orders.OrderDtos.OrderDetail;
import com.pc_builder_store.orders.OrderDtos.OrderSummary;
import com.pc_builder_store.orders.OrderDtos.RefundRetryRequest;
import com.pc_builder_store.orders.OrderDtos.ShippingUpdateRequest;
import com.pc_builder_store.orders.OrderDtos.StatusUpdateRequest;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final String GUEST_ORDER_RATE_LIMIT_MESSAGE =
            "Too many guest order attempts. Please try again later.";

    private final OrderManagementService service;
    private final GuestCartTokenService guestCartTokens;
    private final GuestOrderLookupRateLimiter guestLookupRateLimiter;

    @Autowired
    public OrderController(
            OrderManagementService service,
            GuestCartTokenService guestCartTokens,
            GuestOrderLookupRateLimiter guestLookupRateLimiter) {
        this.service = service;
        this.guestCartTokens = guestCartTokens;
        this.guestLookupRateLimiter = guestLookupRateLimiter;
    }

    public OrderController(OrderManagementService service) {
        this(service, null, new GuestOrderLookupRateLimiter());
    }

    @PostMapping("/guest")
    public OrderDetail createGuestOrder(
            @Valid @RequestBody GuestCheckoutRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            HttpServletRequest servletRequest) {
        String guestToken = guestCartTokens.tokenFrom(servletRequest);
        if (!StringUtils.hasText(guestToken)) {
            throw new OrderManagementException(HttpStatus.BAD_REQUEST,
                    "A valid guest cart token is required.");
        }
        return service.createGuestOrder(
                request, idempotencyKey, guestCartTokens.hash(guestToken));
    }

    @PostMapping("/guest/lookup")
    public OrderDetail lookupGuestOrder(
            @Valid @RequestBody GuestOrderLookupRequest request,
            HttpServletRequest servletRequest) {
        if (!guestLookupRateLimiter.allow(servletRequest.getRemoteAddr())) {
            throw new OrderManagementException(HttpStatus.TOO_MANY_REQUESTS,
                    GUEST_ORDER_RATE_LIMIT_MESSAGE);
        }
        return service.lookupGuestOrder(request.orderNumber(), request.customerPhone());
    }

    @PostMapping("/guest/{orderNumber}/payments")
    public OrderDetail processGuestPayment(
            @PathVariable String orderNumber,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody GuestPaymentRequest request,
            HttpServletRequest servletRequest) {
        if (!guestLookupRateLimiter.allow(servletRequest.getRemoteAddr())) {
            throw new OrderManagementException(HttpStatus.TOO_MANY_REQUESTS,
                    GUEST_ORDER_RATE_LIMIT_MESSAGE);
        }
        return service.processGuestPayment(
                orderNumber, idempotencyKey, request.customerPhone());
    }

    @GetMapping("/admin")
    public List<OrderSummary> listAdminOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) String q) {
        return service.listAdminOrders(status, paymentStatus, q);
    }

    @GetMapping("/admin/{orderNumber}")
    public OrderDetail getAdminOrder(@PathVariable String orderNumber) {
        return service.getAdminOrder(orderNumber);
    }

    @PatchMapping("/admin/{orderNumber}/status")
    public OrderDetail updateStatus(
            @PathVariable String orderNumber,
            @Valid @RequestBody StatusUpdateRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.updateStatus(orderNumber, request, actor);
    }

    @PatchMapping("/admin/{orderNumber}/shipping")
    public OrderDetail updateShipping(
            @PathVariable String orderNumber,
            @Valid @RequestBody ShippingUpdateRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.updateShipping(orderNumber, request, actor);
    }

    @PatchMapping("/admin/{orderNumber}/cancellation-decision")
    public OrderDetail decideCancellation(
            @PathVariable String orderNumber,
            @Valid @RequestBody CancellationDecisionRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.decideCancellation(orderNumber, request, actor);
    }

    @PostMapping("/admin/{orderNumber}/refund-retries")
    public OrderDetail retryFailedRefund(
            @PathVariable String orderNumber,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody RefundRetryRequest request,
            @AuthenticationPrincipal AuthUserPrincipal actor) {
        return service.retryFailedRefund(orderNumber, idempotencyKey, request.note(), actor);
    }

    @GetMapping
    public List<OrderSummary> listCustomerOrders(
            @AuthenticationPrincipal AuthUserPrincipal customer) {
        return service.listCustomerOrders(customer.userId());
    }

    @PostMapping
    public OrderDetail createOrder(
            @Valid @RequestBody CheckoutRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @AuthenticationPrincipal AuthUserPrincipal customer) {
        return service.createOrder(request, idempotencyKey, customer);
    }

    @GetMapping("/{orderNumber}")
    public OrderDetail getCustomerOrder(
            @PathVariable String orderNumber,
            @AuthenticationPrincipal AuthUserPrincipal customer) {
        return service.getCustomerOrder(orderNumber, customer.userId());
    }

    @PostMapping("/{orderNumber}/payments")
    public OrderDetail processPayment(
            @PathVariable String orderNumber,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @AuthenticationPrincipal AuthUserPrincipal customer) {
        return service.processSimulatedPayment(orderNumber, idempotencyKey, customer);
    }

    @PostMapping("/{orderNumber}/cancellation-requests")
    public OrderDetail requestCancellation(
            @PathVariable String orderNumber,
            @Valid @RequestBody CancellationRequest request,
            @AuthenticationPrincipal AuthUserPrincipal customer) {
        return service.requestCancellation(orderNumber, request.reason(), customer);
    }
}
