package com.pc_builder_store.auth;

import com.pc_builder_store.auth.AuthUserRepository.AccountState;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Short-lived cache of account role/status so sessions pick up admin changes without a database
 * read on every request. Admin actions evict the entry, so their effect is immediate.
 */
@Component
public class AccountStateCache {

    private static final Duration TTL = Duration.ofSeconds(10);

    private record Entry(AccountState state, long loadedAt) {}

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();
    private final AuthUserRepository users;

    public AccountStateCache(AuthUserRepository users) {
        this.users = users;
    }

    public AccountState get(String userId) {
        long now = System.nanoTime();
        Entry entry = entries.get(userId);
        if (entry != null && now - entry.loadedAt() < TTL.toNanos()) return entry.state();
        AccountState state = users.currentState(userId);
        if (state != null) entries.put(userId, new Entry(state, now));
        return state;
    }

    public void evict(String userId) {
        entries.remove(userId);
    }
}
