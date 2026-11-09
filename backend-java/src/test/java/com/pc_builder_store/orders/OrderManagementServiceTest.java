package com.pc_builder_store.orders;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.pc_builder_store.auth.AuthUserPrincipal;
import com.pc_builder_store.orders.OrderDtos.FulfillmentStatus;
import com.pc_builder_store.orders.OrderDtos.CheckoutItem;
import com.pc_builder_store.orders.OrderDtos.CheckoutRequest;
import com.pc_builder_store.orders.OrderDtos.OrderDetail;
import com.pc_builder_store.orders.OrderDtos.StatusUpdateRequest;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import com.pc_builder_store.orders.PaymentGateway;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.ConnectionCallback;

@ExtendWith(MockitoExtension.class)
class OrderManagementServiceTest {

    @Mock
    private JdbcTemplate jdbc;
    @Mock
    private PaymentGateway paymentGateway;

    @Test
    void excludesDemoOffersWhenCreatingAnOrder() {
        doReturn(null).when(jdbc).execute(any(ConnectionCallback.class));
        when(jdbc.queryForList(contains("\"idempotency_key\" = ?"), eq("checkout-1")))
                .thenReturn(List.of());
        when(jdbc.queryForList(contains("CAST(? AS NUMERIC)"), eq("42")))
                .thenReturn(List.of());

        OrderManagementService service = new OrderManagementService(jdbc, paymentGateway);
        CheckoutRequest request = new CheckoutRequest(
                "Customer", "555-0100", "Address", null, null, "COD",
                List.of(new CheckoutItem("42", 1)));
        AuthUserPrincipal customer = new AuthUserPrincipal(
                "1", "Customer", "customer@example.test", "", "CUSTOMER", "IT", "ACTIVE");

        OrderManagementException error = assertThrows(
                OrderManagementException.class,
                () -> service.createOrder(request, "checkout-1", customer));

        assertEquals(HttpStatus.CONFLICT, error.status());
        verify(jdbc).queryForList(argThat(sql ->
                        sql.contains("po.\"offer_status\" = 'ACTIVE'")
                                && sql.contains("p.\"product_status\" = 'ACTIVE'")
                                && !sql.contains("po.\"offer_code\" NOT LIKE 'DEMO-%'")),
                eq("42"));
    }

    @Test
    void guestOrderLookupUsesDeterministicCollationForPhoneNormalization() {
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of());
        OrderManagementService service = new OrderManagementService(jdbc, paymentGateway);

        OrderManagementException error = assertThrows(
                OrderManagementException.class,
                () -> service.lookupGuestOrder("ORD-GUEST", "(555) 0100"));

        assertEquals(HttpStatus.NOT_FOUND, error.status());
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), any(Object[].class));
        assertTrue(sql.getValue().contains("COALESCE(\"customer_phone\", '') COLLATE \"C\""));
    }

    @Test
    void rejectsMarkingOrderDeliveredBeforeShipping() {
        when(jdbc.queryForList(
                org.mockito.ArgumentMatchers.contains("FOR UPDATE"),
                org.mockito.ArgumentMatchers.eq("ORD-1")))
                .thenReturn(List.of(Map.of(
                        "order_id", 1L,
                        "order_status", "PENDING_CONFIRMATION")));
        OrderManagementService service = new OrderManagementService(jdbc, paymentGateway);

        OrderManagementException error = assertThrows(
                OrderManagementException.class,
                () -> service.updateStatus(
                        "ORD-1",
                        new StatusUpdateRequest(FulfillmentStatus.DELIVERED, "skip"),
                        admin()));

        assertEquals(HttpStatus.CONFLICT, error.status());
        verify(jdbc).queryForList(
                org.mockito.ArgumentMatchers.contains("FOR UPDATE"),
                org.mockito.ArgumentMatchers.eq("ORD-1"));
        verifyNoMoreInteractions(jdbc);
    }

    @Test
    void preventsCustomerCancellationOfAnotherUsersOrder() {
        when(jdbc.queryForList(
                org.mockito.ArgumentMatchers.contains("FOR UPDATE"),
                org.mockito.ArgumentMatchers.eq("ORD-2")))
                .thenReturn(List.of(Map.of(
                        "order_id", 2L,
                        "user_id", 22L,
                        "order_status", "PENDING_CONFIRMATION")));
        OrderManagementService service = new OrderManagementService(jdbc, paymentGateway);
        AuthUserPrincipal customer = new AuthUserPrincipal(
                "11", "Customer", "customer@example.test", "", "CUSTOMER", "IT", "ACTIVE");

        OrderManagementException error = assertThrows(
                OrderManagementException.class,
                () -> service.requestCancellation("ORD-2", "No longer needed", customer));

        assertEquals(HttpStatus.NOT_FOUND, error.status());
        verify(jdbc).queryForList(
                org.mockito.ArgumentMatchers.contains("FOR UPDATE"),
                org.mockito.ArgumentMatchers.eq("ORD-2"));
        verifyNoMoreInteractions(jdbc);
    }

    @Test
    void retriesFailedRefundAndPersistsTheIdempotentAttempt() {
        when(jdbc.queryForList(contains("FOR UPDATE"), eq("ORD-3")))
                .thenReturn(List.of(Map.of(
                        "order_id", 3L,
                        "order_number", "ORD-3",
                        "order_status", "CANCELLED")));
        when(jdbc.queryForList(contains("\"idempotency_key\" = ?"), eq(3L), eq("retry-1")))
                .thenReturn(List.of());
        when(jdbc.queryForList(
                contains("AS \"has_succeeded\""),
                eq(3L), eq(3L), eq(3L)))
                .thenReturn(List.of(Map.of(
                        "refund_status", "FAILED",
                        "amount", new BigDecimal("125.00"),
                        "currency_code", "VND",
                        "has_succeeded", false,
                        "has_pending", false)));
        when(paymentGateway.refund(new BigDecimal("125.00"), "VND", "retry-1"))
                .thenReturn(new PaymentGateway.PaymentResult("SIMULATED", "SUCCEEDED", "REF-2"));
        stubOrderDetail("ORD-3", "REFUNDED", false);

        OrderManagementService service = new OrderManagementService(jdbc, paymentGateway);
        OrderDetail result = service.retryFailedRefund("ORD-3", "retry-1", "recovered", admin());

        assertEquals("REFUNDED", result.order().paymentStatus());
        assertEquals(false, result.refundRetryAvailable());
        verify(paymentGateway).refund(new BigDecimal("125.00"), "VND", "retry-1");
        verify(jdbc).update(
                contains("INSERT INTO \"order_refund_transactions\""),
                eq(3L), eq("retry-1"), eq("SIMULATED"), eq("SUCCEEDED"),
                eq(new BigDecimal("125.00")), eq("VND"), eq("REF-2"));
        verify(jdbc).update(
                contains("INSERT INTO \"order_status_history\""),
                eq(3L), eq("CANCELLED"), eq("CANCELLED"), eq("ADMIN_REFUND_RETRIED"),
                eq(1L), eq("Admin"), eq("ADMIN"), eq("recovered"));
    }

    @Test
    void repeatedRefundRetryKeyDoesNotCallTheGatewayAgain() {
        when(jdbc.queryForList(contains("FOR UPDATE"), eq("ORD-4")))
                .thenReturn(List.of(Map.of(
                        "order_id", 4L,
                        "order_number", "ORD-4",
                        "order_status", "CANCELLED")));
        when(jdbc.queryForList(contains("\"idempotency_key\" = ?"), eq(4L), eq("retry-4")))
                .thenReturn(List.of(Map.of("refund_status", "FAILED")));
        stubOrderDetail("ORD-4", "REFUND_FAILED", true);

        OrderManagementService service = new OrderManagementService(jdbc, paymentGateway);
        service.retryFailedRefund("ORD-4", "retry-4", "retry", admin());

        verifyNoInteractions(paymentGateway);
        verify(jdbc, org.mockito.Mockito.never())
                .update(contains("INSERT INTO \"order_refund_transactions\""), any(Object[].class));
    }

    @Test
    void rejectsAnotherRefundAfterARefundHasSucceeded() {
        when(jdbc.queryForList(contains("FOR UPDATE"), eq("ORD-5")))
                .thenReturn(List.of(Map.of(
                        "order_id", 5L,
                        "order_number", "ORD-5",
                        "order_status", "CANCELLED")));
        when(jdbc.queryForList(contains("\"idempotency_key\" = ?"), eq(5L), eq("retry-5")))
                .thenReturn(List.of());
        when(jdbc.queryForList(
                contains("AS \"has_succeeded\""),
                eq(5L), eq(5L), eq(5L)))
                .thenReturn(List.of(Map.of(
                        "refund_status", "FAILED",
                        "amount", new BigDecimal("125.00"),
                        "currency_code", "VND",
                        "has_succeeded", true,
                        "has_pending", false)));

        OrderManagementService service = new OrderManagementService(jdbc, paymentGateway);
        OrderManagementException error = assertThrows(
                OrderManagementException.class,
                () -> service.retryFailedRefund("ORD-5", "retry-5", "duplicate", admin()));

        assertEquals(HttpStatus.CONFLICT, error.status());
        verifyNoInteractions(paymentGateway);
    }

    private void stubOrderDetail(String orderNumber, String paymentStatus, boolean retryAvailable) {
        Map<String, Object> detail = new HashMap<>();
        detail.put("order_id", 3L);
        detail.put("order_number", orderNumber);
        detail.put("user_id", 1L);
        detail.put("customer_name", "Customer");
        detail.put("customer_email", "customer@example.test");
        detail.put("customer_phone", "");
        detail.put("shipping_address", "Address");
        detail.put("shipping_region", "");
        detail.put("shipping_postal_code", "");
        detail.put("order_status", "CANCELLED");
        detail.put("payment_method", "SIMULATED_ONLINE");
        detail.put("payment_status", paymentStatus);
        detail.put("shipment_status", "CANCELLED");
        detail.put("shipping_carrier", "");
        detail.put("tracking_number", "");
        detail.put("subtotal", new BigDecimal("125.00"));
        detail.put("shipping_fee", BigDecimal.ZERO);
        detail.put("discount_amount", BigDecimal.ZERO);
        detail.put("currency_code", "VND");
        detail.put("show_financials", true);
        detail.put("refund_retry_available", retryAvailable);
        detail.put("total_amount", new BigDecimal("125.00"));
        detail.put("placed_at_text", "2026-01-01");
        detail.put("updated_at_text", "2026-01-01");
        when(jdbc.queryForList(contains("AS \"refund_retry_available\""), eq(orderNumber)))
                .thenReturn(List.of(detail));
        doReturn(List.of()).when(jdbc).query(
                anyString(), any(RowMapper.class), any(Object[].class));
    }

    private AuthUserPrincipal admin() {
        return new AuthUserPrincipal(
                "1", "Admin", "admin@example.test", "", "ADMIN", "UNSPECIFIED", "ACTIVE");
    }
}
