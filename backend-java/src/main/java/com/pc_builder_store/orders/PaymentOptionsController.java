package com.pc_builder_store.orders;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public: which payment methods checkout may offer and the shop's bank details for transfers. */
@RestController
public class PaymentOptionsController {

    public record PaymentOptions(List<String> methods, PaymentSettings.BankAccount bankTransfer) {}

    private final PaymentSettings settings;

    public PaymentOptionsController(PaymentSettings settings) {
        this.settings = settings;
    }

    @GetMapping("/api/storefront/payment-options")
    public PaymentOptions paymentOptions() {
        return new PaymentOptions(settings.availableMethods(), settings.bankAccount());
    }
}
