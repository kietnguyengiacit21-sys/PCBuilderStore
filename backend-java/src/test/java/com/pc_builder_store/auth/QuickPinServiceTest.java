package com.pc_builder_store.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class QuickPinServiceTest {

    private static final String PIN = "40718263";

    @Mock
    private JdbcTemplate jdbc;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private QuickPinService service;

    @BeforeEach
    void setUp() {
        service = new QuickPinService(jdbc, encoder);
    }

    @Test
    void acceptsEightDigitPinsThatAreNotObvious() {
        assertEquals(PIN, QuickPinService.validPin(" 40718263 "));
        assertFalse(QuickPinService.isObvious("19982704"));
    }

    @Test
    void rejectsWrongLengthLettersAndObviousPatterns() {
        for (String pin : List.of("1234567", "123456789", "4071826a", "")) {
            ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> QuickPinService.validPin(pin));
            assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        }
        for (String pin : List.of("12345678", "87654321", "01234567", "11111111", "12121212", "12341234")) {
            assertTrue(QuickPinService.isObvious(pin), pin);
            assertThrows(ResponseStatusException.class, () -> QuickPinService.validPin(pin));
        }
    }

    @Test
    void signsInACustomerWithTheRightPin() {
        when(jdbc.queryForList(anyString(), eq("khoa.tran"))).thenReturn(List.of(row("CUSTOMER", "ACTIVE")));

        AuthUserPrincipal user = service.authenticate(" @Khoa.Tran ", PIN);

        assertEquals("21", user.userId());
        assertEquals("CUSTOMER", user.roleCode());
    }

    @Test
    void refusesWrongPinsStaffAccountsAndUnknownNames() {
        when(jdbc.queryForList(anyString(), eq("khoa.tran"))).thenReturn(List.of(row("CUSTOMER", "ACTIVE")));
        assertNull(service.authenticate("khoa.tran", "40718264"));

        when(jdbc.queryForList(anyString(), eq("sales.an"))).thenReturn(List.of(row("SALES", "ACTIVE")));
        assertNull(service.authenticate("sales.an", PIN));

        when(jdbc.queryForList(anyString(), eq("nobody"))).thenReturn(List.of());
        assertNull(service.authenticate("nobody", PIN));
    }

    @Test
    void malformedInputNeverReachesTheDatabase() {
        assertNull(service.authenticate("khoa", "1234"));
        assertNull(service.authenticate("", PIN));
        assertNull(service.authenticate("khoa", null));
        verifyNoInteractions(jdbc);
    }

    @Test
    void revealsALockedAccountOnlyAfterTheRightPin() {
        when(jdbc.queryForList(anyString(), eq("khoa.tran"))).thenReturn(List.of(row("CUSTOMER", "LOCKED")));

        assertNull(service.authenticate("khoa.tran", "40718264"));
        assertThrows(DisabledException.class, () -> service.authenticate("khoa.tran", PIN));
    }

    @Test
    void onlyCustomersCanTurnQuickLoginOn() {
        AuthUserPrincipal sales = new AuthUserPrincipal("16", "Sales", "sales@example.test", "", "SALES", null, "ACTIVE");

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.setPin(sales, "password1", PIN));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verifyNoInteractions(jdbc);
    }

    private Map<String, Object> row(String role, String status) {
        Map<String, Object> row = new HashMap<>();
        row.put("userId", "21");
        row.put("fullName", "Khoa Tran");
        row.put("email", "khoa@example.test");
        row.put("passwordHash", "x");
        row.put("roleCode", role);
        row.put("customerSegment", "IT");
        row.put("accountStatus", status);
        row.put("pinHash", encoder.encode(PIN));
        return row;
    }
}
