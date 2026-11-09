package com.pc_builder_store.orders;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class GuestOrderLookupRateLimiterTest {

    @Test
    void limitsAttemptsPerClientAndAllowsIndependentClients() {
        GuestOrderLookupRateLimiter limiter = new GuestOrderLookupRateLimiter(
                Clock.fixed(Instant.parse("2026-11-08T00:00:00Z"), ZoneOffset.UTC));

        assertFalse(limiter.allow(null));
        assertFalse(limiter.allow(" "));
        for (int attempt = 0; attempt < 10; attempt++) {
            assertTrue(limiter.allow("client-a"));
        }
        assertFalse(limiter.allow("client-a"));
        assertTrue(limiter.allow("client-b"));
    }
}
