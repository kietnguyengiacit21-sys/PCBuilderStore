package com.pc_builder_store.orders;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class SimulatedPaymentGatewayTest {

    @Test
    void returnsConfiguredOutcomeWithUniqueProviderReferences() {
        SimulatedPaymentGateway gateway = new SimulatedPaymentGateway("succeeded");

        PaymentGateway.PaymentResult first = gateway.charge(
                new BigDecimal("125.00"), "VND", "attempt-1");
        PaymentGateway.PaymentResult second = gateway.refund(
                new BigDecimal("125.00"), "VND", "refund-1");

        assertEquals("SUCCEEDED", first.outcomeCode());
        assertEquals("SIMULATED", first.providerCode());
        assertNotEquals(first.reference(), second.reference());
    }

    @Test
    void rejectsUnsupportedConfiguredOutcomes() {
        assertThrows(IllegalArgumentException.class,
                () -> new SimulatedPaymentGateway("LIVE"));
    }
}
