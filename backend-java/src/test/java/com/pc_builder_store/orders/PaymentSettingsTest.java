package com.pc_builder_store.orders;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;

import com.pc_builder_store.auth.AuthUserPrincipal;
import com.pc_builder_store.orders.OrderDtos.CheckoutItem;
import com.pc_builder_store.orders.OrderDtos.CheckoutRequest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class PaymentSettingsTest {

    @Mock
    private JdbcTemplate jdbc;
    @Mock
    private PaymentGateway paymentGateway;

    private static final AuthUserPrincipal CUSTOMER = new AuthUserPrincipal(
            "1", "Customer", "customer@example.test", "", "CUSTOMER", "IT", "ACTIVE");

    @Test
    void offersOnlyCashOnDeliveryByDefault() {
        PaymentSettings settings = new PaymentSettings(false, "", "", "", "");

        assertEquals(List.of("COD"), settings.availableMethods());
        assertNull(settings.bankAccount());
        assertFalse(settings.accepts("SIMULATED_ONLINE"));
        assertFalse(settings.accepts("BANK_TRANSFER"));
    }

    @Test
    void offersBankTransferOnceTheAccountIsConfigured() {
        PaymentSettings settings = new PaymentSettings(
                false, "970436", "Vietcombank", "0123456789", "Cong ty PC Builder");

        assertTrue(settings.accepts("BANK_TRANSFER"));
        assertEquals("CONG TY PC BUILDER", settings.bankAccount().accountName());
        assertEquals(List.of("COD", "BANK_TRANSFER"), settings.availableMethods());
    }

    @Test
    void ignoresAnIncompleteOrMalformedBankAccount() {
        assertNull(new PaymentSettings(false, "VCB", "Vietcombank", "0123456789", "A").bankAccount());
        assertNull(new PaymentSettings(false, "970436", "Vietcombank", "", "A").bankAccount());
        assertNull(new PaymentSettings(false, "970436", "Vietcombank", "0123456789", " ").bankAccount());
    }

    @Test
    void rejectsSimulatedCheckoutWhenTheSimulatorIsOff() {
        OrderManagementService service = new OrderManagementService(
                jdbc, paymentGateway, new PaymentSettings(false, "", "", "", ""));
        CheckoutRequest request = new CheckoutRequest(
                "Customer", "0900000000", "Address", null, null, "SIMULATED_ONLINE",
                List.of(new CheckoutItem("42", 1)));

        OrderManagementException exception = assertThrows(OrderManagementException.class,
                () -> service.createOrder(request, "checkout-1", CUSTOMER));

        assertEquals(HttpStatus.BAD_REQUEST, exception.status());
        verifyNoInteractions(jdbc);
    }

    @Test
    void refusesToFakeAPaymentWhenTheSimulatorIsOff() {
        OrderManagementService service = new OrderManagementService(
                jdbc, paymentGateway, new PaymentSettings(false, "", "", "", ""));

        OrderManagementException exception = assertThrows(OrderManagementException.class,
                () -> service.processSimulatedPayment("PC261122-ABCDE", "pay-1", CUSTOMER));

        assertEquals(HttpStatus.CONFLICT, exception.status());
        verifyNoInteractions(jdbc, paymentGateway);
    }
}
