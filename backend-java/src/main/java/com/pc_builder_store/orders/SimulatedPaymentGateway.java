package com.pc_builder_store.orders;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SimulatedPaymentGateway implements PaymentGateway {

    private static final Set<String> OUTCOMES = Set.of("SUCCEEDED", "FAILED", "PENDING", "CANCELLED");
    private final String outcome;

    public SimulatedPaymentGateway(
            @Value("${orders.simulated-payment.outcome:SUCCEEDED}") String outcome) {
        this.outcome = outcome.trim().toUpperCase(Locale.ROOT);
        if (!OUTCOMES.contains(this.outcome)) {
            throw new IllegalArgumentException("Unsupported simulated payment outcome.");
        }
    }

    @Override
    public PaymentResult charge(BigDecimal amount, String currency, String idempotencyKey) {
        return result();
    }

    @Override
    public PaymentResult refund(BigDecimal amount, String currency, String idempotencyKey) {
        return result();
    }

    private PaymentResult result() {
        return new PaymentResult("SIMULATED", outcome, "SIM-" + UUID.randomUUID());
    }
}
