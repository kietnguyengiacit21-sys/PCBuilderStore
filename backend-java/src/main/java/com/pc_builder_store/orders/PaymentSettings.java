package com.pc_builder_store.orders;

import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Which payment methods the shop offers.
 *
 * <ul>
 *   <li>COD is always available.</li>
 *   <li>BANK_TRANSFER is offered once the shop's account is configured (APP_PAYMENT_BANK_*); staff mark
 *       the order paid after seeing the money arrive.</li>
 *   <li>SIMULATED_ONLINE marks orders paid without any money moving, so it is off unless explicitly
 *       enabled for demos and tests (orders.simulated-payment.enabled=true).</li>
 * </ul>
 */
@Component
public class PaymentSettings {

    public static final String COD = "COD";
    public static final String BANK_TRANSFER = "BANK_TRANSFER";
    public static final String SIMULATED_ONLINE = "SIMULATED_ONLINE";

    /** Bank details shown to the customer; {@code bankBin} is the NAPAS bank code used by VietQR. */
    public record BankAccount(String bankBin, String bankName, String accountNumber, String accountName) {}

    private final boolean simulatedOnlineEnabled;
    private final BankAccount bankAccount;

    @Autowired
    public PaymentSettings(
            @Value("${orders.simulated-payment.enabled:false}") boolean simulatedOnlineEnabled,
            @Value("${app.payment.bank.bin:}") String bankBin,
            @Value("${app.payment.bank.name:}") String bankName,
            @Value("${app.payment.bank.account-number:}") String accountNumber,
            @Value("${app.payment.bank.account-name:}") String accountName) {
        this.simulatedOnlineEnabled = simulatedOnlineEnabled;
        boolean configured = StringUtils.hasText(bankBin) && bankBin.trim().matches("[0-9]{6}")
                && StringUtils.hasText(accountNumber) && accountNumber.trim().matches("[0-9A-Za-z]{4,30}")
                && StringUtils.hasText(accountName);
        this.bankAccount = configured
                ? new BankAccount(bankBin.trim(), StringUtils.hasText(bankName) ? bankName.trim() : "",
                        accountNumber.trim(), accountName.trim().toUpperCase(java.util.Locale.ROOT))
                : null;
    }

    /** Settings for unit tests built without Spring: simulated payment on, no bank account. */
    public static PaymentSettings forTests() {
        return new PaymentSettings(true, "", "", "", "");
    }

    public boolean simulatedOnlineEnabled() {
        return simulatedOnlineEnabled;
    }

    public BankAccount bankAccount() {
        return bankAccount;
    }

    public List<String> availableMethods() {
        List<String> methods = new ArrayList<>(List.of(COD));
        if (bankAccount != null) methods.add(BANK_TRANSFER);
        if (simulatedOnlineEnabled) methods.add(SIMULATED_ONLINE);
        return List.copyOf(methods);
    }

    public boolean accepts(String method) {
        return availableMethods().contains(method);
    }
}
