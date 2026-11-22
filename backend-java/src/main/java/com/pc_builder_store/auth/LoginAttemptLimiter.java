package com.pc_builder_store.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * In-memory brute-force protection for login and other unauthenticated account endpoints.
 * Single-instance only; a multi-node deployment would need a shared store.
 */
@Component
public class LoginAttemptLimiter {

    static final int MAX_FAILURES_PER_EMAIL = 5;
    static final int MAX_FAILURES_PER_IP = 20;
    static final Duration WINDOW = Duration.ofMinutes(15);

    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
    private final Map<String, Deque<Instant>> actions = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginAttemptLimiter() {
        this(Clock.systemUTC());
    }

    LoginAttemptLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Rejects the attempt while the email or the client address has too many recent failures. */
    public void checkLogin(String email, String clientIp) {
        Instant now = clock.instant();
        long emailBlocked = blockedFor(failures, "email:" + normalize(email), MAX_FAILURES_PER_EMAIL, now);
        long ipBlocked = blockedFor(failures, "ip:" + clientIp, MAX_FAILURES_PER_IP, now);
        long seconds = Math.max(emailBlocked, ipBlocked);
        if (seconds > 0) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau " + Math.max(1, (seconds + 59) / 60) + " phút.");
        }
    }

    public void recordFailure(String email, String clientIp) {
        Instant now = clock.instant();
        record(failures, "email:" + normalize(email), now);
        record(failures, "ip:" + clientIp, now);
    }

    public void recordSuccess(String email) {
        failures.remove("email:" + normalize(email));
    }

    /** Generic rate limit (e.g. sign-ups or reset emails): at most {@code limit} actions per window. */
    public void checkAction(String key, int limit, Duration window, String message) {
        Instant now = clock.instant();
        Deque<Instant> times = actions.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst().isBefore(now.minus(window))) times.pollFirst();
            if (times.size() >= limit) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, message);
            times.addLast(now);
        }
    }

    private long blockedFor(Map<String, Deque<Instant>> store, String key, int limit, Instant now) {
        Deque<Instant> times = store.get(key);
        if (times == null) return 0;
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst().isBefore(now.minus(WINDOW))) times.pollFirst();
            if (times.size() < limit) return 0;
            // Blocked until the oldest failure in the window expires.
            return Duration.between(now, times.peekFirst().plus(WINDOW)).toSeconds();
        }
    }

    private void record(Map<String, Deque<Instant>> store, String key, Instant now) {
        Deque<Instant> times = store.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (times) {
            times.addLast(now);
            while (times.size() > 100) times.pollFirst();
        }
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
