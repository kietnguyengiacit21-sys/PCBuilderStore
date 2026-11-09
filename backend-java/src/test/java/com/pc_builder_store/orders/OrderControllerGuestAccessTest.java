package com.pc_builder_store.orders;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.pc_builder_store.cart.GuestCartTokenService;
import com.pc_builder_store.orders.OrderDtos.GuestPaymentRequest;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

class OrderControllerGuestAccessTest {

    @Test
    void rateLimitsGuestPaymentAttemptsBeforeCallingTheService() {
        OrderManagementService service = mock(OrderManagementService.class);
        GuestOrderLookupRateLimiter limiter = new GuestOrderLookupRateLimiter(
                Clock.fixed(Instant.parse("2026-11-08T00:00:00Z"), ZoneOffset.UTC));
        OrderController controller = new OrderController(
                service, new GuestCartTokenService(false), limiter);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.0.2.10");

        for (int attempt = 0; attempt < 10; attempt++) {
            limiter.allow(request.getRemoteAddr());
        }

        OrderManagementException exception = assertThrows(
                OrderManagementException.class,
                () -> controller.processGuestPayment(
                        "ORDER-123", "payment-key",
                        new GuestPaymentRequest("555-0100"), request));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, exception.status());
        verify(service, never()).processGuestPayment(
                "ORDER-123", "payment-key", "555-0100");
    }
}
