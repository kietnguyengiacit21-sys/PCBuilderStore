package com.pc_builder_store.cart;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class GuestCartTokenServiceTest {

    @Test
    void createsOpaqueHighEntropyTokensAndStoresOnlyTheirDigest() {
        GuestCartTokenService tokens = new GuestCartTokenService(false);
        String first = tokens.createToken();
        String second = tokens.createToken();

        assertTrue(tokens.isValid(first));
        assertNotEquals(first, tokens.hash(first));
        assertNotEquals(tokens.hash(first), tokens.hash(second));
    }

    @Test
    void readsOnlyWellFormedGuestCartCookies() {
        GuestCartTokenService tokens = new GuestCartTokenService(false);
        String token = tokens.createToken();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(GuestCartTokenService.COOKIE_NAME, token));

        assertEquals(token, tokens.tokenFrom(request));
        request.setCookies(new Cookie(GuestCartTokenService.COOKIE_NAME, "browser-selected"));
        assertFalse(tokens.isValid(tokens.tokenFrom(request)));
    }

    @Test
    void guestCookieIsHttpOnlySameSiteAndScopedToTheWholeStore() {
        GuestCartTokenService tokens = new GuestCartTokenService(true);

        String cookie = tokens.cookie(tokens.createToken()).toString();

        assertTrue(cookie.contains("HttpOnly"));
        assertTrue(cookie.contains("Secure"));
        assertTrue(cookie.contains("SameSite=Lax"));
        assertTrue(cookie.contains("Path=/"));
    }
}
