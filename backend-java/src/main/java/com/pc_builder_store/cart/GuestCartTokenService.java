package com.pc_builder_store.cart;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class GuestCartTokenService {

    public static final String COOKIE_NAME = "PCBS_GUEST_CART";
    private static final SecureRandom RANDOM = new SecureRandom();
    private final boolean secureCookie;

    public GuestCartTokenService(
            @Value("${server.servlet.session.cookie.secure:false}") boolean secureCookie) {
        this.secureCookie = secureCookie;
    }

    public String tokenFrom(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName()) && isValid(cookie.getValue())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    public String createToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public boolean isValid(String token) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) return false;
        try {
            return Base64.getUrlDecoder().decode(token).length == 32;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    public String hash(String token) {
        if (!isValid(token)) {
            throw new IllegalArgumentException("Invalid guest cart token.");
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required for guest cart tokens.", exception);
        }
    }

    public ResponseCookie cookie(String token) {
        return ResponseCookie.from(COOKIE_NAME, token)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/")
                .maxAge(java.time.Duration.ofDays(30))
                .build();
    }

    public ResponseCookie clearCookie() {
        return ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/")
                .maxAge(java.time.Duration.ZERO)
                .build();
    }
}
