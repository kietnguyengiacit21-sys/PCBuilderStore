package com.pc_builder_store.orders;

import java.math.BigDecimal;

public interface PaymentGateway {

    PaymentResult charge(BigDecimal amount, String currency, String idempotencyKey);

    PaymentResult refund(BigDecimal amount, String currency, String idempotencyKey);

    record PaymentResult(String providerCode, String outcomeCode, String reference) {}
}
