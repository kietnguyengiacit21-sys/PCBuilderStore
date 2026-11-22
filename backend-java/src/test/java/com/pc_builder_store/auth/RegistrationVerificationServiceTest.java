package com.pc_builder_store.auth;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.pc_builder_store.auth.AccountDtos.VerificationSent;
import com.pc_builder_store.common.MailDelivery;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class RegistrationVerificationServiceTest {

    private static final String EMAIL = "new@example.test";
    private static final String CODE = "482913";

    @Mock
    private JdbcTemplate jdbc;
    @Mock
    private MailDelivery mail;

    private RegistrationVerificationService service(boolean exposeCode) {
        return new RegistrationVerificationService(jdbc, mail, exposeCode);
    }

    @Test
    void codesAreSixDigits() {
        for (int index = 0; index < 50; index++) {
            assertTrue(RegistrationVerificationService.newCode().matches("\\d{6}"));
        }
    }

    @Test
    void consumesTheRightCode() {
        latestCode(0, true);
        when(jdbc.update(contains("SET \"used_at\""), eq(7L), eq(RegistrationVerificationService.hash(EMAIL, CODE)), eq(5)))
                .thenReturn(1);

        assertDoesNotThrow(() -> service(false).consume(EMAIL, " 482 913 "));
    }

    @Test
    void countsAWrongGuessAndSaysHowManyAreLeft() {
        latestCode(0, true);
        when(jdbc.update(contains("SET \"used_at\""), eq(7L), anyString(), eq(5))).thenReturn(0);
        when(jdbc.queryForObject(contains("\"attempts\" + 1"), eq(Integer.class), eq(7L))).thenReturn(1);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service(false).consume(EMAIL, "000000"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        assertTrue(error.getReason().contains("còn 4 lần"), error.getReason());
    }

    @Test
    void refusesExpiredOrExhaustedCodesWithoutCheckingThem() {
        latestCode(0, false);
        ResponseStatusException expired = assertThrows(ResponseStatusException.class,
                () -> service(false).consume(EMAIL, CODE));
        assertTrue(expired.getReason().contains("hết hạn"));

        latestCode(5, true);
        ResponseStatusException exhausted = assertThrows(ResponseStatusException.class,
                () -> service(false).consume(EMAIL, CODE));
        assertTrue(exhausted.getReason().contains("sai quá nhiều lần"));
        verify(jdbc, never()).update(contains("SET \"used_at\""), eq(7L), anyString(), eq(5));
    }

    @Test
    void rejectsCodesThatAreNotSixDigits() {
        assertThrows(ResponseStatusException.class, () -> service(false).consume(EMAIL, "12345"));
        assertThrows(ResponseStatusException.class, () -> service(false).consume(EMAIL, null));
        verifyNoInteractions(jdbc);
    }

    @Test
    void waitsBeforeSendingAnotherCode() {
        when(jdbc.queryForObject(contains("MAX(\"created_at\")"), eq(Long.class), eq(EMAIL))).thenReturn(20L);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service(false).send(EMAIL, "Khoa"));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatusCode());
        assertTrue(error.getReason().contains("40 giây"), error.getReason());
        verifyNoInteractions(mail);
    }

    @Test
    void showsTheCodeOnScreenOnlyForLocalSetupsWithoutMail() {
        when(jdbc.queryForObject(contains("MAX(\"created_at\")"), eq(Long.class), eq(EMAIL))).thenReturn(null);
        when(mail.isConfigured()).thenReturn(false);

        VerificationSent local = service(true).send(EMAIL, "Khoa");
        assertTrue(local.developmentCode().matches("\\d{6}"));
        assertEquals(600, local.expiresInSeconds());

        VerificationSent hidden = service(false).send(EMAIL, "Khoa");
        assertNull(hidden.developmentCode());
    }

    private void latestCode(int attempts, boolean fresh) {
        when(jdbc.queryForList(contains("FROM \"email_verification_codes\""), eq(EMAIL)))
                .thenReturn(List.of(Map.of("code_id", 7L, "attempts", attempts, "fresh", fresh)));
    }
}
