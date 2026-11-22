package com.pc_builder_store.auth;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import com.pc_builder_store.common.MailDelivery;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Self-service password reset by email. The emailed token is single use, expires after 30 minutes
 * and only its SHA-256 hash is stored. Without SMTP settings (spring.mail.host) the link is written
 * to the server log instead, which is meant for local development only.
 */
@Service
public class PasswordResetService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int VALID_MINUTES = 30;

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final MailDelivery mail;
    private final AccountStateCache states;
    private final String publicBaseUrl;

    public PasswordResetService(
            JdbcTemplate jdbc,
            PasswordEncoder passwordEncoder,
            MailDelivery mail,
            AccountStateCache states,
            @Value("${app.public-base-url:http://localhost:5173}") String publicBaseUrl) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.mail = mail;
        this.states = states;
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
    }

    /** Always succeeds from the caller's point of view so the endpoint cannot reveal which emails exist. */
    @Transactional
    public void request(String email) {
        String normalized = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty() || normalized.length() > 254) return;
        List<Map<String, Object>> users = jdbc.queryForList("""
                SELECT "user_id", "full_name" FROM "users" WHERE "email" = ? AND "account_status" = 'ACTIVE'
                """, normalized);
        if (users.isEmpty()) return;
        BigDecimal userId = (BigDecimal) users.getFirst().get("user_id");
        String fullName = String.valueOf(users.getFirst().get("full_name"));

        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        jdbc.update("UPDATE \"password_reset_tokens\" SET \"used_at\" = CURRENT_TIMESTAMP WHERE \"user_id\" = ? AND \"used_at\" IS NULL", userId);
        jdbc.update("""
                INSERT INTO "password_reset_tokens" ("user_id", "token_hash", "expires_at")
                VALUES (?, ?, CURRENT_TIMESTAMP + make_interval(mins => ?))
                """, userId, sha256(token), VALID_MINUTES);
        String link = publicBaseUrl + "/customer/reset-password?token=" + token;
        send(normalized, fullName, link);
    }

    @Transactional
    public void confirm(String token, String newPassword) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{20,100}")) throw invalidLink();
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT t."token_id", t."user_id", u."account_status"
                FROM "password_reset_tokens" t JOIN "users" u ON u."user_id" = t."user_id"
                WHERE t."token_hash" = ? AND t."used_at" IS NULL AND t."expires_at" > CURRENT_TIMESTAMP
                FOR UPDATE OF t
                """, sha256(token));
        if (rows.isEmpty() || !"ACTIVE".equals(rows.getFirst().get("account_status"))) throw invalidLink();
        String password = AccountService.newPassword(newPassword);
        BigDecimal userId = (BigDecimal) rows.getFirst().get("user_id");
        // Whoever triggered the reset may not be the person who set the quick-login PIN.
        jdbc.update("""
                UPDATE "users" SET "password_hash" = ?, "must_change_password" = FALSE,
                       "quick_pin_hash" = NULL, "quick_pin_updated_at" = NULL, "updated_at" = CURRENT_TIMESTAMP
                WHERE "user_id" = ?
                """, passwordEncoder.encode(password), userId);
        jdbc.update("UPDATE \"password_reset_tokens\" SET \"used_at\" = CURRENT_TIMESTAMP WHERE \"user_id\" = ? AND \"used_at\" IS NULL", userId);
        jdbc.update("""
                INSERT INTO "user_account_events" ("target_user_id", "event_type", "note") VALUES (?, 'PASSWORD_RESET_BY_EMAIL', ?)
                """, userId, "Đặt lại mật khẩu qua link email");
        states.evict(userId.toPlainString());
    }

    private void send(String email, String fullName, String link) {
        mail.send(email, "Đặt lại mật khẩu PC Builder Store",
                "Xin chào " + fullName + ",\n\n"
                        + "Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản PC Builder Store.\n"
                        + "Mở link sau trong " + VALID_MINUTES + " phút để đặt mật khẩu mới:\n\n" + link + "\n\n"
                        + "Nếu không phải bạn yêu cầu, hãy bỏ qua email này; mật khẩu hiện tại vẫn giữ nguyên.\n",
                "Password reset link: " + link);
    }

    private static ResponseStatusException invalidLink() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu link mới.");
    }

    static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
