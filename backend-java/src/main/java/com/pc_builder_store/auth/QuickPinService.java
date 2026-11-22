package com.pc_builder_store.auth;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Customer quick login: username + an 8-digit PIN the customer chose. Only customer accounts can
 * use it (staff always sign in with their password). The PIN is stored as a BCrypt hash; guessing
 * is limited by {@link LoginAttemptLimiter} (5 wrong PINs per username per 15 minutes).
 */
@Service
public class QuickPinService {

    static final int PIN_LENGTH = 8;

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    /** Compared against when the username is unknown, so both cases take the same time. */
    private final String dummyHash;

    public QuickPinService(JdbcTemplate jdbc, PasswordEncoder passwordEncoder) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.dummyHash = passwordEncoder.encode("00000000-not-a-real-pin");
    }

    /**
     * Returns the customer when the username and PIN match, or null otherwise. A locked account is
     * only reported (DisabledException) after the correct PIN, like the password login.
     */
    public AuthUserPrincipal authenticate(String username, String pin) {
        String normalized = username == null ? "" : username.trim().toLowerCase(java.util.Locale.ROOT);
        if (normalized.startsWith("@")) normalized = normalized.substring(1);
        if (normalized.isEmpty() || normalized.length() > 30 || pin == null || !pin.matches("\\d{" + PIN_LENGTH + "}")) {
            return null;
        }
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT u."user_id"::text AS "userId", u."full_name" AS "fullName", u."email",
                       u."password_hash" AS "passwordHash", r."role_code" AS "roleCode",
                       u."customer_segment" AS "customerSegment", u."account_status" AS "accountStatus",
                       u."quick_pin_hash" AS "pinHash"
                FROM "users" u JOIN "roles" r ON r."role_id" = u."role_id"
                WHERE u."username" = ?
                """, normalized);
        Map<String, Object> row = rows.isEmpty() ? Map.of() : rows.getFirst();
        String pinHash = (String) row.get("pinHash");
        boolean usable = pinHash != null && "CUSTOMER".equals(row.get("roleCode"));
        boolean matches = passwordEncoder.matches(pin, usable ? pinHash : dummyHash);
        if (!usable || !matches) return null;
        AuthUserPrincipal user = new AuthUserPrincipal(
                (String) row.get("userId"),
                (String) row.get("fullName"),
                (String) row.get("email"),
                (String) row.get("passwordHash"),
                (String) row.get("roleCode"),
                (String) row.get("customerSegment"),
                (String) row.get("accountStatus"));
        if (!user.isEnabled()) throw new DisabledException("Account is locked.");
        return user;
    }

    /** Turns quick login on (or changes the PIN). Needs the current password and a username. */
    @Transactional
    public void setPin(AuthUserPrincipal user, String currentPassword, String pin) {
        requireCustomer(user);
        String checkedPin = validPin(pin);
        if (currentPassword == null || currentPassword.isEmpty()) {
            throw badRequest("Vui lòng nhập mật khẩu hiện tại để xác nhận.");
        }
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT "password_hash", "username", "quick_pin_hash" FROM "users" WHERE "user_id" = ? FOR UPDATE
                """, id(user));
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản.");
        Map<String, Object> row = rows.getFirst();
        if (row.get("username") == null) {
            throw badRequest("Hãy đặt tên đăng nhập trước, vì đăng nhập nhanh dùng tên đăng nhập + mã PIN.");
        }
        if (!passwordEncoder.matches(currentPassword, (String) row.get("password_hash"))) {
            throw badRequest("Mật khẩu hiện tại không đúng.");
        }
        boolean changing = row.get("quick_pin_hash") != null;
        jdbc.update("""
                UPDATE "users" SET "quick_pin_hash" = ?, "quick_pin_updated_at" = CURRENT_TIMESTAMP,
                       "updated_at" = CURRENT_TIMESTAMP
                WHERE "user_id" = ?
                """, passwordEncoder.encode(checkedPin), id(user));
        event(user, "QUICK_PIN_SET", changing ? "Đổi mã PIN đăng nhập nhanh" : "Bật đăng nhập nhanh bằng mã PIN");
    }

    @Transactional
    public void removePin(AuthUserPrincipal user) {
        requireCustomer(user);
        int updated = jdbc.update("""
                UPDATE "users" SET "quick_pin_hash" = NULL, "quick_pin_updated_at" = NULL, "updated_at" = CURRENT_TIMESTAMP
                WHERE "user_id" = ? AND "quick_pin_hash" IS NOT NULL
                """, id(user));
        if (updated == 1) event(user, "QUICK_PIN_REMOVED", "Tắt đăng nhập nhanh bằng mã PIN");
    }

    /** Exactly 8 digits and not an obvious pattern such as 12345678, 11111111 or 12121212. */
    static String validPin(String pin) {
        String value = pin == null ? "" : pin.trim();
        if (!value.matches("\\d{" + PIN_LENGTH + "}")) {
            throw badRequest("Mã PIN phải gồm đúng " + PIN_LENGTH + " chữ số.");
        }
        if (isObvious(value)) {
            throw badRequest("Mã PIN quá dễ đoán (số lặp lại hoặc dãy liên tiếp). Hãy chọn mã khác.");
        }
        return value;
    }

    static boolean isObvious(String pin) {
        boolean ascending = true;
        boolean descending = true;
        for (int index = 1; index < pin.length(); index++) {
            int step = pin.charAt(index) - pin.charAt(index - 1);
            if (step != 1) ascending = false;
            if (step != -1) descending = false;
        }
        if (ascending || descending) return true;
        // Repeats of a 1, 2 or 4 digit block: 11111111, 12121212, 12341234.
        for (int block : new int[] {1, 2, 4}) {
            if (pin.equals(pin.substring(0, block).repeat(pin.length() / block))) return true;
        }
        return false;
    }

    private void event(AuthUserPrincipal user, String type, String note) {
        jdbc.update("""
                INSERT INTO "user_account_events" ("target_user_id", "event_type", "note", "actor_user_id", "actor_email")
                VALUES (?, ?, ?, ?, ?)
                """, id(user), type, note, id(user), user.email());
    }

    private static void requireCustomer(AuthUserPrincipal user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập để tiếp tục.");
        if (!"CUSTOMER".equals(user.roleCode())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Đăng nhập nhanh bằng mã PIN chỉ dành cho tài khoản khách hàng.");
        }
    }

    private static BigDecimal id(AuthUserPrincipal user) {
        return new BigDecimal(user.userId());
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
