package com.pc_builder_store.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class UsernameRulesTest {

    @Test
    void normalisesValidUsernames() {
        assertEquals("khoa.tran", AccountService.username("  Khoa.Tran "));
        assertEquals("gamer_2026", AccountService.username("@gamer_2026"));
        assertEquals("abc", AccountService.username("abc"));
    }

    @Test
    void rejectsMalformedUsernames() {
        for (String value : List.of("ab", "a".repeat(31), ".khoa", "khoa.", "kh oa", "khoa@mail", "trần",
                "12345678", "khoa..tran", "khoa__tran", "khoa._tran", "")) {
            ResponseStatusException error = assertThrows(ResponseStatusException.class,
                    () -> AccountService.username(value), value);
            assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        }
    }

    @Test
    void keepsStoreNamesForTheStore() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> AccountService.username("Admin"));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }
}
