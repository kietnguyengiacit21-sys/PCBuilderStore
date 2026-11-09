package com.pc_builder_store.orders;

import java.time.Clock;
import java.time.Duration;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class GuestOrderLookupRateLimiter {

    private static final int MAX_ATTEMPTS = 10;
    private static final int MAX_TRACKED_CLIENTS = 10_000;
    private static final long WINDOW_MILLIS = Duration.ofMinutes(10).toMillis();

    private final Clock clock;
    private final LinkedHashMap<String, Window> clients = new LinkedHashMap<>(16, 0.75f, true);

    public GuestOrderLookupRateLimiter() {
        this(Clock.systemUTC());
    }

    GuestOrderLookupRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public synchronized boolean allow(String clientKey) {
        if (clientKey == null || clientKey.isBlank()) return false;
        long now = clock.millis();
        Window window = clients.get(clientKey);
        if (window == null || now - window.startedAt() >= WINDOW_MILLIS) {
            clients.put(clientKey, new Window(now, 1));
            prune(now);
            return true;
        }
        if (window.attempts() >= MAX_ATTEMPTS) return false;
        clients.put(clientKey, new Window(window.startedAt(), window.attempts() + 1));
        return true;
    }

    private void prune(long now) {
        Iterator<Map.Entry<String, Window>> iterator = clients.entrySet().iterator();
        while (iterator.hasNext()) {
            if (now - iterator.next().getValue().startedAt() >= WINDOW_MILLIS) iterator.remove();
        }
        while (clients.size() > MAX_TRACKED_CLIENTS) {
            clients.remove(clients.keySet().iterator().next());
        }
    }

    private record Window(long startedAt, int attempts) {}
}
